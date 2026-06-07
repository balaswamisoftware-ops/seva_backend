import { Schema, model, Types } from 'mongoose';

const refreshTokenSchema = new Schema(
  {
    tokenHash:  { type: String, required: true, unique: true, index: true },
    employeeId: { type: Types.ObjectId, ref: 'Employee', required: true, index: true },
    expiresAt:  { type: Date, required: true },
    revoked:    { type: Boolean, default: false },
  },
  { timestamps: true },
);

// TTL — auto-delete expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model('RefreshToken', refreshTokenSchema);
