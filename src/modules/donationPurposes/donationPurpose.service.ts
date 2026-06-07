import { DonationPurpose } from './donationPurpose.model';
import { nextDonationPurposeCode } from '../../utils/counters';
import { Conflict, NotFound } from '../../utils/errors';

export async function createPurpose(input: any, createdBy?: string) {
  const exists = await DonationPurpose.findOne({ purposeName: input.purposeName.trim() });
  if (exists) throw Conflict('A purpose with that name already exists');
  const purposeId = await nextDonationPurposeCode();
  const doc = await DonationPurpose.create({
    purposeId,
    purposeName: input.purposeName.trim(),
    status: input.status ?? 'ACTIVE',
    createdBy,
  });
  return doc.toJSON();
}

export async function updatePurpose(id: string, input: any, updatedBy?: string) {
  const doc = await DonationPurpose.findById(id);
  if (!doc) throw NotFound('Purpose not found');
  if (input.purposeName && input.purposeName.trim() !== doc.purposeName) {
    const clash = await DonationPurpose.findOne({ purposeName: input.purposeName.trim(), _id: { $ne: doc._id } });
    if (clash) throw Conflict('A purpose with that name already exists');
    doc.purposeName = input.purposeName.trim();
  }
  if (input.status) doc.status = input.status;
  doc.updatedBy = updatedBy as any;
  await doc.save();
  return doc.toJSON();
}

export async function toggleStatus(id: string, updatedBy?: string) {
  const doc = await DonationPurpose.findById(id);
  if (!doc) throw NotFound('Purpose not found');
  doc.status = doc.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  doc.updatedBy = updatedBy as any;
  await doc.save();
  return doc.toJSON();
}

export async function listPurposes(q: { page: number; limit: number; search?: string; status?: string }) {
  const filter: any = {};
  if (q.status) filter.status = q.status;
  if (q.search) {
    const r = new RegExp(q.search, 'i');
    filter.$or = [{ purposeId: r }, { purposeName: r }];
  }
  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    DonationPurpose.find(filter).sort({ purposeName: 1 }).skip(skip).limit(q.limit),
    DonationPurpose.countDocuments(filter),
  ]);
  return { items, total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) };
}

export async function listActive() {
  return DonationPurpose.find({ status: 'ACTIVE' }).sort({ purposeName: 1 });
}
