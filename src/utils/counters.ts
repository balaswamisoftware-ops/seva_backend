import { Schema, model } from 'mongoose';
import { ClientSession } from 'mongoose';

interface ICounter { _id: string; seq: number; }

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = model<ICounter>('Counter', counterSchema);

/**
 * Atomically increment a named counter and return the next padded code.
 * - EMP -> EMP001
 * - EVT -> EVT0001
 * - SEV -> SEV0001
 * - TKT -> TKT00001
 * - RCP -> RCP-2026-0001
 * - BK  -> BK20260521-0001
 */
export async function nextSequence(key: string, session?: ClientSession): Promise<number> {
  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session },
  );
  return doc!.seq;
}

export async function nextEmployeeCode(session?: ClientSession) {
  const n = await nextSequence('EMP', session);
  return `EMP${String(n).padStart(3, '0')}`;
}
export async function nextEventCode(session?: ClientSession) {
  const n = await nextSequence('EVT', session);
  return `EVT${String(n).padStart(4, '0')}`;
}
export async function nextSevaCode(session?: ClientSession) {
  const n = await nextSequence('SEV', session);
  return `SEV${String(n).padStart(4, '0')}`;
}
export async function nextTicketCode(session?: ClientSession) {
  const n = await nextSequence('TKT', session);
  return `TKT${String(n).padStart(5, '0')}`;
}
export async function nextReceiptNumber(session?: ClientSession) {
  const year = new Date().getFullYear();
  const n = await nextSequence(`RCP-${year}`, session);
  return `RCP-${year}-${String(n).padStart(4, '0')}`;
}
export async function nextDonationPurposeCode(session?: ClientSession) {
  const n = await nextSequence('DP', session);
  return `DP${String(n).padStart(3, '0')}`;
}
export async function nextBookingNumber(session?: ClientSession) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const n = await nextSequence(`BK-${ymd}`, session);
  return `BK${ymd}-${String(n).padStart(4, '0')}`;
}

export { Counter };
