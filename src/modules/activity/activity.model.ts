import { Schema, model, Types } from 'mongoose';

const activityLogSchema = new Schema(
  {
    employeeId: { type: Types.ObjectId, ref: 'Employee', index: true },
    action:     { type: String, required: true, index: true },
    entityType: { type: String },
    entityId:   { type: String },
    metadata:   { type: Schema.Types.Mixed },
    ipAddress:  { type: String },
    userAgent:  { type: String },
  },
  { timestamps: true },
);

activityLogSchema.index({ createdAt: -1 });

export const ActivityLog = model('ActivityLog', activityLogSchema);
