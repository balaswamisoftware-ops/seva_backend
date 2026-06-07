import { z } from 'zod';
import { STATUSES } from '../../utils/constants';

export const createPurposeSchema = z.object({
  purposeName: z.string().min(1).max(120),
  status:      z.enum(STATUSES).optional(),
});

export const updatePurposeSchema = z.object({
  purposeName: z.string().min(1).max(120).optional(),
  status:      z.enum(STATUSES).optional(),
});

export const listPurposesSchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(200).default(100),
  search: z.string().optional(),
  status: z.enum(STATUSES).optional(),
});
