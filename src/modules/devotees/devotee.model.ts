import { Schema, model, InferSchemaType, Types } from 'mongoose';

const devoteeSchema = new Schema(
  {
    devoteeId:   { type: String, required: true, unique: true, index: true },
    fullName:    { type: String, required: true, trim: true, index: 'text' },
    // Unique across all devotees — the natural key used by event participation.
    phoneNumber: { type: String, required: true, unique: true, index: true, trim: true },
    gothram:     { type: String, trim: true },
    nakshatram:  { type: String, trim: true },
    createdBy:   { type: Types.ObjectId, ref: 'Employee' },
    updatedBy:   { type: Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true },
);

devoteeSchema.set('toJSON', {
  transform: (_doc, ret: any) => { delete ret.__v; return ret; },
});

export type DevoteeDoc = InferSchemaType<typeof devoteeSchema> & { _id: Types.ObjectId };
export const Devotee = model('Devotee', devoteeSchema);
