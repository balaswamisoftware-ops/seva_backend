import { Schema, model, Types } from 'mongoose';

export const PRINTER_TYPES = ['NETWORK', 'AGENT_USB'] as const;
export const PRINTER_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

const printerSchema = new Schema(
  {
    name:       { type: String, required: true, trim: true, unique: true, index: true },
    // NETWORK   -> backend opens TCP socket to ipAddress:port, writes ESC/POS.
    // AGENT_USB -> backend POSTs the receipt to a local print-agent URL which
    //              forwards to a USB/serial printer attached to the operator's PC.
    type:       { type: String, enum: PRINTER_TYPES, required: true, index: true },
    // NETWORK fields
    ipAddress:  { type: String },
    port:       { type: Number, default: 9100 },
    // AGENT_USB fields
    agentUrl:   { type: String },     // e.g. http://localhost:9100
    agentKey:   { type: String },     // optional shared secret
    // Shared
    paperWidth: { type: Number, enum: [58, 80], default: 58 },
    isDefault:  { type: Boolean, default: false, index: true },
    status:     { type: String, enum: PRINTER_STATUSES, default: 'ACTIVE', index: true },
    location:   { type: String },     // free-text (e.g. "Counter 1")
    notes:      { type: String },
    createdBy:  { type: Types.ObjectId, ref: 'Employee' },
    updatedBy:  { type: Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true },
);

export const Printer = model('Printer', printerSchema);
