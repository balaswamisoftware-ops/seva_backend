import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { listQuerySchema } from './audit.validators';
import * as ctrl from './audit.controller';

const router = Router();

// Audit log is Super-Admin only — viewing AND rollback.
router.use(authenticate, authorize('SUPER_ADMIN'));

router.get('/',            validate(listQuerySchema, 'query'), asyncHandler(ctrl.list));
router.post('/:id/rollback',                                   asyncHandler(ctrl.rollback));

export default router;
