import { RequestHandler } from 'express';
import * as service from './devotee.service';

export const create: RequestHandler = async (req, res) => {
  const devotee = await service.createDevotee(req.body, req);
  res.status(201).json({ success: true, message: `Devotee ${devotee.fullName} created.`, data: devotee });
};

export const update: RequestHandler = async (req, res) => {
  const devotee = await service.updateDevotee(req.params.id, req.body, req);
  res.json({ success: true, message: 'Devotee updated.', data: devotee });
};

export const remove: RequestHandler = async (req, res) => {
  await service.deleteDevotee(req.params.id, req);
  res.json({ success: true, message: 'Devotee deleted.' });
};

export const getOne: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.getDevotee(req.params.id) });

export const lookup: RequestHandler = async (req, res) => {
  const devotee = await service.getDevoteeByPhone(String(req.query.phone ?? ''));
  res.json({ success: true, data: devotee });
};

export const list: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.listDevotees(req.query as any) });
