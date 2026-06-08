import { Schema, model, Types } from 'mongoose';
import { PAYMENT_MODES } from '../../utils/constants';

/**
 * A devotee taking part in an event. Deliberately NOT uniquely constrained on
 * (event, devotee) — the same devotee may participate in the same event many
 * times. Snapshots (eventName/devoteeName/sevaName) keep historic records
 * readable even if the source docs change.
 */
const participationSchema = new Schema(
  {
    participationId: { type: String, required: true, unique: true, index: true },
    eventId:     { type: Types.ObjectId, ref: 'Event', required: true, index: true },
    eventName:   { type: String, required: true },
    // Optional: only set when a phone number is captured (collection-enabled
    // events make this mandatory; collection-off events may be anonymous).
    devoteeId:   { type: Types.ObjectId, ref: 'Devotee', index: true },
    devoteeName: { type: String },
    phoneNumber: { type: String, index: true, trim: true },
    // Ticket fields
    sevaId:      { type: Types.ObjectId, ref: 'Seva' },
    sevaName:    { type: String },
    quantity:    { type: Number, default: 1, min: 1 },
    unitPrice:   { type: Number, min: 0 },
    totalAmount: { type: Number, min: 0 },
    paymentMode: { type: String, enum: PAYMENT_MODES, default: 'CASH' },
    notes:       { type: String },
    createdBy:   { type: Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true },
);

participationSchema.index({ eventId: 1, createdAt: -1 });
participationSchema.index({ devoteeId: 1, createdAt: -1 });

export const EventParticipation = model('EventParticipation', participationSchema);
