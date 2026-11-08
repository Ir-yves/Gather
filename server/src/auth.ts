import type { RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { config, isProduction } from './config.js';
import { db } from './db.js';
import type { AuthRequest, AuthUser, UserRole } from './types.js';
import type { RowDataPacket } from 'mysql2';

const COOKIE_NAME = 'streamline_session';
const TOKEN_TTL = '8h' as const;

export function createSessionToken(user: AuthUser): string {
  return jwt.sign({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }, config.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function setSessionCookie(res: Response, user: AuthUser): void {
  res.cookie(COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    secure: isProduction || config.COOKIE_SECURE === 'true',
    sameSite: config.COOKIE_SAME_SITE,
    path: '/',
    maxAge: 8 * 60 * 60 * 1000
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction || config.COOKIE_SECURE === 'true',
    sameSite: config.COOKIE_SAME_SITE,
    path: '/'
  });
}

export function readSession(token: string | undefined): AuthUser | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    if (typeof payload === 'string' || !isAuthUser(payload)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = getCookieToken(req.get('cookie'));
  const user = readSession(token);
  if (!user) {
    res.status(401).json({ error: 'Please sign in to continue.' });
    return;
  }
  try {
    const [rows] = await db.execute<(RowDataPacket & { is_active: number; role: UserRole })[]>(
      'SELECT is_active, role FROM users WHERE id = ?',
      [user.id]
    );
    if (!rows[0] || !rows[0].is_active) {
      res.status(401).json({ error: 'This account is no longer active.' });
      return;
    }
    user.role = rows[0].role;
    (req as import('./types.js').AuthRequest).user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export function requireRole(role: UserRole): RequestHandler {
  return (req, res, next) => {
    if ((req as AuthRequest).user?.role !== role) {
      res.status(403).json({ error: 'You do not have permission to do that.' });
      return;
    }
    next();
  };
}

export const verifyOrigin: RequestHandler = (req, res, next) => {
  const origin = req.get('origin');
  if (origin && !isAllowedClientOrigin(origin)) {
    res.status(403).json({ error: 'Request origin is not allowed.' });
    return;
  }
  next();
};

function isAuthUser(payload: jwt.JwtPayload): payload is jwt.JwtPayload & AuthUser {
  return typeof payload.id === 'string'
    && typeof payload.name === 'string'
    && typeof payload.email === 'string'
    && (payload.role === 'admin' || payload.role === 'user');
}

export function authenticateSocket(token: string | undefined): AuthUser | null {
  return readSession(token);
}

export function isAllowedClientOrigin(origin: string): boolean {
  if (origin === config.CLIENT_ORIGIN) return true;
  if (config.NODE_ENV !== 'development') return false;

  try {
    const url = new URL(origin);
    return url.protocol === 'http:'
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

export function getCookieToken(header: string | undefined): string | undefined {
  if (!header) return undefined;
  return parseCookie(header)[COOKIE_NAME];
}
