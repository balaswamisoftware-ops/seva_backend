import { z } from 'zod';
import { PAYMENT_MODES } from '../../utils/constants';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const sellTicketSchema = z.object({
  eventId:      objectId,
  sevaId:       objectId,
  devoteeName:  z.string().min(1).max(120),
  mobileNumber: z.string().regex(/^[0-9+\-\s]{7,15}$/).optional(),
  quantity:     z.coerce.number().int().min(1).max(100),
  paymentMode:  z.enum(PAYMENT_MODES).default('CASH'),
});

export const listQuerySchema = z.object({
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(100).default(20),
  eventId: objectId.optional(),
  sevaId:  objectId.optional(),
  soldBy:  objectId.optional(),
  from:    z.coerce.date().optional(),
  to:      z.coerce.date().optional(),
  search:  z.string().optional(),
});
