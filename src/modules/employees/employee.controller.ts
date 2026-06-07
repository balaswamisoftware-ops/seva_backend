import { RequestHandler } from 'express';
import * as service from './employee.service';
import { logActivity } from '../../middleware/activity';
import { ACTIVITY_ACTIONS } from '../../utils/constants';

export const create: RequestHandler = async (req, res) => {
  const employee = await service.createEmployee({ ...req.body, createdBy: req.user!.id });
  await logActivity(req, ACTIVITY_ACTIONS.EMPLOYEE_CREATED, { type: 'Employee', id: employee._id.toString() });
  res.status(201).json({ success: true, data: employee });
};

export const update: RequestHandler = async (req, res) => {
  const employee = await service.updateEmployee(req.params.id, req.body, req.user!.id);
  await logActivity(req, ACTIVITY_ACTIONS.EMPLOYEE_UPDATED, { type: 'Employee', id: req.params.id });
  res.json({ success: true, data: employee });
};

export const resetPin: RequestHandler = async (req, res) => {
  await service.resetPin(req.params.id, req.body.newPin, req.user!.id);
  await logActivity(req, ACTIVITY_ACTIONS.PIN_RESET, { type: 'Employee', id: req.params.id });
  res.json({ success: true });
};

export const getOne: RequestHandler = async (req, res) => {
  res.json({ success: true, data: await service.getEmployee(req.params.id) });
};

export const list: RequestHandler = async (req, res) => {
  res.json({ success: true, data: await service.listEmployees(req.query as any) });
};

export const toggleStatus: RequestHandler = async (req, res) => {
  const current = await service.getEmployee(req.params.id);
  const next = current.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const employee = await service.updateEmployee(req.params.id, { status: next }, req.user!.id);
  await logActivity(req, ACTIVITY_ACTIONS.EMPLOYEE_UPDATED, { type: 'Employee', id: req.params.id }, { status: next });
  res.json({ success: true, data: employee });
};
