import { z } from 'zod';
import { PRINTER_TYPES, PRINTER_STATUSES } from './printer.model';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

// Either NETWORK (ip+port required) or AGENT_USB (agentUrl required).
const baseFields = {
  name:       z.string().min(1).max(80),
  paperWidth: z.union([z.literal(58), z.literal(80)]).default(58),
  isDefault:  z.boolean().optional(),
  status:     z.enum(PRINTER_STATUSES).optional(),
  location:   z.string().max(120).optional(),
  notes:      z.string().max(500).optional(),
};

export const createPrinterSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('NETWORK'),
    ipAddress: z.string().min(7).max(45),  // IPv4 or IPv6 max length
    port:      z.coerce.number().int().min(1).max(65535).default(9100),
    ...baseFields,
  }),
  z.object({
    type: z.literal('AGENT_USB'),
    agentUrl: z.string().url(),
    agentKey: z.string().max(200).optional(),
    ...baseFields,
  }),
]);

// Update: partial, but if a field is supplied the type-specific connection
// fields must still validate. Easiest: same shape, all optional.
export const updatePrinterSchema = z.object({
  name:       z.string().min(1).max(80).optional(),
  type:       z.enum(PRINTER_TYPES).optional(),
  ipAddress:  z.string().min(7).max(45).optional(),
  port:       z.coerce.number().int().min(1).max(65535).optional(),
  agentUrl:   z.string().url().optional(),
  agentKey:   z.string().max(200).optional(),
  paperWidth: z.union([z.literal(58), z.literal(80)]).optional(),
  isDefault:  z.boolean().optional(),
  status:     z.enum(PRINTER_STATUSES).optional(),
  location:   z.string().max(120).optional(),
  notes:      z.string().max(500).optional(),
});

export const printTicketSchema = z.object({
  ticketId:  objectId,
  printerId: objectId.optional(), // omit => use default printer
});

export const idParamSchema = z.object({ id: objectId });
