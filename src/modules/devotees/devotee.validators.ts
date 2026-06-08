import { z } from 'zod';

// Indian 10-digit mobile number (starts 6-9). Shared by devotees + participation.
export const phoneNumberSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const createDevoteeSchema = z.object({
  fullName:    z.string().min(2).max(120),
  phoneNumber: phoneNumberSchema,
  gothram:     z.string().max(120).optional(),
  nakshatram:  z.string().max(120).optional(),
});

export const updateDevoteeSchema = z.object({
  fullName:    z.string().min(2).max(120).optional(),
  phoneNumber: phoneNumberSchema.optional(),
  gothram:     z.string().max(120).optional().or(z.literal('')),
  nakshatram:  z.string().max(120).optional().or(z.literal('')),
});

export const listQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});
