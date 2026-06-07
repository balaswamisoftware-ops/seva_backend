import { Schema, model, Types } from 'mongoose';
import { STATUSES } from '../../utils/constants';

const donationPurposeSchema = new Schema(
  {
    purposeId:   { type: String, required: true, unique: true, index: true },
    purposeName: { type: String, required: true, trim: true, unique: true },
    status:      { type: String, enum: STATUSES, default: 'ACTIVE', index: true },
    createdBy:   { type: Types.ObjectId, ref: 'Employee' },
    updatedBy:   { type: Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true },
);

export const DonationPurpose = model('DonationPurpose', donationPurposeSchema);
