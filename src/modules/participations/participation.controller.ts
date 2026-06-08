import { RequestHandler } from 'express';
import * as service from './participation.service';

export const create: RequestHandler = async (req, res) => {
  const result = await service.createParticipation(req.body, req);
  res.status(201).json({ success: true, message: result.message, data: result.participation, devoteeCreated: result.devoteeCreated });
};

export const remove: RequestHandler = async (req, res) => {
  await service.deleteParticipation(req.params.id, req);
  res.json({ success: true, message: 'Participation removed.' });
};

export const getOne: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.getParticipation(req.params.id) });

export const list: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.listParticipations(req.query as any) });
