import crypto from 'crypto';
import { env } from '../config/env';

export function pinLookupHash(pin: string): string {
  return crypto.createHmac('sha256', env.PIN_PEPPER).update(pin).digest('hex');
}
