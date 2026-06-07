import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as ticketService from '../tickets/ticket.service';
import * as donationService from '../donations/donation.service';
import { logActivity } from '../../middleware/activity';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const offlineSaleSchema = z.object({
  sales: z.array(z.object({
    clientId: z.string().uuid(),
    type: z.enum(['SEVA', 'DONATION']),
    timestamp: z.coerce.date(),
    payload: z.record(z.any()), // already-validated client-side
  })).max(100),
});

/**
 * Bulk-sync offline-queued sales/donations.
 * Each entry has a clientId (UUIDv4) for idempotency — same clientId twice = no duplicate.
 * Returns per-item result so the client can mark synced/failed in IndexedDB.
 */
const router = Router();
router.use(authenticate);

router.post('/sync', validate(offlineSaleSchema), asyncHandler(async (req, res) => {
  const { sales } = req.body as { sales: Array<{ clientId: string; type: 'SEVA' | 'DONATION'; timestamp: Date; payload: any }> };
  const results: any[] = [];

  for (const sale of sales) {
    try {
      if (sale.type === 'SEVA') {
        // Tickets are inventory-critical — pass-through to the transactional service
        const ticket = await ticketService.sellTicket({
          ...sale.payload,
          soldByEmployeeId: req.user!.id,
          clientId: sale.clientId,         // extended below
          soldAt: sale.timestamp,
        } as any);
        results.push({ clientId: sale.clientId, status: 'synced', id: ticket._id, receiptNumber: ticket.receiptNumber });
      } else {
        const donation = await donationService.createDonation({
          ...sale.payload,
          soldByEmployeeId: req.user!.id,
          clientId: sale.clientId,
          soldAt: sale.timestamp,
        });
        results.push({ clientId: sale.clientId, status: 'synced', id: donation._id, receiptNumber: donation.receiptNumber });
      }
    } catch (e: any) {
      // Failed item — client should retry later or surface to user
      results.push({
        clientId: sale.clientId,
        status: 'failed',
        error: e?.message ?? 'Unknown error',
        code: e?.code ?? 'SYNC_FAILED',
        retryable: !['VALIDATION_ERROR', 'NOT_FOUND'].includes(e?.code),
      });
    }
  }

  await logActivity(req, 'OFFLINE_SYNC', undefined, {
    total: sales.length,
    synced: results.filter((r) => r.status === 'synced').length,
    failed: results.filter((r) => r.status === 'failed').length,
  });

  res.json({ success: true, data: { results } });
}));

/**
 * Bootstrap data needed for offline operation:
 * - Active employees (for PIN verification offline) — only hashed PINs
 * - Ongoing events + their active sevas (with available counts)
 * - Org settings (receipt template)
 * Frontend stores this in IndexedDB at login + refreshes periodically.
 */
router.get('/bootstrap', asyncHandler(async (req, res) => {
  const { Employee } = await import('../employees/employee.model');
  const { Event } = await import('../events/event.model');
  const { Seva } = await import('../sevas/seva.model');
  const { OrgSettings } = await import('../org/orgSettings.model');

  const [employees, events, orgSettings] = await Promise.all([
    Employee.find({ status: 'ACTIVE' }).select('employeeId firstName lastName mobileNumber email role pinHash'),
    Event.find({ status: { $in: ['ONGOING', 'UPCOMING'] } }),
    OrgSettings.findOne(),
  ]);

  const eventIds = events.map(e => e._id);
  const sevas = await Seva.find({ eventId: { $in: eventIds }, status: 'ACTIVE' });

  res.json({
    success: true,
    data: {
      employees: employees.map(e => ({
        _id: e._id, employeeId: e.employeeId,
        firstName: e.firstName, lastName: e.lastName,
        mobileNumber: e.mobileNumber, email: e.email, role: e.role,
        pinHash: e.pinHash,  // bcrypt hash — safe to send to authenticated client
      })),
      events,
      sevas,
      orgSettings,
      generatedAt: new Date(),
    },
  });
}));

export default router;
