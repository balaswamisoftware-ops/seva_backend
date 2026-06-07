import { Seva } from './seva.model';
import { Event } from '../events/event.model';
import { nextSevaCode } from '../../utils/counters';
import { NotFound, BadRequest } from '../../utils/errors';

// Verify every id in `ids` corresponds to a real Event; throw on any miss.
async function ensureEventsExist(ids: string[]) {
  if (!ids?.length) return;
  const count = await Event.countDocuments({ _id: { $in: ids } });
  if (count !== ids.length) throw NotFound('One or more events not found');
}

// De-dup an array of ids preserving insertion order.
function uniqueIds(ids: any[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of ids ?? []) {
    const s = String(v);
    if (!seen.has(s)) { seen.add(s); out.push(s); }
  }
  return out;
}

export async function createSeva(input: any, createdBy?: string) {
  // eventIds is optional: sevas may be created as a flat master record and
  // attached to events later from the Events editor.
  const eventIds = uniqueIds(input.eventIds ?? []);
  await ensureEventsExist(eventIds);
  const sevaId = await nextSevaCode();
  const available = input.maxTickets || 0;
  const seva = await Seva.create({
    ...input,
    eventIds,
    sevaId,
    availableTickets: available,
    createdBy,
  });
  return seva.toJSON();
}

export async function updateSeva(id: string, input: any, updatedBy?: string) {
  const seva = await Seva.findById(id);
  if (!seva) throw NotFound('Seva not found');
  // Attach/detach events: validate every id in the new list before writing.
  if (input.eventIds !== undefined) {
    input.eventIds = uniqueIds(input.eventIds);
    await ensureEventsExist(input.eventIds);
  }
  // If maxTickets changes, adjust available proportionally (simple rule: never below zero)
  if (input.maxTickets !== undefined && input.maxTickets !== seva.maxTickets) {
    const sold = seva.maxTickets - seva.availableTickets;
    if (input.maxTickets < sold) throw BadRequest(`maxTickets cannot be below sold count (${sold})`);
    input.availableTickets = input.maxTickets === 0 ? 0 : input.maxTickets - sold;
  }
  Object.assign(seva, input, { updatedBy });
  await seva.save();
  return seva.toJSON();
}

export async function deleteSeva(id: string) {
  const seva = await Seva.findById(id);
  if (!seva) throw NotFound('Seva not found');
  // Soft-disable instead of deleting if tickets sold
  const soldCount = (seva.maxTickets || 0) - (seva.availableTickets || 0);
  if (soldCount > 0) {
    seva.status = 'INACTIVE';
    await seva.save();
    return { success: true, softDisabled: true };
  }
  await seva.deleteOne();
  return { success: true };
}

export async function getSeva(id: string) {
  const seva = await Seva.findById(id).populate('eventIds', 'eventId eventName');
  if (!seva) throw NotFound('Seva not found');
  return seva;
}

export async function listSevas(q: any) {
  const filter: any = {};
  // The `eventId` query param filters for sevas attached to that event —
  // Mongo's array-containment matches each element of `eventIds`.
  if (q.eventId) filter.eventIds = q.eventId;
  if (q.status)  filter.status = q.status;
  if (q.search) {
    const r = new RegExp(q.search, 'i');
    filter.$or = [{ sevaId: r }, { sevaName: r }];
  }
  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    Seva.find(filter).populate('eventIds', 'eventId eventName').sort({ createdAt: -1 }).skip(skip).limit(q.limit),
    Seva.countDocuments(filter),
  ]);
  return { items, total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) };
}

export async function listSevasByEvent(eventId: string) {
  return Seva.find({ eventIds: eventId, status: 'ACTIVE' }).sort({ sevaDate: 1, sevaTime: 1 });
}

/**
 * Distinct seva names across all events with the most recent price/maxTickets.
 * Used in the event create dialog to suggest previously-used sevas.
 */
export async function listSevaTemplates() {
  const rows = await Seva.aggregate([
    { $sort: { createdAt: -1 } },
    { $group: {
        _id: '$sevaName',
        price: { $first: '$price' },
        maxTickets: { $first: '$maxTickets' },
        sevaTime: { $first: '$sevaTime' },
    } },
    { $project: { _id: 0, sevaName: '$_id', price: 1, maxTickets: 1, sevaTime: 1 } },
    { $sort: { sevaName: 1 } },
  ]);
  return rows;
}
