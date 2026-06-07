import { Ticket } from '../tickets/ticket.model';
import { Donation } from '../donations/donation.model';
import { Employee } from '../employees/employee.model';
import { Event } from '../events/event.model';
import { Seva } from '../sevas/seva.model';

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }

export async function dashboardSummary() {
  const [
    employees, events, sevas, totalTickets,
    todayTickets, monthTickets, totalTicketAgg,
    todayDonations, monthDonations, totalDonationAgg, totalDonationCount,
  ] = await Promise.all([
    Employee.countDocuments({ status: 'ACTIVE' }),
    Event.countDocuments(),
    Seva.countDocuments(),
    Ticket.countDocuments(),
    Ticket.aggregate([
      { $match: { soldAt: { $gte: startOfDay() } } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$totalAmount' }, qty: { $sum: '$quantity' } } },
    ]),
    Ticket.aggregate([
      { $match: { soldAt: { $gte: startOfMonth() } } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
    ]),
    Ticket.aggregate([
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
    ]),
    Donation.aggregate([
      { $match: { soldAt: { $gte: startOfDay() } } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
    Donation.aggregate([
      { $match: { soldAt: { $gte: startOfMonth() } } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
    Donation.aggregate([
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
    Donation.countDocuments(),
  ]);

  return {
    counts: { employees, events, sevas, ticketsSold: totalTickets, donations: totalDonationCount },
    today: {
      tickets:   todayTickets[0] ?? { count: 0, amount: 0, qty: 0 },
      donations: todayDonations[0] ?? { count: 0, amount: 0 },
    },
    month: {
      tickets:   monthTickets[0] ?? { count: 0, amount: 0 },
      donations: monthDonations[0] ?? { count: 0, amount: 0 },
    },
    total: {
      tickets:   totalTicketAgg[0] ?? { count: 0, amount: 0 },
      donations: totalDonationAgg[0] ?? { count: 0, amount: 0 },
    },
  };
}

export async function salesByEvent(from?: Date, to?: Date) {
  const match: any = {};
  if (from || to) match.soldAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  return Ticket.aggregate([
    { $match: match },
    { $group: {
      _id: '$eventId',
      eventName: { $first: '$eventName' },
      tickets: { $sum: 1 },
      quantity: { $sum: '$quantity' },
      collection: { $sum: '$totalAmount' },
    } },
    { $sort: { collection: -1 } },
  ]);
}

export async function salesBySeva(from?: Date, to?: Date) {
  const match: any = {};
  if (from || to) match.soldAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  return Ticket.aggregate([
    { $match: match },
    { $group: {
      _id: '$sevaId',
      sevaName: { $first: '$sevaName' },
      eventName: { $first: '$eventName' },
      tickets: { $sum: 1 },
      quantity: { $sum: '$quantity' },
      collection: { $sum: '$totalAmount' },
    } },
    { $sort: { collection: -1 } },
  ]);
}

export async function salesByEmployee(from?: Date, to?: Date) {
  const match: any = {};
  if (from || to) match.soldAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  return Ticket.aggregate([
    { $match: match },
    { $group: {
      _id: '$soldByEmployeeId',
      employeeName: { $first: '$soldByName' },
      tickets: { $sum: 1 },
      quantity: { $sum: '$quantity' },
      collection: { $sum: '$totalAmount' },
    } },
    { $sort: { collection: -1 } },
  ]);
}

export async function dailySalesChart(days = 14) {
  const since = startOfDay(new Date(Date.now() - (days - 1) * 86400e3));
  // Combine tickets + donations into the same daily series
  const [ticketDaily, donationDaily] = await Promise.all([
    Ticket.aggregate([
      { $match: { soldAt: { $gte: since } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$soldAt' } },
        tickets: { $sum: 1 },
        ticketAmount: { $sum: '$totalAmount' },
      } },
    ]),
    Donation.aggregate([
      { $match: { soldAt: { $gte: since } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$soldAt' } },
        donations: { $sum: 1 },
        donationAmount: { $sum: '$amount' },
      } },
    ]),
  ]);
  // Merge into a unified series
  const merged: Record<string, any> = {};
  for (const t of ticketDaily) merged[t._id] = { _id: t._id, tickets: t.tickets, ticketAmount: t.ticketAmount, donations: 0, donationAmount: 0 };
  for (const d of donationDaily) {
    if (!merged[d._id]) merged[d._id] = { _id: d._id, tickets: 0, ticketAmount: 0, donations: d.donations, donationAmount: d.donationAmount };
    else { merged[d._id].donations = d.donations; merged[d._id].donationAmount = d.donationAmount; }
  }
  return Object.values(merged)
    .map((d: any) => ({ ...d, collection: d.ticketAmount + d.donationAmount }))
    .sort((a: any, b: any) => a._id.localeCompare(b._id));
}

export async function monthlyReport(year: number, month: number) {
  const from = new Date(year, month - 1, 1);
  const to   = new Date(year, month, 1);
  return Ticket.aggregate([
    { $match: { soldAt: { $gte: from, $lt: to } } },
    { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$soldAt' } },
      tickets: { $sum: 1 },
      collection: { $sum: '$totalAmount' },
      paymentBreakdown: { $push: { mode: '$paymentMode', amount: '$totalAmount' } },
    } },
    { $sort: { _id: 1 } },
  ]);
}
