import mongoose from 'mongoose';
import { Ticket } from './ticket.model';
import { Seva } from '../sevas/seva.model';
import { Event } from '../events/event.model';
import { Employee } from '../employees/employee.model';
import { BadRequest, NotFound } from '../../utils/errors';
import { nextTicketCode, nextBookingNumber, nextReceiptNumber } from '../../utils/counters';
import { PaymentMode } from '../../utils/constants';

interface SellInput {
  eventId: string; sevaId: string; devoteeName: string; mobileNumber?: string;
  quantity: number; paymentMode: PaymentMode; soldByEmployeeId: string;
  // Offline sync extensions
  clientId?: string;
  soldAt?: Date;
}

/**
 * CRITICAL: Sells ticket atomically inside a MongoDB transaction.
 *
 * Idempotency: if input.clientId is set and a ticket with that clientId
 * already exists, returns the original (no duplicate insert). This allows
 * the offline queue to safely retry without creating duplicate sales.
 */
export async function sellTicket(input: SellInput) {
  // Idempotency short-circuit BEFORE starting a transaction
  if (input.clientId) {
    const existing = await Ticket.findOne({ clientId: input.clientId });
    if (existing) return existing;
  }

  const session = await mongoose.startSession();
  try {
    let result: any;
    await session.withTransaction(async () => {
      const [event, employee] = await Promise.all([
        Event.findById(input.eventId).session(session),
        Employee.findById(input.soldByEmployeeId).session(session),
      ]);
      if (!event) throw NotFound('Event not found');
      if (event.status === 'CANCELLED' || event.status === 'COMPLETED')
        throw BadRequest(`Cannot sell tickets — event is ${event.status}`);
      if (!employee || employee.status !== 'ACTIVE') throw BadRequest('Employee inactive');

      const seva = await Seva.findById(input.sevaId).session(session);
      if (!seva) throw NotFound('Seva not found');
      // Sevas can be attached to many events — verify this seva is attached
      // to the one the caller picked.
      const attached = (seva.eventIds ?? []).some((id: any) => String(id) === String(event._id));
      if (!attached) throw BadRequest('Seva not attached to this event');
      if (seva.status !== 'ACTIVE') throw BadRequest(`Seva is ${seva.status}`);

      // Inventory check + atomic decrement (only if limited)
      if (seva.maxTickets > 0) {
        const updated = await Seva.findOneAndUpdate(
          { _id: seva._id, availableTickets: { $gte: input.quantity } },
          { $inc: { availableTickets: -input.quantity } },
          { new: true, session },
        );
        if (!updated) throw BadRequest('Not enough tickets available');
        if (updated.availableTickets === 0) {
          updated.status = 'SOLD_OUT';
          await updated.save({ session });
        }
      }

      const [ticketId, bookingNumber, receiptNumber] = await Promise.all([
        nextTicketCode(session),
        nextBookingNumber(session),
        nextReceiptNumber(session),
      ]);

      const unitPrice = Number(seva.price);
      const totalAmount = +(unitPrice * input.quantity).toFixed(2);

      const [ticket] = await Ticket.create(
        [{
          ticketId,
          bookingNumber,
          receiptNumber,
          eventId: event._id,
          sevaId: seva._id,
          eventName: event.eventName,
          sevaName: seva.sevaName,
          devoteeName: input.devoteeName,
          mobileNumber: input.mobileNumber,
          quantity: input.quantity,
          unitPrice,
          totalAmount,
          paymentMode: input.paymentMode,
          soldByEmployeeId: employee._id,
          soldByName: `${employee.firstName} ${employee.lastName}`,
          soldAt: input.soldAt ?? new Date(),
          clientId: input.clientId,
          syncedFromOffline: !!input.clientId,
        }],
        { session },
      );

      result = ticket;
    });
    return result;
  } catch (e: any) {
    // Duplicate-key race on clientId — fetch and return the winner
    if (e?.code === 11000 && input.clientId) {
      const existing = await Ticket.findOne({ clientId: input.clientId });
      if (existing) return existing;
    }
    throw e;
  } finally {
    await session.endSession();
  }
}

export async function getTicket(id: string) {
  const t = await Ticket.findById(id);
  if (!t) throw NotFound('Ticket not found');
  return t;
}

export async function getTicketByReceipt(receiptNumber: string) {
  const t = await Ticket.findOne({ receiptNumber });
  if (!t) throw NotFound('Ticket not found');
  return t;
}

export async function listTickets(q: any) {
  const filter: any = {};
  if (q.eventId) filter.eventId = q.eventId;
  if (q.sevaId)  filter.sevaId  = q.sevaId;
  if (q.soldBy)  filter.soldByEmployeeId = q.soldBy;
  if (q.from || q.to) filter.soldAt = { ...(q.from && { $gte: q.from }), ...(q.to && { $lte: q.to }) };
  if (q.search) {
    const r = new RegExp(q.search, 'i');
    filter.$or = [
      { ticketId: r }, { bookingNumber: r }, { receiptNumber: r },
      { devoteeName: r }, { mobileNumber: r },
    ];
  }
  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    Ticket.find(filter).sort({ soldAt: -1 }).skip(skip).limit(q.limit),
    Ticket.countDocuments(filter),
  ]);
  return { items, total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) };
}

export async function markPrinted(id: string) {
  return Ticket.findByIdAndUpdate(id, { printed: true, printedAt: new Date() }, { new: true });
}
