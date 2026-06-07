import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createEventSchema, updateEventSchema, listQuerySchema } from './event.validators';
import * as ctrl from './event.controller';

const router = Router();
router.use(authenticate);

router.get('/ongoing',                                          asyncHandler(ctrl.ongoing));
router.get('/',          validate(listQuerySchema, 'query'),    asyncHandler(ctrl.list));
router.get('/:id',                                              asyncHandler(ctrl.getOne));
router.post('/',         validate(createEventSchema),           asyncHandler(ctrl.create));
router.put('/:id',       validate(updateEventSchema),           asyncHandler(ctrl.update));
router.delete('/:id',    authorize('SUPER_ADMIN'),              asyncHandler(ctrl.remove));

export default router;
