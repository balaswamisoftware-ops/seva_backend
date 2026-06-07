import { RequestHandler } from 'express';
import * as service from './printer.service';

export const list: RequestHandler = async (_req, res) =>
  res.json({ success: true, data: await service.listPrinters() });

export const getOne: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.getPrinter(req.params.id as string) });

export const create: RequestHandler = async (req, res) =>
  res.status(201).json({ success: true, data: await service.createPrinter(req.body, req.user!.id) });

export const update: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.updatePrinter(req.params.id as string, req.body, req.user!.id) });

export const remove: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.deletePrinter(req.params.id as string) });

export const print: RequestHandler = async (req, res) => {
  const { ticketId, printerId } = req.body as { ticketId: string; printerId?: string };
  const result = await service.printTicket(ticketId, printerId);
  res.json({ success: true, data: result });
};

export const test: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.testPrint(req.params.id as string) });
