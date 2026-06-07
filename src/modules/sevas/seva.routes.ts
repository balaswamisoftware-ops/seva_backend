import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createSevaSchema, updateSevaSchema, listQuerySchema } from './seva.validators';
import * as ctrl from './seva.controller';

const router = Router();
router.use(authenticate);

router.get('/templates',                                          asyncHandler(ctrl.templates));
router.get('/by-event/:eventId',                                  asyncHandler(ctrl.byEvent));
router.get('/',          validate(listQuerySchema, 'query'),     asyncHandler(ctrl.list));
router.get('/:id',                                                asyncHandler(ctrl.getOne));
router.post('/',         validate(createSevaSchema),              asyncHandler(ctrl.create));
router.put('/:id',       validate(updateSevaSchema),              asyncHandler(ctrl.update));
router.delete('/:id',    authorize('SUPER_ADMIN'),                asyncHandler(ctrl.remove));

export default router;
