import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000').transform(Number),
  MONGODB_URI: z.string(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  PIN_PEPPER: z.string().min(16, 'PIN_PEPPER must be at least 16 chars'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.string().default('5').transform(Number),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid env:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
