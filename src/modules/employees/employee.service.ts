import bcrypt from 'bcryptjs';
import { Employee } from './employee.model';
import { nextEmployeeCode } from '../../utils/counters';
import { Conflict, NotFound } from '../../utils/errors';
import { Role, Status } from '../../utils/constants';
import { pinLookupHash } from '../../utils/pin';

interface CreateInput {
  firstName: string; lastName: string; mobileNumber: string; email?: string;
  pin: string; role: Role; createdBy?: string;
}
export async function createEmployee(input: CreateInput) {
  const exists = await Employee.findOne({
    $or: [{ mobileNumber: input.mobileNumber }, ...(input.email ? [{ email: input.email }] : [])],
  });
  if (exists) throw Conflict('Mobile number or email already exists');

  const pinLookup = pinLookupHash(input.pin);
  if (await Employee.findOne({ pinLookup })) throw Conflict('PIN already in use — choose a different PIN');

  const employeeId = await nextEmployeeCode();
  const pinHash = await bcrypt.hash(input.pin, 10);
  const employee = await Employee.create({
    employeeId,
    firstName: input.firstName,
    lastName: input.lastName,
    mobileNumber: input.mobileNumber,
    email: input.email,
    pinHash,
    pinLookup,
    role: input.role,
    createdBy: input.createdBy,
  });
  return employee.toJSON();
}

export async function updateEmployee(id: string, input: any, updatedBy?: string) {
  const employee = await Employee.findById(id);
  if (!employee) throw NotFound('Employee not found');
  Object.assign(employee, input, { updatedBy });
  await employee.save();
  return employee.toJSON();
}

export async function resetPin(id: string, newPin: string, updatedBy?: string) {
  const employee = await Employee.findById(id);
  if (!employee) throw NotFound('Employee not found');

  const pinLookup = pinLookupHash(newPin);
  const clash = await Employee.findOne({ pinLookup, _id: { $ne: employee._id } });
  if (clash) throw Conflict('PIN already in use — choose a different PIN');

  employee.pinHash = await bcrypt.hash(newPin, 10);
  employee.pinLookup = pinLookup;
  employee.updatedBy = updatedBy as any;
  await employee.save();
  return { success: true };
}

export async function getEmployee(id: string) {
  const employee = await Employee.findById(id);
  if (!employee) throw NotFound('Employee not found');
  return employee.toJSON();
}

interface ListQuery { page: number; limit: number; search?: string; role?: Role; status?: Status; }
export async function listEmployees(q: ListQuery) {
  const filter: any = {};
  if (q.role)   filter.role = q.role;
  if (q.status) filter.status = q.status;
  if (q.search) {
    const r = new RegExp(q.search, 'i');
    filter.$or = [
      { employeeId: r }, { firstName: r }, { lastName: r },
      { mobileNumber: r }, { email: r },
    ];
  }
  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    Employee.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit),
    Employee.countDocuments(filter),
  ]);
  return { items: items.map((x) => x.toJSON()), total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) };
}
