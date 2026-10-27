import jwt from 'jsonwebtoken';
import { identityConfig } from '../config/index.js';

export interface TokenPayload {
  userId: string;
  sessionId: string;
  email: string;
  scopes?: string[];
  type?: 'access' | 'refresh';
}

export class TokenService {
  /**
   * Generates a short-lived access token (15 minutes).
   */
  public static generateAccessToken(payload: Omit<TokenPayload, 'type'>): string {
    return jwt.sign(
      { ...payload, type: 'access' },
      identityConfig.jwtSecret,
      { expiresIn: '15m', algorithm: 'HS256' }
    );
  }

  /**
   * Generates a revocable refresh token.
   */
  public static generateRefreshToken(payload: Omit<TokenPayload, 'type'>): string {
    return jwt.sign(
      { ...payload, type: 'refresh' },
      identityConfig.jwtSecret,
      { expiresIn: '150d', algorithm: 'HS256' } // 5 months (~150 days)
    );
  }

  /**
   * Verifies an access token and ensures it is an 'access' type token and not expired.
   */
  public static verifyAccessToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, identityConfig.jwtSecret, { algorithms: ['HS256'] }) as TokenPayload;
    if (decoded.type && decoded.type !== 'access') {
      throw new Error('INVALID_TOKEN_TYPE');
    }
    return decoded;
  }

  /**
   * Verifies a refresh token.
   */
  public static verifyRefreshToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, identityConfig.jwtSecret, { algorithms: ['HS256'] }) as TokenPayload;
    if (decoded.type !== 'refresh') {
      throw new Error('INVALID_REFRESH_TOKEN_TYPE');
    }
    return decoded;
  }
}
