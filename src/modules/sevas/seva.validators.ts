import { z } from 'zod';
import { SEVA_STATUSES } from '../../utils/constants';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const createSevaSchema = z.object({
  // eventIds is optional at creation — sevas exist as master records and are
  // attached to one or more events later via the Events editor.
  eventIds:   z.array(objectId).optional(),
  sevaName:   z.string().min(1).max(120),
  description:z.string().max(2000).optional(),
  price:      z.coerce.number().min(0),
  maxTickets: z.coerce.number().int().min(0).default(0),  // 0 = unlimited
  sevaDate:   z.coerce.date().optional(),
  sevaTime:   z.string().regex(/^\d{2}:\d{2}$/).optional(),
  status:     z.enum(SEVA_STATUSES).optional(),
});

// eventIds on update lets the Events editor attach or detach a seva from
// specific events. Historical tickets snapshot eventName/eventId at sale
// time, so changing this list is safe for reporting.
export const updateSevaSchema = createSevaSchema.partial();

export const listQuerySchema = z.object({
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(100).default(20),
  search:  z.string().optional(),
  status:  z.enum(SEVA_STATUSES).optional(),
  eventId: objectId.optional(),
});
