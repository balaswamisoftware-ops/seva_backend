import { RequestHandler } from 'express';
import * as service from './seva.service';
import { logActivity } from '../../middleware/activity';
import { ACTIVITY_ACTIONS } from '../../utils/constants';

export const create: RequestHandler = async (req, res) => {
  const seva = await service.createSeva(req.body, req.user!.id);
  await logActivity(req, ACTIVITY_ACTIONS.SEVA_CREATED, { type: 'Seva', id: seva._id.toString() });
  res.status(201).json({ success: true, data: seva });
};
export const update: RequestHandler = async (req, res) => {
  const seva = await service.updateSeva(req.params.id, req.body, req.user!.id);
  await logActivity(req, ACTIVITY_ACTIONS.SEVA_UPDATED, { type: 'Seva', id: req.params.id });
  res.json({ success: true, data: seva });
};
export const remove: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.deleteSeva(req.params.id) });
export const getOne: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.getSeva(req.params.id) });
export const list: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.listSevas(req.query as any) });
export const byEvent: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.listSevasByEvent(req.params.eventId) });
export const templates: RequestHandler = async (_req, res) =>
  res.json({ success: true, data: await service.listSevaTemplates() });
