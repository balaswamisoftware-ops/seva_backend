import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Employee } from '../employees/employee.model';
import { RefreshToken } from './refreshToken.model';
import { signAccessToken, signRefreshToken, verifyRefresh } from '../../utils/jwt';
import { Unauthorized } from '../../utils/errors';
import { env } from '../../config/env';
import { pinLookupHash } from '../../utils/pin';

const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex');

function refreshExpiry(): Date {
  // parse "7d" / "15m" etc.
  const m = /^(\d+)([smhd])$/.exec(env.JWT_REFRESH_EXPIRES);
  if (!m) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const n = parseInt(m[1], 10);
  const mult = { s: 1e3, m: 60e3, h: 3.6e6, d: 86.4e6 }[m[2] as 's' | 'm' | 'h' | 'd'];
  return new Date(Date.now() + n * mult);
}

export async function login(pin: string) {
  const employee = await Employee.findOne({ pinLookup: pinLookupHash(pin) });
  if (!employee) throw Unauthorized('Invalid PIN');
  if (employee.status !== 'ACTIVE') throw Unauthorized('Account is inactive');

  const ok = await bcrypt.compare(pin, employee.pinHash);
  if (!ok) throw Unauthorized('Invalid PIN');

  const payload = { sub: employee._id.toString(), employeeId: employee.employeeId, role: employee.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await RefreshToken.create({
    tokenHash: hashToken(refreshToken),
    employeeId: employee._id,
    expiresAt: refreshExpiry(),
  });

  employee.lastLoginAt = new Date();
  await employee.save();

  return {
    accessToken,
    refreshToken,
    employee: {
      id: employee._id,
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role,
      mobileNumber: employee.mobileNumber,
      email: employee.email,
    },
  };
}

export async function refresh(refreshToken: string) {
  let payload;
  try { payload = verifyRefresh(refreshToken); } catch { throw Unauthorized('Invalid refresh token'); }

  const stored = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken) });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) throw Unauthorized('Refresh token expired');

  // rotate
  stored.revoked = true;
  await stored.save();

  const employee = await Employee.findById(payload.sub);
  if (!employee || employee.status !== 'ACTIVE') throw Unauthorized('Account inactive');

  const newPayload = { sub: employee._id.toString(), employeeId: employee.employeeId, role: employee.role };
  const accessToken = signAccessToken(newPayload);
  const newRefresh = signRefreshToken(newPayload);
  await RefreshToken.create({
    tokenHash: hashToken(newRefresh),
    employeeId: employee._id,
    expiresAt: refreshExpiry(),
  });
  return { accessToken, refreshToken: newRefresh };
}

export async function logout(refreshToken: string) {
  await RefreshToken.updateOne({ tokenHash: hashToken(refreshToken) }, { revoked: true });
}
