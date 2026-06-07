import { RequestHandler } from 'express';
import * as service from './donation.service';
import { buildDonationReceipt, render80GCertificate } from '../printing/donation.receipt';
import { logActivity } from '../../middleware/activity';

export const create: RequestHandler = async (req, res) => {
  const donation = await service.createDonation({ ...req.body, soldByEmployeeId: req.user!.id });
  await logActivity(req, 'DONATION_RECEIVED', { type: 'Donation', id: donation._id.toString() }, {
    receiptNumber: donation.receiptNumber, amount: donation.amount,
  });
  const receipt = await buildDonationReceipt(donation);
  res.status(201).json({ success: true, data: { donation, receipt } });
};

export const list: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.listDonations(req.query as any) });

export const getOne: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.getDonation(req.params.id) });

export const getReceipt: RequestHandler = async (req, res) => {
  const donation = await service.getDonation(req.params.id);
  const receipt = await buildDonationReceipt(donation);
  res.json({ success: true, data: receipt });
};

export const issue80G: RequestHandler = async (req, res) => {
  const donation = await service.issue80GCertificate(req.params.id);
  await logActivity(req, '80G_CERT_ISSUED', { type: 'Donation', id: donation._id.toString() });
  res.json({ success: true, data: donation });
};

export const get80GCert: RequestHandler = async (req, res) => {
  const donation = await service.getDonation(req.params.id);
  const cert = await render80GCertificate(donation);
  res.json({ success: true, data: cert });
};

export const markPrinted: RequestHandler = async (req, res) =>
  res.json({ success: true, data: await service.markPrinted(req.params.id) });

export const stats: RequestHandler = async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to   = req.query.to   ? new Date(String(req.query.to))   : undefined;
  res.json({ success: true, data: await service.donationStats(from, to) });
};
