import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createParticipationSchema, listQuerySchema } from './participation.validators';
import * as ctrl from './participation.controller';

const router = Router();
router.use(authenticate);

router.get('/',     validate(listQuerySchema, 'query'),                          asyncHandler(ctrl.list));
router.get('/:id',                                                              asyncHandler(ctrl.getOne));
router.post('/',    authorize('ADMIN', 'SUPER_ADMIN'), validate(createParticipationSchema), asyncHandler(ctrl.create));
router.delete('/:id', authorize('SUPER_ADMIN'),                                 asyncHandler(ctrl.remove));

export default router;
