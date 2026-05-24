import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { sendError } from '../utils/response';

// Centralized error handler — Express recognises this by its 4-argument
// signature (err, req, res, next). Both sync throws and async rejections
// forwarded via next(err) land here, keeping controllers clean.
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[ErrorHandler]', err.message);

  // Avoid leaking internal stack traces in production
  const detail = process.env.NODE_ENV !== 'production' ? err.message : undefined;
  sendError(res, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR, detail);
}

// 404 handler — catches any request that didn't match a registered route.
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, StatusCodes.NOT_FOUND);
}
