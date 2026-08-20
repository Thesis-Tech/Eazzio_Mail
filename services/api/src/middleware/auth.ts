import { Request, Response, NextFunction } from 'express';
import { TokenService, TokenPayload } from '@eazzio/identity';
import { AppError } from './error-handler.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
  }

  const token = authHeader.split(' ')[1]!;
  try {
    const payload = TokenService.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    throw new AppError('AUTH_REQUIRED', 'Invalid or expired session token', 401);
  }
}
