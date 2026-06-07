import { z } from 'zod';
import { ROLES, STATUSES } from '../../utils/constants';

export const createEmployeeSchema = z.object({
  firstName:    z.string().min(1).max(60),
  lastName:     z.string().min(1).max(60),
  mobileNumber: z.string().regex(/^[0-9+\-\s]{7,15}$/, 'Invalid mobile number'),
  email:        z.string().email().optional().or(z.literal('').transform(() => undefined)),
  pin:          z.string().regex(/^\d{6}$/, 'PIN must be 6 digits'),
  role:         z.enum(ROLES).default('ADMIN'),
});

export const updateEmployeeSchema = z.object({
  firstName:    z.string().min(1).max(60).optional(),
  lastName:     z.string().min(1).max(60).optional(),
  mobileNumber: z.string().regex(/^[0-9+\-\s]{7,15}$/).optional(),
  email:        z.string().email().optional().or(z.literal('').transform(() => undefined)),
  role:         z.enum(ROLES).optional(),
  status:       z.enum(STATUSES).optional(),
});

export const resetPinSchema = z.object({
  newPin: z.string().regex(/^\d{6}$/, 'PIN must be 6 digits'),
});

export const listQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role:   z.enum(ROLES).optional(),
  status: z.enum(STATUSES).optional(),
});
