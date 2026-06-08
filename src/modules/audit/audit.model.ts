import { Schema, model, Types } from 'mongoose';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../../utils/constants';

/**
 * Rich audit trail with before/after snapshots — the source of truth for the
 * Super-Admin audit screen and rollback. Distinct from ActivityLog, which is a
 * lightweight login/print activity feed with no state capture.
 *
 *  - before: full entity snapshot prior to the action (null for CREATE)
 *  - after:  full entity snapshot after the action  (null for DELETE)
 *  - rolledBack / rollbackOf: a ROLLBACK entry points back at the entry it undid,
 *    and the original entry is flagged rolledBack so it can't be undone twice.
 */
const auditLogSchema = new Schema(
  {
    entityType:   { type: String, enum: AUDIT_ENTITIES, required: true, index: true },
    entityId:     { type: String, required: true, index: true },
    entityCode:   { type: String }, // human-friendly code (e.g. DEV0001) for display
    action:       { type: String, enum: AUDIT_ACTIONS, required: true, index: true },
    before:       { type: Schema.Types.Mixed },
    after:        { type: Schema.Types.Mixed },
    performedBy:  { type: Types.ObjectId, ref: 'Employee', index: true },
    rolledBack:   { type: Boolean, default: false, index: true },
    rollbackOf:   { type: Types.ObjectId, ref: 'AuditLog' },
    ipAddress:    { type: String },
    userAgent:    { type: String },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export const AuditLog = model('AuditLog', auditLogSchema);
