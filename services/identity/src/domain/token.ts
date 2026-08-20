import jwt from 'jsonwebtoken';
import { identityConfig } from '../config/index.js';

export interface TokenPayload {
  userId: string;
  sessionId: string;
  email: string;
  scopes?: string[];
}

export class TokenService {
  public static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, identityConfig.jwtSecret, {
      expiresIn: '15m'
    });
  }

  public static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, identityConfig.jwtSecret) as TokenPayload;
  }
}
