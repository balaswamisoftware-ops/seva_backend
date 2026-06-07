import { RequestHandler } from 'express';
import * as service from './reports.service';

const parseRange = (q: any) => ({
  from: q.from ? new Date(q.from) : undefined,
  to:   q.to   ? new Date(q.to)   : undefined,
});

export const dashboard: RequestHandler = async (_req, res) =>
  res.json({ success: true, data: await service.dashboardSummary() });

export const byEvent: RequestHandler = async (req, res) => {
  const { from, to } = parseRange(req.query);
  res.json({ success: true, data: await service.salesByEvent(from, to) });
};
export const bySeva: RequestHandler = async (req, res) => {
  const { from, to } = parseRange(req.query);
  res.json({ success: true, data: await service.salesBySeva(from, to) });
};
export const byEmployee: RequestHandler = async (req, res) => {
  const { from, to } = parseRange(req.query);
  res.json({ success: true, data: await service.salesByEmployee(from, to) });
};
export const dailyChart: RequestHandler = async (req, res) => {
  const days = Math.min(Math.max(parseInt(String(req.query.days ?? '14')) || 14, 1), 90);
  res.json({ success: true, data: await service.dailySalesChart(days) });
};
export const monthly: RequestHandler = async (req, res) => {
  const year = parseInt(String(req.query.year ?? new Date().getFullYear()));
  const month = parseInt(String(req.query.month ?? new Date().getMonth() + 1));
  res.json({ success: true, data: await service.monthlyReport(year, month) });
};
