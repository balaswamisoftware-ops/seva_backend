import { z } from 'zod';
import { EVENT_STATUSES, SEVA_STATUSES } from '../../utils/constants';

const inlineSevaSchema = z.object({
  sevaName:    z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  price:       z.coerce.number().min(0),
  maxTickets:  z.coerce.number().int().min(0).default(0),
  sevaDate:    z.coerce.date().optional(),
  sevaTime:    z.string().regex(/^\d{2}:\d{2}$/).optional(),
  status:      z.enum(SEVA_STATUSES).optional(),
});

export const createEventSchema = z.object({
  eventName:   z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  startDate:   z.coerce.date(),
  endDate:     z.coerce.date(),
  location:    z.string().max(200).optional(),
  bannerImage: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  status:      z.enum(EVENT_STATUSES).optional(),
  collectDevoteeDetails: z.coerce.boolean().optional(),
  sevas:       z.array(inlineSevaSchema).optional(),
}).refine((d) => d.endDate >= d.startDate, { message: 'endDate must be >= startDate', path: ['endDate'] });

export const updateEventSchema = z.object({
  eventName:   z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional(),
  startDate:   z.coerce.date().optional(),
  endDate:     z.coerce.date().optional(),
  location:    z.string().max(200).optional(),
  bannerImage: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  status:      z.enum(EVENT_STATUSES).optional(),
  collectDevoteeDetails: z.coerce.boolean().optional(),
});

export const listQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(EVENT_STATUSES).optional(),
});
