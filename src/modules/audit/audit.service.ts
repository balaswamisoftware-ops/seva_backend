import { Request } from 'express';
import { Model } from 'mongoose';
import { AuditLog } from './audit.model';
import { Devotee } from '../devotees/devotee.model';
import { Event } from '../events/event.model';
import { EventParticipation } from '../participations/participation.model';
import { AuditAction, AuditEntity } from '../../utils/constants';
import { BadRequest, Conflict, NotFound } from '../../utils/errors';

// Map an audited entity type to its Mongoose model so rollback can act on it.
const MODELS: Record<AuditEntity, Model<any>> = {
  Devotee: Devotee as unknown as Model<any>,
  Event: Event as unknown as Model<any>,
  EventParticipation: EventParticipation as unknown as Model<any>,
};

// Fields we never restore verbatim — Mongo manages them.
function cleanSnapshot(snap: any) {
  if (!snap) return snap;
  const { __v, createdAt, updatedAt, ...rest } = snap;
  return rest;
}

interface RecordInput {
  action: AuditAction;
  entityType: AuditEntity;
  entityId: string;
  entityCode?: string;
  before?: any;
  after?: any;
  performedBy?: string;
  rollbackOf?: string;
}

/**
 * Write an audit entry. Best-effort: a logging failure must never break the
 * main flow (mirrors the existing logActivity contract). Pass `req` to capture
 * the actor + request metadata.
 */
export async function recordAudit(req: Request | undefined, input: RecordInput) {
  try {
    return await AuditLog.create({
      entityType: input.entityType,
      entityId: input.entityId,
      entityCode: input.entityCode,
      action: input.action,
      before: input.before ?? null,
      after: input.after ?? null,
      performedBy: input.performedBy ?? req?.user?.id,
      rollbackOf: input.rollbackOf,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
    });
  } catch (e) {
    console.warn('[audit] failed to record:', (e as Error).message);
    return null;
  }
}

interface ListQuery {
  page: number; limit: number;
  entityType?: AuditEntity; action?: AuditAction; entityId?: string;
}
export async function listAudit(q: ListQuery) {
  const filter: any = {};
  if (q.entityType) filter.entityType = q.entityType;
  if (q.action)     filter.action = q.action;
  if (q.entityId)   filter.entityId = q.entityId;
  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('performedBy', 'employeeId firstName lastName role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(q.limit),
    AuditLog.countDocuments(filter),
  ]);
  return { items, total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) };
}

export interface RollbackResult { message: string; entityType: AuditEntity; entityId: string; action: AuditAction; }

/**
 * Roll a single audit entry back to its previous state, recording the rollback
 * itself as a new audit entry. Throws AppError with a human-friendly message
 * when the rollback is not possible.
 */
export async function rollback(logId: string, req: Request): Promise<RollbackResult> {
  const entry = await AuditLog.findById(logId);
  if (!entry) throw NotFound('Audit entry not found');

  if (entry.action === 'ROLLBACK')
    throw BadRequest('This entry is itself a rollback and cannot be rolled back. Roll back the original action instead.');
  if (entry.rolledBack)
    throw BadRequest('This action has already been rolled back.');

  const entityType = entry.entityType as AuditEntity;
  const ModelRef = MODELS[entityType];
  if (!ModelRef) throw BadRequest(`Rollback is not supported for ${entityType}.`);

  const before = cleanSnapshot(entry.before);
  const after = cleanSnapshot(entry.after);
  const performedBy = req.user?.id;

  let restoredState: any = null;
  let message = '';

  if (entry.action === 'CREATE') {
    // Undo a create => delete the entity (its prior state was "did not exist").
    const existing = await ModelRef.findById(entry.entityId);
    if (!existing)
      throw BadRequest('Cannot roll back: the record no longer exists (it may have been deleted already).');
    await ModelRef.findByIdAndDelete(entry.entityId);
    restoredState = null;
    message = `Rolled back creation of ${entityType} ${entry.entityCode ?? entry.entityId} — the record has been removed.`;
  } else if (entry.action === 'UPDATE') {
    if (!before)
      throw BadRequest('Cannot roll back: no previous state was recorded for this update.');
    const existing = await ModelRef.findById(entry.entityId);
    if (!existing)
      throw BadRequest('Cannot roll back: the record no longer exists.');
    try {
      const restored = await ModelRef.findByIdAndUpdate(
        entry.entityId,
        { $set: before },
        { new: true, runValidators: true, overwrite: false },
      );
      restoredState = restored?.toJSON?.() ?? restored;
    } catch (e: any) {
      if (e?.code === 11000) throw Conflict('Cannot roll back: restoring this state conflicts with another record (duplicate key).');
      throw e;
    }
    message = `Rolled back update to ${entityType} ${entry.entityCode ?? entry.entityId} — previous values restored.`;
  } else if (entry.action === 'DELETE') {
    if (!before)
      throw BadRequest('Cannot roll back: no snapshot of the deleted record was stored.');
    const existing = await ModelRef.findById(entry.entityId);
    if (existing)
      throw BadRequest('Cannot roll back: a record with this id already exists.');
    try {
      const recreated = await ModelRef.create({ _id: entry.entityId, ...before });
      restoredState = recreated.toJSON?.() ?? recreated;
    } catch (e: any) {
      if (e?.code === 11000) throw Conflict('Cannot roll back: a conflicting record (e.g. same phone number) already exists.');
      throw e;
    }
    message = `Rolled back deletion of ${entityType} ${entry.entityCode ?? entry.entityId} — the record has been restored.`;
  } else {
    throw BadRequest(`Rollback is not supported for action ${entry.action}.`);
  }

  // Flag the original so it can't be undone twice.
  entry.rolledBack = true;
  await entry.save();

  // The rollback is itself an audited action.
  await recordAudit(req, {
    action: 'ROLLBACK',
    entityType,
    entityId: entry.entityId,
    entityCode: entry.entityCode ?? undefined,
    before: after,          // state we moved away from = the action's "after"
    after: restoredState,   // state we restored to
    performedBy,
    rollbackOf: String(entry._id),
  });

  return { message, entityType, entityId: entry.entityId, action: entry.action as AuditAction };
}
