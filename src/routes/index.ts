import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import employeeRoutes from '../modules/employees/employee.routes';
import eventRoutes from '../modules/events/event.routes';
import sevaRoutes from '../modules/sevas/seva.routes';
import ticketRoutes from '../modules/tickets/ticket.routes';
import reportsRoutes from '../modules/reports/reports.routes';
import orgRoutes from '../modules/org/org.routes';
import activityRoutes from '../modules/activity/activity.routes';
import donationRoutes from '../modules/donations/donation.routes';
import donationPurposeRoutes from '../modules/donationPurposes/donationPurpose.routes';
import syncRoutes from '../modules/sync/sync.routes';
import printerRoutes from '../modules/printers/printer.routes';
import devoteeRoutes from '../modules/devotees/devotee.routes';
import participationRoutes from '../modules/participations/participation.routes';
import auditRoutes from '../modules/audit/audit.routes';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

router.use('/auth',       authRoutes);
router.use('/employees',  employeeRoutes);
router.use('/events',     eventRoutes);
router.use('/sevas',      sevaRoutes);
router.use('/tickets',    ticketRoutes);
router.use('/reports',    reportsRoutes);
router.use('/org',        orgRoutes);
router.use('/activity',   activityRoutes);
router.use('/donations',  donationRoutes);
router.use('/donation-purposes', donationPurposeRoutes);
router.use('/sync',       syncRoutes);
router.use('/printers',   printerRoutes);
router.use('/devotees',   devoteeRoutes);
router.use('/participations', participationRoutes);
router.use('/audit',      auditRoutes);

export default router;
