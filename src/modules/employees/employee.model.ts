import { Schema, model, InferSchemaType, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, STATUSES } from '../../utils/constants';

const employeeSchema = new Schema(
  {
    employeeId:   { type: String, required: true, unique: true, index: true },
    firstName:    { type: String, required: true, trim: true },
    lastName:     { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, unique: true, index: true },
    email:        { type: String, lowercase: true, trim: true, sparse: true, unique: true },
    pinHash:      { type: String, required: true },
    pinLookup:    { type: String, required: true, unique: true, index: true },
    role:         { type: String, enum: ROLES, default: 'ADMIN', index: true },
    status:       { type: String, enum: STATUSES, default: 'ACTIVE', index: true },
    lastLoginAt:  { type: Date },
    createdBy:    { type: Types.ObjectId, ref: 'Employee' },
    updatedBy:    { type: Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true },
);

employeeSchema.methods.verifyPin = function (pin: string) {
  return bcrypt.compare(pin, this.pinHash);
};

employeeSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.pinHash;
    delete ret.pinLookup;
    delete ret.__v;
    return ret;
  },
});

export type EmployeeDoc = InferSchemaType<typeof employeeSchema> & { _id: Types.ObjectId; verifyPin(pin: string): Promise<boolean>; };
export const Employee = model('Employee', employeeSchema);
