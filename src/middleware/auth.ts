import { Request, Response, NextFunction } from 'express';
import { verifyAccess } from '../utils/jwt';
import { Forbidden, Unauthorized } from '../utils/errors';
import { Role } from '../utils/constants';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; employeeId: string; role: Role };
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(Unauthorized('Missing token'));
  try {
    const payload = verifyAccess(header.slice(7));
    req.user = { id: payload.sub, employeeId: payload.employeeId, role: payload.role };
    next();
  } catch {
    next(Unauthorized('Invalid or expired token'));
  }
}

export const authorize =
  (...allowed: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Unauthorized());
    if (!allowed.includes(req.user.role)) return next(Forbidden('Insufficient permissions'));
    next();
  };
