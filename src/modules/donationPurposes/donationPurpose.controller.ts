import { RequestHandler } from 'express';
import * as service from './donationPurpose.service';

export const list: RequestHandler = async (req, res) => {
  res.json({ success: true, data: await service.listPurposes(req.query as any) });
};

export const active: RequestHandler = async (_req, res) => {
  res.json({ success: true, data: await service.listActive() });
};

export const create: RequestHandler = async (req, res) => {
  const doc = await service.createPurpose(req.body, req.user!.id);
  res.status(201).json({ success: true, data: doc });
};

export const update: RequestHandler = async (req, res) => {
  const doc = await service.updatePurpose(req.params.id, req.body, req.user!.id);
  res.json({ success: true, data: doc });
};

export const toggle: RequestHandler = async (req, res) => {
  const doc = await service.toggleStatus(req.params.id, req.user!.id);
  res.json({ success: true, data: doc });
};
