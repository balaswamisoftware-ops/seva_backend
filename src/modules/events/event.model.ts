import { Schema, model, Types } from 'mongoose';
import { EVENT_STATUSES } from '../../utils/constants';

const eventSchema = new Schema(
  {
    eventId:     { type: String, required: true, unique: true, index: true },
    eventName:   { type: String, required: true, trim: true, index: 'text' },
    description: { type: String },
    startDate:   { type: Date, required: true, index: true },
    endDate:     { type: Date, required: true },
    location:    { type: String },
    bannerImage: { type: String },
    status:      { type: String, enum: EVENT_STATUSES, default: 'UPCOMING', index: true },
    // When true, event participation requires a phone number and collects
    // devotee details (full name / gothram / nakshatram optional).
    collectDevoteeDetails: { type: Boolean, default: false },
    createdBy:   { type: Types.ObjectId, ref: 'Employee' },
    updatedBy:   { type: Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true },
);

eventSchema.index({ startDate: 1, endDate: 1 });

export const Event = model('Event', eventSchema);
