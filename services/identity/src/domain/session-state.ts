export type SessionState = 'active' | 'revoked';

export const FIVE_MONTHS_MS = 5 * 30.4375 * 24 * 60 * 60 * 1000; // ~5 months in ms (13,149,000,000 ms)

export interface Session {
  id: string;
  userId: string;
  refreshTokenHash?: string | null;
  deviceLabel?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
  revocationReason?: string | null;
}

export class SessionManager {
  public static isActive(session: Session): boolean {
    if (session.revokedAt) return false;
    return session.expiresAt.getTime() > Date.now();
  }

  public static revoke(session: Session, reason?: string): Session {
    return {
      ...session,
      revokedAt: new Date(),
      revocationReason: reason || 'LOGOUT',
    };
  }
}
