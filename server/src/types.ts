import type { Request } from 'express';

export type UserRole = 'admin' | 'user';
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}
