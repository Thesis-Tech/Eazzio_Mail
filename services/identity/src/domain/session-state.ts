export type SessionState = 'active' | 'revoked';

export interface Session {
  id: string;
  userId: string;
  deviceLabel?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
}

export class SessionManager {
  public static isActive(session: Session): boolean {
    if (session.revokedAt) return false;
    return session.expiresAt.getTime() > Date.now();
  }

  public static revoke(session: Session): Session {
    return {
      ...session,
      revokedAt: new Date(),
    };
  }
}
