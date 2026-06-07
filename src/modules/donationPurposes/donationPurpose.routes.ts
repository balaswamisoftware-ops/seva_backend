import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createPurposeSchema, updatePurposeSchema, listPurposesSchema,
} from './donationPurpose.validators';
import * as ctrl from './donationPurpose.controller';

const router = Router();
router.use(authenticate);

router.get('/active',                                                          asyncHandler(ctrl.active));
router.get('/',          validate(listPurposesSchema, 'query'),                asyncHandler(ctrl.list));
router.post('/',         authorize('SUPER_ADMIN'), validate(createPurposeSchema), asyncHandler(ctrl.create));
router.put('/:id',       authorize('SUPER_ADMIN'), validate(updatePurposeSchema), asyncHandler(ctrl.update));
router.patch('/:id/status', authorize('SUPER_ADMIN'),                          asyncHandler(ctrl.toggle));

export default router;
