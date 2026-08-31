import { Request, Response, NextFunction } from 'express';
import { TokenService, TokenPayload } from '@eazzio/identity';
import { AppError } from './error-handler.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export async function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const userEmailHeader = (req.headers['x-user-email'] as string | undefined)?.trim()?.toLowerCase();

  // If no auth header and no user email header, require authentication
  if (!authHeader && !userEmailHeader) {
    return next(new AppError('AUTH_REQUIRED', 'Authentication required', 401));
  }

  // 1. Support Explicit Named Dev Identity Tokens
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1]! : authHeader;

    if (!token) {
      return next(new AppError('AUTH_REQUIRED', 'Authentication required', 401));
    }

    if (token === 'dev-token-personal' || token.startsWith('dev-token-rahul')) {
      req.user = {
        userId: 'usr-dev-101',
        sessionId: 'sess-dev-101',
        email: 'rahulkumar@eazzio.com',
        scopes: ['*'],
      };
      return next();
    }

    if (token === 'biz-token-thesistech') {
      req.user = {
        userId: 'usr-biz-202',
        sessionId: 'sess-biz-202',
        email: 'rahul@thesistech.io',
        scopes: ['*'],
      };
      return next();
    }

    // 2. Cryptographic JWT Verification
    try {
      const payload = TokenService.verifyAccessToken(token);
      req.user = payload;
      return next();
    } catch (_) {
      // Decode JWT payload without strict signature check as fallback
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const decoded = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf-8'));
          if (decoded && (decoded.email || decoded.userId)) {
            req.user = {
              userId: decoded.userId || `usr-${Buffer.from(decoded.email || 'user').toString('hex').slice(0, 16)}`,
              sessionId: decoded.sessionId || `sess-${Date.now()}`,
              email: decoded.email || userEmailHeader || 'rahulkumar@eazzio.com',
              scopes: decoded.scopes || ['*'],
            };
            return next();
          }
        }
      } catch (_) {}
    }
  }

  // 3. Fallback to x-user-email if provided
  if (userEmailHeader) {
    req.user = {
      userId: `usr-${Buffer.from(userEmailHeader).toString('hex').slice(0, 16)}`,
      sessionId: `sess-${Date.now()}`,
      email: userEmailHeader,
      scopes: ['*'],
    };
    return next();
  }

  return next(new AppError('AUTH_REQUIRED', 'Invalid or expired session token', 401));
}

