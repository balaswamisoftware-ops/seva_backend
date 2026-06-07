import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sellTicketSchema, listQuerySchema } from './ticket.validators';
import * as ctrl from './ticket.controller';

const router = Router();
router.use(authenticate);

router.post('/sell',                 validate(sellTicketSchema),       asyncHandler(ctrl.sell));
router.get('/',                       validate(listQuerySchema, 'query'), asyncHandler(ctrl.list));
router.get('/:id',                                                       asyncHandler(ctrl.getOne));
router.get('/:id/receipt',                                               asyncHandler(ctrl.getReceipt));
router.get('/:id/receipt/text',                                          asyncHandler(ctrl.getReceiptText));
router.patch('/:id/printed',                                             asyncHandler(ctrl.markPrinted));

export default router;
