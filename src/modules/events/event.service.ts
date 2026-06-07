import { Event } from './event.model';
import { Seva } from '../sevas/seva.model';
import { nextEventCode, nextSevaCode } from '../../utils/counters';
import { NotFound, BadRequest } from '../../utils/errors';
import { EventStatus } from '../../utils/constants';

export async function createEvent(input: any, createdBy?: string) {
  const { sevas: inlineSevas = [], ...eventInput } = input;
  const eventId = await nextEventCode();
  const ev = await Event.create({ ...eventInput, eventId, createdBy });

  if (Array.isArray(inlineSevas) && inlineSevas.length > 0) {
    const rows = await Promise.all(inlineSevas.map(async (s: any) => ({
      ...s,
      sevaId: await nextSevaCode(),
      eventId: ev._id,
      availableTickets: s.maxTickets || 0,
      createdBy,
    })));
    await Seva.insertMany(rows);
  }

  return ev.toJSON();
}

export async function updateEvent(id: string, input: any, updatedBy?: string) {
  const ev = await Event.findByIdAndUpdate(id, { ...input, updatedBy }, { new: true });
  if (!ev) throw NotFound('Event not found');
  return ev.toJSON();
}

export async function deleteEvent(id: string) {
  const seva = await Seva.findOne({ eventId: id });
  if (seva) throw BadRequest('Cannot delete event with sevas attached. Delete sevas first or mark event CANCELLED.');
  const ev = await Event.findByIdAndDelete(id);
  if (!ev) throw NotFound('Event not found');
  return { success: true };
}

export async function getEvent(id: string) {
  const ev = await Event.findById(id);
  if (!ev) throw NotFound('Event not found');
  return ev.toJSON();
}

interface ListQuery { page: number; limit: number; search?: string; status?: EventStatus; }
export async function listEvents(q: ListQuery) {
  const filter: any = {};
  if (q.status) filter.status = q.status;
  if (q.search) {
    const r = new RegExp(q.search, 'i');
    filter.$or = [{ eventId: r }, { eventName: r }, { location: r }];
  }
  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    Event.find(filter).sort({ startDate: -1 }).skip(skip).limit(q.limit),
    Event.countDocuments(filter),
  ]);
  return { items, total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) };
}

export async function listOngoingEvents() {
  const now = new Date();
  return Event.find({
    status: { $in: ['ONGOING', 'UPCOMING'] },
    startDate: { $lte: new Date(now.getTime() + 24 * 3600e3) }, // today/upcoming next 24h
    endDate: { $gte: now },
  }).sort({ startDate: 1 });
}
