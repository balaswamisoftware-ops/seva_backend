import { Schema, model, Types } from 'mongoose';
import { PAYMENT_MODES } from '../../utils/constants';

const ticketSchema = new Schema(
  {
    ticketId:         { type: String, required: true, unique: true, index: true },
    bookingNumber:    { type: String, required: true, unique: true, index: true },
    receiptNumber:    { type: String, required: true, unique: true, index: true },
    eventId:          { type: Types.ObjectId, ref: 'Event', required: true, index: true },
    sevaId:           { type: Types.ObjectId, ref: 'Seva', required: true, index: true },
    // Denormalised snapshots for fast reporting & immutable receipt history
    eventName:        { type: String, required: true },
    sevaName:         { type: String, required: true },
    devoteeName:      { type: String, required: true, trim: true },
    mobileNumber:     { type: String },
    quantity:         { type: Number, required: true, min: 1 },
    unitPrice:        { type: Number, required: true, min: 0 },
    totalAmount:      { type: Number, required: true, min: 0 },
    paymentMode:      { type: String, enum: PAYMENT_MODES, default: 'CASH' },
    soldByEmployeeId: { type: Types.ObjectId, ref: 'Employee', required: true, index: true },
    soldByName:       { type: String, required: true },
    soldAt:           { type: Date, default: Date.now, index: true },
    printed:          { type: Boolean, default: false },
    printedAt:        { type: Date },
    // Offline sync support
    clientId:         { type: String, unique: true, sparse: true },
    syncedFromOffline:{ type: Boolean, default: false },
  },
  { timestamps: true },
);

ticketSchema.index({ soldAt: -1 });
ticketSchema.index({ eventId: 1, sevaId: 1 });

export const Ticket = model('Ticket', ticketSchema);
