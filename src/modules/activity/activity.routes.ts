import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { ActivityLog } from './activity.model';

const router = Router();
router.use(authenticate, authorize('SUPER_ADMIN'));

router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(String(req.query.page ?? '1')), 1);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '50')), 1), 200);
  const filter: any = {};
  if (req.query.action)     filter.action = req.query.action;
  if (req.query.employeeId) filter.employeeId = req.query.employeeId;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    ActivityLog.find(filter).populate('employeeId', 'employeeId firstName lastName').sort({ createdAt: -1 }).skip(skip).limit(limit),
    ActivityLog.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items, total, page, limit, pages: Math.ceil(total / limit) } });
}));

export default router;
