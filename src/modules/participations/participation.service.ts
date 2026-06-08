import { Request } from 'express';
import mongoose from 'mongoose';
import { EventParticipation } from './participation.model';
import { Event } from '../events/event.model';
import { Seva } from '../sevas/seva.model';
import { findOrCreateByPhone } from '../devotees/devotee.service';
import { nextSequence } from '../../utils/counters';
import { BadRequest, NotFound } from '../../utils/errors';
import { recordAudit } from '../audit/audit.service';
import { PaymentMode } from '../../utils/constants';

async function nextParticipationCode(session?: mongoose.ClientSession) {
  const n = await nextSequence('PART', session);
  return `PART${String(n).padStart(5, '0')}`;
}

interface CreateInput {
  eventId: string;
  phoneNumber?: string;
  fullName?: string;
  gothram?: string;
  nakshatram?: string;
  sevaId?: string;
  quantity: number;
  paymentMode: PaymentMode;
  notes?: string;
}

/**
 * Record a devotee's participation in an event. If a phone number is supplied,
 * the devotee is found-or-created and linked. When the event has
 * collectDevoteeDetails enabled, a phone number is MANDATORY. The devotee
 * find/create and the participation insert happen in one transaction so a
 * mid-flight failure leaves no orphan devotee.
 */
export async function createParticipation(input: CreateInput, req: Request) {
  const event = await Event.findById(input.eventId);
  if (!event) throw NotFound('Event not found');
  if (event.status === 'CANCELLED')
    throw BadRequest('Cannot add participation — this event is CANCELLED.');

  if (event.collectDevoteeDetails && !input.phoneNumber)
    throw BadRequest('This event requires a phone number to participate. Please capture the devotee’s phone number.');

  let seva: any = null;
  if (input.sevaId) {
    seva = await Seva.findById(input.sevaId);
    if (!seva) throw NotFound('Seva not found');
    const attached = (seva.eventIds ?? []).some((id: any) => String(id) === String(event._id));
    if (!attached) throw BadRequest('Selected seva is not attached to this event.');
  }

  const session = await mongoose.startSession();
  try {
    let created: any;
    let devoteeCreated = false;

    await session.withTransaction(async () => {
      let devoteeId: any = undefined;
      let devoteeName: string | undefined = undefined;

      if (input.phoneNumber) {
        const r = await findOrCreateByPhone(
          { phoneNumber: input.phoneNumber, fullName: input.fullName, gothram: input.gothram, nakshatram: input.nakshatram },
          req,
          session,
        );
        devoteeId = r.devotee._id;
        devoteeName = r.devotee.fullName;
        devoteeCreated = r.created;
      }

      const unitPrice = seva ? Number(seva.price) : undefined;
      const totalAmount = unitPrice != null ? +(unitPrice * input.quantity).toFixed(2) : undefined;
      const participationId = await nextParticipationCode(session);

      const [doc] = await EventParticipation.create(
        [{
          participationId,
          eventId: event._id,
          eventName: event.eventName,
          devoteeId,
          devoteeName,
          phoneNumber: input.phoneNumber,
          sevaId: seva?._id,
          sevaName: seva?.sevaName,
          quantity: input.quantity,
          unitPrice,
          totalAmount,
          paymentMode: input.paymentMode,
          notes: input.notes,
          createdBy: req.user?.id,
        }],
        { session },
      );
      created = doc;
    });

    const json = created.toJSON();
    await recordAudit(req, {
      action: 'CREATE', entityType: 'EventParticipation',
      entityId: String(created._id), entityCode: created.participationId,
      before: null, after: json,
    });

    return {
      participation: json,
      devoteeCreated,
      message: devoteeCreated
        ? `Participation recorded. New devotee created for ${input.phoneNumber}.`
        : 'Participation recorded.',
    };
  } finally {
    await session.endSession();
  }
}

export async function deleteParticipation(id: string, req: Request) {
  const doc = await EventParticipation.findById(id);
  if (!doc) throw NotFound('Participation not found');
  const before = doc.toJSON();

  await doc.deleteOne();

  await recordAudit(req, {
    action: 'DELETE', entityType: 'EventParticipation',
    entityId: String(doc._id), entityCode: doc.participationId,
    before, after: null,
  });
  return { success: true };
}

export async function getParticipation(id: string) {
  const doc = await EventParticipation.findById(id);
  if (!doc) throw NotFound('Participation not found');
  return doc.toJSON();
}

interface ListQuery { page: number; limit: number; eventId?: string; devoteeId?: string; search?: string; }
export async function listParticipations(q: ListQuery) {
  const filter: any = {};
  if (q.eventId)   filter.eventId = q.eventId;
  if (q.devoteeId) filter.devoteeId = q.devoteeId;
  if (q.search) {
    const r = new RegExp(q.search, 'i');
    filter.$or = [{ participationId: r }, { devoteeName: r }, { phoneNumber: r }, { eventName: r }, { sevaName: r }];
  }
  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    EventParticipation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit),
    EventParticipation.countDocuments(filter),
  ]);
  return { items, total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) };
}
