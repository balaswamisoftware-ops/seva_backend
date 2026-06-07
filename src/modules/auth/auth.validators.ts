import { z } from 'zod';

export const loginSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'PIN must be 6 digits'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
