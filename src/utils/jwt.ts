import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from './constants';

export interface JwtPayload {
  sub: string;
  employeeId: string;
  role: Role;
}

export const signAccessToken = (p: JwtPayload) =>
  jwt.sign(p, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES } as SignOptions);

export const signRefreshToken = (p: JwtPayload) =>
  jwt.sign(p, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES } as SignOptions);

export const verifyAccess = (t: string) => jwt.verify(t, env.JWT_ACCESS_SECRET) as JwtPayload;
export const verifyRefresh = (t: string) => jwt.verify(t, env.JWT_REFRESH_SECRET) as JwtPayload;
