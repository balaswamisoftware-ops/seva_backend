import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createDonationSchema, listDonationsSchema } from './donation.validators';
import * as ctrl from './donation.controller';

const router = Router();
router.use(authenticate);

router.post('/',                  validate(createDonationSchema),         asyncHandler(ctrl.create));
router.get('/',                   validate(listDonationsSchema, 'query'), asyncHandler(ctrl.list));
router.get('/stats',                                                       asyncHandler(ctrl.stats));
router.get('/:id',                                                         asyncHandler(ctrl.getOne));
router.get('/:id/receipt',                                                 asyncHandler(ctrl.getReceipt));
router.get('/:id/cert80g',                                                 asyncHandler(ctrl.get80GCert));
router.post('/:id/issue-80g',     authorize('SUPER_ADMIN'),               asyncHandler(ctrl.issue80G));
router.patch('/:id/printed',                                              asyncHandler(ctrl.markPrinted));

export default router;
