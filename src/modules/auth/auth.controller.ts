import { RequestHandler } from 'express';
import * as service from './auth.service';
import { logActivity } from '../../middleware/activity';
import { ACTIVITY_ACTIONS } from '../../utils/constants';

export const loginHandler: RequestHandler = async (req, res) => {
  const { pin } = req.body;
  const result = await service.login(pin);
  // can't attach req.user yet; log manually
  await logActivity(
    { ...req, user: { id: result.employee.id.toString(), employeeId: result.employee.employeeId, role: result.employee.role } } as any,
    ACTIVITY_ACTIONS.LOGIN,
  );
  res.json({ success: true, data: result });
};

export const refreshHandler: RequestHandler = async (req, res) => {
  const { refreshToken } = req.body;
  const tokens = await service.refresh(refreshToken);
  res.json({ success: true, data: tokens });
};

export const logoutHandler: RequestHandler = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await service.logout(refreshToken);
  await logActivity(req, ACTIVITY_ACTIONS.LOGOUT);
  res.json({ success: true });
};

export const meHandler: RequestHandler = (req, res) => {
  res.json({ success: true, data: req.user });
};
