import { RequestHandler } from 'express';
import * as service from './event.service';
import { logActivity } from '../../middleware/activity';
import { ACTIVITY_ACTIONS } from '../../utils/constants';

export const create: RequestHandler = async (req, res) => {
  const ev = await service.createEvent(req.body, req);
  await logActivity(req, ACTIVITY_ACTIONS.EVENT_CREATED, { type: 'Event', id: ev._id.toString() });
  res.status(201).json({ success: true, message: `Event "${ev.eventName}" created.`, data: ev });
};
export const update: RequestHandler = async (req, res) => {
  const ev = await service.updateEvent(req.params.id, req.body, req);
  await logActivity(req, ACTIVITY_ACTIONS.EVENT_UPDATED, { type: 'Event', id: req.params.id });
  res.json({ success: true, message: 'Event updated.', data: ev });
};
export const remove: RequestHandler = async (req, res) => {
  await service.deleteEvent(req.params.id, req);
  await logActivity(req, ACTIVITY_ACTIONS.EVENT_DELETED, { type: 'Event', id: req.params.id });
  res.json({ success: true, message: 'Event deleted.' });
};
export const getOne: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.getEvent(req.params.id) });
export const list: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.listEvents(req.query as any) });
export const ongoing: RequestHandler = async (_req, res) =>
  res.json({ success: true, data: await service.listOngoingEvents() });
