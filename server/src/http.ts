import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import type { AuthRequest } from './types.js';

type AsyncRoute = (req: AuthRequest, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(handler: AsyncRoute): RequestHandler {
  return (req, res, next) => {
    void handler(req as AuthRequest, res, next).catch(next);
  };
}

export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  return schema.parse(body);
}
