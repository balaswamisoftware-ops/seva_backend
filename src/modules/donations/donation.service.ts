import mongoose from 'mongoose';
import { Donation } from './donation.model';
import { Event } from '../events/event.model';
import { Employee } from '../employees/employee.model';
import { BadRequest, NotFound, Conflict } from '../../utils/errors';
import { nextSequence } from '../../utils/counters';
import { PaymentMode } from '../../utils/constants';

interface CreateDonationInput {
  eventId?: string;
  purpose: string;
  devoteeName: string;
  mobileNumber?: string;
  email?: string;
  address?: string;
  panNumber?: string;
  isAnonymous: boolean;
  amount: number;
  paymentMode: PaymentMode;
  transactionRef?: string;
  is80GEligible: boolean;
  notes?: string;
  clientId?: string;
  soldAt?: Date;
  soldByEmployeeId: string;
}

async function nextDonationCode(session?: mongoose.ClientSession) {
  const n = await nextSequence('DON', session);
  return `DON${String(n).padStart(5, '0')}`;
}
async function nextDonationReceipt(session?: mongoose.ClientSession) {
  const year = new Date().getFullYear();
  const n = await nextSequence(`DRCP-${year}`, session);
  return `DRCP-${year}-${String(n).padStart(4, '0')}`;
}
async function nextDonationBooking(session?: mongoose.ClientSession) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const n = await nextSequence(`DBK-${ymd}`, session);
  return `DBK${ymd}-${String(n).padStart(4, '0')}`;
}
async function next80GCert(session?: mongoose.ClientSession) {
  const fy = financialYear();
  const n = await nextSequence(`CERT-${fy}`, session);
  return `80G-${fy}-${String(n).padStart(4, '0')}`;
}

function financialYear(d = new Date()): string {
  // Indian FY: April-March, e.g. "2025-26"
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
}

/**
 * Create donation. Wrapped in a transaction so counters + insert are atomic.
 * IDEMPOTENT on clientId — if the same clientId is sent twice (offline retry),
 * returns the existing donation instead of creating a duplicate.
 */
export async function createDonation(input: CreateDonationInput) {
  // Idempotency check (used by offline sync)
  if (input.clientId) {
    const existing = await Donation.findOne({ clientId: input.clientId });
    if (existing) return existing; // duplicate offline submit — return original
  }

  const session = await mongoose.startSession();
  try {
    let result: any;
    await session.withTransaction(async () => {
      const employee = await Employee.findById(input.soldByEmployeeId).session(session);
      if (!employee || employee.status !== 'ACTIVE') throw BadRequest('Employee inactive');

      let eventName: string | undefined;
      if (input.eventId) {
        const ev = await Event.findById(input.eventId).session(session);
        if (!ev) throw NotFound('Event not found');
        eventName = ev.eventName;
      }

      // 80G compliance check
      if (input.is80GEligible && input.amount > 2000 && !input.panNumber)
        throw BadRequest('PAN required for 80G donations above ₹2000');

      const [donationId, bookingNumber, receiptNumber] = await Promise.all([
        nextDonationCode(session),
        nextDonationBooking(session),
        nextDonationReceipt(session),
      ]);

      const [donation] = await Donation.create(
        [{
          donationId,
          bookingNumber,
          receiptNumber,
          eventId: input.eventId,
          eventName,
          purpose: input.purpose,
          devoteeName: input.isAnonymous ? 'Anonymous' : input.devoteeName,
          mobileNumber: input.mobileNumber,
          email: input.email,
          address: input.address,
          panNumber: input.panNumber?.toUpperCase(),
          isAnonymous: input.isAnonymous,
          amount: input.amount,
          paymentMode: input.paymentMode,
          transactionRef: input.transactionRef,
          is80GEligible: input.is80GEligible,
          notes: input.notes,
          soldByEmployeeId: employee._id,
          soldByName: `${employee.firstName} ${employee.lastName}`,
          soldAt: input.soldAt ?? new Date(),
          clientId: input.clientId,
          syncedFromOffline: !!input.clientId,
        }],
        { session },
      );
      result = donation;
    });
    return result;
  } catch (e: any) {
    // Duplicate key on clientId means a race — fetch and return the winner
    if (e?.code === 11000 && input.clientId) {
      const existing = await Donation.findOne({ clientId: input.clientId });
      if (existing) return existing;
    }
    throw e;
  } finally {
    await session.endSession();
  }
}

export async function getDonation(id: string) {
  const d = await Donation.findById(id);
  if (!d) throw NotFound('Donation not found');
  return d;
}

export async function getByReceipt(receiptNumber: string) {
  const d = await Donation.findOne({ receiptNumber });
  if (!d) throw NotFound('Donation not found');
  return d;
}

export async function listDonations(q: any) {
  const filter: any = {};
  if (q.eventId)  filter.eventId = q.eventId;
  if (q.soldBy)   filter.soldByEmployeeId = q.soldBy;
  if (q.panNumber)filter.panNumber = q.panNumber.toUpperCase();
  if (q.minAmount)filter.amount = { $gte: q.minAmount };
  if (q.is80GEligible !== undefined) filter.is80GEligible = q.is80GEligible === 'true';
  if (q.from || q.to) filter.soldAt = { ...(q.from && { $gte: q.from }), ...(q.to && { $lte: q.to }) };
  if (q.search) {
    const r = new RegExp(q.search, 'i');
    filter.$or = [
      { donationId: r }, { receiptNumber: r }, { bookingNumber: r },
      { devoteeName: r }, { mobileNumber: r }, { panNumber: r.source.toUpperCase() },
    ];
  }
  const skip = (q.page - 1) * q.limit;
  const [items, totals] = await Promise.all([
    Donation.find(filter).sort({ soldAt: -1 }).skip(skip).limit(q.limit),
    Donation.aggregate([
      { $match: filter },
      { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
    ]),
  ]);
  const total = totals[0]?.count ?? 0;
  return {
    items, total,
    page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit),
    totalAmount: totals[0]?.totalAmount ?? 0,
  };
}

export async function issue80GCertificate(id: string) {
  const donation = await Donation.findById(id);
  if (!donation) throw NotFound('Donation not found');
  if (!donation.is80GEligible) throw BadRequest('Donation is not 80G eligible');
  if (donation.amount > 2000 && !donation.panNumber)
    throw BadRequest('PAN required to issue 80G certificate above ₹2000');
  if (donation.cert80GIssued) return donation;

  donation.cert80GNumber = await next80GCert();
  donation.cert80GIssued = true;
  await donation.save();
  return donation;
}

export async function markPrinted(id: string) {
  return Donation.findByIdAndUpdate(id, { printed: true, printedAt: new Date() }, { new: true });
}

export async function donationStats(from?: Date, to?: Date) {
  const match: any = {};
  if (from || to) match.soldAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  const [overall, byPurpose, byMode] = await Promise.all([
    Donation.aggregate([
      { $match: match },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' }, avg: { $avg: '$amount' } } },
    ]),
    Donation.aggregate([
      { $match: match },
      { $group: { _id: '$purpose', count: { $sum: 1 }, total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),
    Donation.aggregate([
      { $match: match },
      { $group: { _id: '$paymentMode', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]),
  ]);
  return {
    summary: overall[0] ?? { count: 0, total: 0, avg: 0 },
    byPurpose,
    byMode,
  };
}
