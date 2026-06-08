import { Request } from 'express';
import { ClientSession } from 'mongoose';
import { Devotee } from './devotee.model';
import { nextDevoteeCode } from '../../utils/counters';
import { Conflict, NotFound } from '../../utils/errors';
import { recordAudit } from '../audit/audit.service';

interface CreateInput {
  fullName: string; phoneNumber: string; gothram?: string; nakshatram?: string;
}

export async function createDevotee(input: CreateInput, req: Request) {
  const exists = await Devotee.findOne({ phoneNumber: input.phoneNumber });
  if (exists) throw Conflict(`A devotee with phone number ${input.phoneNumber} already exists (${exists.get('fullName')}).`);

  const devoteeId = await nextDevoteeCode();
  const devotee = await Devotee.create({ ...input, devoteeId, createdBy: req.user?.id });
  const json = devotee.toJSON();

  await recordAudit(req, {
    action: 'CREATE', entityType: 'Devotee',
    entityId: String(devotee._id), entityCode: devotee.devoteeId,
    before: null, after: json,
  });
  return json;
}

/**
 * Find a devotee by phone, or create one. Used by event participation so a
 * walk-up devotee is registered exactly once. Audited as a CREATE when new.
 * Safe under a session (transaction) when one is supplied.
 */
export async function findOrCreateByPhone(
  input: { phoneNumber: string; fullName?: string; gothram?: string; nakshatram?: string },
  req: Request,
  session?: ClientSession,
): Promise<{ devotee: any; created: boolean }> {
  const existing = await Devotee.findOne({ phoneNumber: input.phoneNumber }).session(session ?? null);
  if (existing) return { devotee: existing, created: false };

  const devoteeId = await nextDevoteeCode(session);
  const [devotee] = await Devotee.create(
    [{
      devoteeId,
      phoneNumber: input.phoneNumber,
      fullName: input.fullName?.trim() || 'Devotee',
      gothram: input.gothram,
      nakshatram: input.nakshatram,
      createdBy: req.user?.id,
    }],
    { session },
  );

  await recordAudit(req, {
    action: 'CREATE', entityType: 'Devotee',
    entityId: String(devotee._id), entityCode: devotee.devoteeId,
    before: null, after: devotee.toJSON(),
  });
  return { devotee, created: true };
}

export async function updateDevotee(id: string, input: any, req: Request) {
  const devotee = await Devotee.findById(id);
  if (!devotee) throw NotFound('Devotee not found');
  const before = devotee.toJSON();

  if (input.phoneNumber && input.phoneNumber !== devotee.phoneNumber) {
    const clash = await Devotee.findOne({ phoneNumber: input.phoneNumber, _id: { $ne: devotee._id } });
    if (clash) throw Conflict(`Phone number ${input.phoneNumber} is already used by ${clash.get('fullName')}.`);
  }

  // Empty strings clear optional fields.
  ['gothram', 'nakshatram'].forEach((k) => { if (input[k] === '') input[k] = undefined; });
  Object.assign(devotee, input, { updatedBy: req.user?.id });
  await devotee.save();
  const after = devotee.toJSON();

  await recordAudit(req, {
    action: 'UPDATE', entityType: 'Devotee',
    entityId: String(devotee._id), entityCode: devotee.devoteeId,
    before, after,
  });
  return after;
}

export async function deleteDevotee(id: string, req: Request) {
  const devotee = await Devotee.findById(id);
  if (!devotee) throw NotFound('Devotee not found');
  const before = devotee.toJSON();

  await devotee.deleteOne();

  await recordAudit(req, {
    action: 'DELETE', entityType: 'Devotee',
    entityId: String(devotee._id), entityCode: devotee.devoteeId,
    before, after: null,
  });
  return { success: true };
}

export async function getDevotee(id: string) {
  const devotee = await Devotee.findById(id);
  if (!devotee) throw NotFound('Devotee not found');
  return devotee.toJSON();
}

export async function getDevoteeByPhone(phoneNumber: string) {
  const devotee = await Devotee.findOne({ phoneNumber });
  return devotee ? devotee.toJSON() : null;
}

interface ListQuery { page: number; limit: number; search?: string; }
export async function listDevotees(q: ListQuery) {
  const filter: any = {};
  if (q.search) {
    const r = new RegExp(q.search, 'i');
    filter.$or = [{ devoteeId: r }, { fullName: r }, { phoneNumber: r }, { gothram: r }, { nakshatram: r }];
  }
  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    Devotee.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit),
    Devotee.countDocuments(filter),
  ]);
  return { items: items.map((x) => x.toJSON()), total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) };
}
