import { z } from 'zod';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../../utils/constants';

export const listQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(200).default(50),
  entityType: z.enum(AUDIT_ENTITIES).optional(),
  action:     z.enum(AUDIT_ACTIONS).optional(),
  entityId:   z.string().optional(),
});
