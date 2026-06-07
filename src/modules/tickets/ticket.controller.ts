import { RequestHandler } from 'express';
import * as service from './ticket.service';
import { buildReceiptPayload, renderReceiptText } from '../printing/receipt.builder';
import { logActivity } from '../../middleware/activity';
import { ACTIVITY_ACTIONS } from '../../utils/constants';

export const sell: RequestHandler = async (req, res) => {
  const ticket = await service.sellTicket({ ...req.body, soldByEmployeeId: req.user!.id });
  await logActivity(req, ACTIVITY_ACTIONS.TICKET_SOLD, { type: 'Ticket', id: ticket._id.toString() }, {
    receiptNumber: ticket.receiptNumber, total: ticket.totalAmount,
  });
  const receiptPayload = await buildReceiptPayload(ticket);
  res.status(201).json({ success: true, data: { ticket, receipt: receiptPayload } });
};

export const getOne: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.getTicket(req.params.id) });

export const list: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.listTickets(req.query as any) });

export const getReceipt: RequestHandler = async (req, res) => {
  const ticket = await service.getTicket(req.params.id);
  const payload = await buildReceiptPayload(ticket);
  res.json({ success: true, data: payload });
};

export const getReceiptText: RequestHandler = async (req, res) => {
  const ticket = await service.getTicket(req.params.id);
  const payload = await buildReceiptPayload(ticket);
  const text = renderReceiptText(payload);
  res.type('text/plain').send(text);
};

export const markPrinted: RequestHandler = async (req, res) => {
  const t = await service.markPrinted(req.params.id);
  await logActivity(req, ACTIVITY_ACTIONS.RECEIPT_PRINTED, { type: 'Ticket', id: req.params.id });
  res.json({ success: true, data: t });
};
