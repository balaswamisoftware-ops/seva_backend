import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createEmployeeSchema, updateEmployeeSchema, resetPinSchema, listQuerySchema,
} from './employee.validators';
import * as ctrl from './employee.controller';

const router = Router();
router.use(authenticate);

router.get('/',          validate(listQuerySchema, 'query'),               asyncHandler(ctrl.list));
router.get('/:id',                                                          asyncHandler(ctrl.getOne));
router.post('/',         authorize('SUPER_ADMIN'), validate(createEmployeeSchema), asyncHandler(ctrl.create));
router.put('/:id',       authorize('SUPER_ADMIN'), validate(updateEmployeeSchema), asyncHandler(ctrl.update));
router.patch('/:id/pin', authorize('SUPER_ADMIN'), validate(resetPinSchema),       asyncHandler(ctrl.resetPin));
router.patch('/:id/status', authorize('SUPER_ADMIN'),                              asyncHandler(ctrl.toggleStatus));

export default router;
