import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createDevoteeSchema, updateDevoteeSchema, listQuerySchema } from './devotee.validators';
import * as ctrl from './devotee.controller';

const router = Router();
router.use(authenticate);

// Admin + Super Admin can create / view / edit devotees.
router.get('/lookup',                                          asyncHandler(ctrl.lookup));
router.get('/',     validate(listQuerySchema, 'query'),        asyncHandler(ctrl.list));
router.get('/:id',                                             asyncHandler(ctrl.getOne));
router.post('/',    authorize('ADMIN', 'SUPER_ADMIN'), validate(createDevoteeSchema), asyncHandler(ctrl.create));
router.put('/:id',  authorize('ADMIN', 'SUPER_ADMIN'), validate(updateDevoteeSchema), asyncHandler(ctrl.update));
// Deletion is destructive — Super Admin only (still fully audited + reversible).
router.delete('/:id', authorize('SUPER_ADMIN'),                asyncHandler(ctrl.remove));

export default router;
