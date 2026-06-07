import { Schema, model, Types } from 'mongoose';
import { SEVA_STATUSES } from '../../utils/constants';

const sevaSchema = new Schema(
  {
    sevaId:           { type: String, required: true, unique: true, index: true },
    // Sevas are a flat master list and can be attached to many events at
    // once. Inventory (availableTickets/maxTickets) is shared across all
    // attached events — for hard per-event capacity, create separate sevas.
    eventIds:         { type: [Types.ObjectId], ref: 'Event', default: [], index: true },
    sevaName:         { type: String, required: true, trim: true, index: 'text' },
    description:      { type: String },
    price:            { type: Number, required: true, min: 0 },
    maxTickets:       { type: Number, default: 0 },     // 0 = unlimited
    availableTickets: { type: Number, default: 0 },
    sevaDate:         { type: Date },
    sevaTime:         { type: String },                 // "18:30"
    status:           { type: String, enum: SEVA_STATUSES, default: 'ACTIVE', index: true },
    createdBy:        { type: Types.ObjectId, ref: 'Employee' },
    updatedBy:        { type: Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true },
);

export const Seva = model('Seva', sevaSchema);
