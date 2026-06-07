import { Schema, model, Types } from 'mongoose';
import { PAYMENT_MODES } from '../../utils/constants';

/**
 * Donations are open-amount contributions, separate from Seva tickets.
 * - No inventory / fixed price
 * - Tracks 80G tax certificate fields (PAN, address) for Indian tax exemption
 * - Optional event linkage (general donations have no event)
 * - Anonymous donations supported (devoteeName = "Anonymous")
 */
const donationSchema = new Schema(
  {
    donationId:       { type: String, required: true, unique: true, index: true }, // DON00001
    receiptNumber:    { type: String, required: true, unique: true, index: true }, // DRCP-2026-0001
    bookingNumber:    { type: String, required: true, unique: true, index: true },

    // Optional linkage
    eventId:          { type: Types.ObjectId, ref: 'Event', index: true },
    eventName:        { type: String },
    purpose:          { type: String, default: 'General Donation' }, // "Temple Construction", "Annadanam", etc.

    // Donor
    devoteeName:      { type: String, required: true, trim: true },
    mobileNumber:     { type: String },
    email:            { type: String, lowercase: true, trim: true },
    address:          { type: String },  // required for 80G
    panNumber:        { type: String, uppercase: true, trim: true },  // required for 80G > ₹2000
    isAnonymous:      { type: Boolean, default: false },

    // Money
    amount:           { type: Number, required: true, min: 1 },
    paymentMode:      { type: String, enum: PAYMENT_MODES, default: 'CASH' },
    transactionRef:   { type: String }, // UPI ref, cheque no, etc.

    // 80G tax certificate
    is80GEligible:    { type: Boolean, default: true },
    cert80GIssued:    { type: Boolean, default: false },
    cert80GNumber:    { type: String },  // CERT-2026-0001 if issued

    // Audit
    soldByEmployeeId: { type: Types.ObjectId, ref: 'Employee', required: true, index: true },
    soldByName:       { type: String, required: true },
    soldAt:           { type: Date, default: Date.now, index: true },
    printed:          { type: Boolean, default: false },
    printedAt:        { type: Date },
    notes:            { type: String },

    // Offline sync support
    clientId:         { type: String, unique: true, sparse: true }, // UUID from frontend offline queue
    syncedFromOffline:{ type: Boolean, default: false },
  },
  { timestamps: true },
);

donationSchema.index({ soldAt: -1 });
donationSchema.index({ panNumber: 1 });
donationSchema.index({ mobileNumber: 1 });

export const Donation = model('Donation', donationSchema);
