import { RequestHandler } from 'express';
import * as service from './audit.service';

export const list: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.listAudit(req.query as any) });

export const rollback: RequestHandler = async (req, res) => {
  const result = await service.rollback(req.params.id, req);
  res.json({ success: true, message: result.message, data: result });
};
