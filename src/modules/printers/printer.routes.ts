import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createPrinterSchema, updatePrinterSchema, printTicketSchema,
} from './printer.validators';
import * as ctrl from './printer.controller';

const router = Router();
router.use(authenticate);

router.get('/',          asyncHandler(ctrl.list));
router.post('/print',    validate(printTicketSchema),   asyncHandler(ctrl.print));
router.get('/:id',       asyncHandler(ctrl.getOne));
router.post('/:id/test', authorize('SUPER_ADMIN'),      asyncHandler(ctrl.test));
router.post('/',         authorize('SUPER_ADMIN'), validate(createPrinterSchema), asyncHandler(ctrl.create));
router.put('/:id',       authorize('SUPER_ADMIN'), validate(updatePrinterSchema), asyncHandler(ctrl.update));
router.delete('/:id',    authorize('SUPER_ADMIN'), asyncHandler(ctrl.remove));

export default router;
