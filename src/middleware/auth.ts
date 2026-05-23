import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { sendError } from '../utils/response';

// Extend Request locally to carry the decoded JWT payload
interface AuthRequest extends Request {
  user?: TokenPayload;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    sendError(res, 'Access denied. No token provided.', StatusCodes.UNAUTHORIZED);
    return;
  }

  try {
    const token = authHeader.trim();
    req.user = verifyToken(token);
    next();
  } catch {
    sendError(res, 'Invalid or expired token.', StatusCodes.UNAUTHORIZED);
  }
}

export function requireRole(...roles: Array<'contributor' | 'maintainer'>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      sendError(res, 'Forbidden. Insufficient permissions.', StatusCodes.FORBIDDEN);
      return;
    }
    next();
  };
}