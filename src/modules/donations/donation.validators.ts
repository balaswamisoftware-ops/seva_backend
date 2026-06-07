import { z } from 'zod';
import { PAYMENT_MODES } from '../../utils/constants';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const createDonationSchema = z.object({
  eventId:        objectId.optional(),
  purpose:        z.string().min(1).max(200).default('General Donation'),
  devoteeName:    z.string().min(1).max(120),
  mobileNumber:   z.string().regex(/^[0-9+\-\s]{7,15}$/).optional(),
  email:          z.string().email().optional().or(z.literal('').transform(() => undefined)),
  address:        z.string().max(500).optional(),
  panNumber:      z.string().regex(panRegex, 'Invalid PAN (format: ABCDE1234F)').optional().or(z.literal('').transform(() => undefined)),
  isAnonymous:    z.coerce.boolean().default(false),
  amount:         z.coerce.number().positive('Amount must be > 0'),
  paymentMode:    z.enum(PAYMENT_MODES).default('CASH'),
  transactionRef: z.string().max(100).optional(),
  is80GEligible:  z.coerce.boolean().default(true),
  notes:          z.string().max(500).optional(),
  // Offline support
  clientId:       z.string().uuid().optional(),
  soldAt:         z.coerce.date().optional(), // for offline-synced donations
}).refine(
  (d) => {
    // PAN required for 80G donations over ₹2000 (Indian tax law)
    if (d.is80GEligible && d.amount > 2000 && !d.panNumber) return false;
    return true;
  },
  { message: 'PAN required for 80G donations above ₹2000', path: ['panNumber'] },
);

export const listDonationsSchema = z.object({
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
  search:      z.string().optional(),
  eventId:     objectId.optional(),
  soldBy:      objectId.optional(),
  from:        z.coerce.date().optional(),
  to:          z.coerce.date().optional(),
  minAmount:   z.coerce.number().optional(),
  panNumber:   z.string().optional(),
  is80GEligible: z.enum(['true', 'false']).optional(),
});

export const issue80GCertSchema = z.object({
  certNumber: z.string().min(1).max(60).optional(), // auto-generated if omitted
});
