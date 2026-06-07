import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { updateOrgSchema } from './org.validators';
import { OrgSettings } from './orgSettings.model';
import { logActivity } from '../../middleware/activity';
import { ACTIVITY_ACTIONS } from '../../utils/constants';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (_req, res) => {
  let settings = await OrgSettings.findOne();
  if (!settings) settings = await OrgSettings.create({ orgName: 'Spiritual Organization' });
  res.json({ success: true, data: settings });
}));

router.put('/', authorize('SUPER_ADMIN'), validate(updateOrgSchema), asyncHandler(async (req, res) => {
  let settings = await OrgSettings.findOne();
  if (!settings) settings = await OrgSettings.create({ orgName: 'Spiritual Organization' });
  Object.assign(settings, req.body, { updatedBy: req.user!.id });
  await settings.save();
  await logActivity(req, ACTIVITY_ACTIONS.ORG_SETTINGS_UPDATED);
  res.json({ success: true, data: settings });
}));

export default router;
