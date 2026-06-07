import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './reports.controller';

const router = Router();
router.use(authenticate);

router.get('/dashboard',       asyncHandler(ctrl.dashboard));
router.get('/by-event',        asyncHandler(ctrl.byEvent));
router.get('/by-seva',         asyncHandler(ctrl.bySeva));
router.get('/by-employee',     asyncHandler(ctrl.byEmployee));
router.get('/daily-chart',     asyncHandler(ctrl.dailyChart));
router.get('/monthly',         asyncHandler(ctrl.monthly));

export default router;
