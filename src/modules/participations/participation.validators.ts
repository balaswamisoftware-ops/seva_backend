import { z } from 'zod';
import { PAYMENT_MODES } from '../../utils/constants';
import { phoneNumberSchema } from '../devotees/devotee.validators';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

// phoneNumber is optional at the schema level; the service enforces it as
// mandatory when the event has collectDevoteeDetails enabled.
export const createParticipationSchema = z.object({
  eventId:     objectId,
  phoneNumber: phoneNumberSchema.optional(),
  fullName:    z.string().min(2).max(120).optional(),
  gothram:     z.string().max(120).optional(),
  nakshatram:  z.string().max(120).optional(),
  sevaId:      objectId.optional(),
  quantity:    z.coerce.number().int().min(1).default(1),
  paymentMode: z.enum(PAYMENT_MODES).default('CASH'),
  notes:       z.string().max(500).optional(),
});

export const listQuerySchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(20),
  eventId:   objectId.optional(),
  devoteeId: objectId.optional(),
  search:    z.string().optional(),
});
