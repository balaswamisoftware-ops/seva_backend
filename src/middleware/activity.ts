import { Request } from 'express';
import { ActivityLog } from '../modules/activity/activity.model';

export async function logActivity(
  req: Request,
  action: string,
  entity?: { type?: string; id?: string },
  metadata?: any,
) {
  try {
    await ActivityLog.create({
      employeeId: req.user?.id,
      action,
      entityType: entity?.type,
      entityId: entity?.id,
      metadata,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  } catch (e) {
    // never block main flow on logging failure
    console.warn('[activity log] failed:', (e as Error).message);
  }
}
