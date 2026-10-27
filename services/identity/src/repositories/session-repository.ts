import { EazzioDatabase } from '@eazzio/infra-adapters';
import { Session } from '../domain/session-state.js';

export interface SessionRepository {
  create(session: Session): Promise<void>;
  findById(id: string): Promise<Session | null>;
  findByUserId(userId: string): Promise<Session[]>;
  updateLastSeen(id: string, lastSeenAt: Date): Promise<void>;
  updateRefreshTokenHash(id: string, refreshTokenHash: string): Promise<void>;
  revoke(id: string, reason?: string): Promise<void>;
  revokeAllForUser(userId: string, reason?: string): Promise<void>;
  cleanupExpired(): Promise<number>;
}

interface SessionRow {
  id: string;
  user_id: string;
  refresh_token_hash?: string | null;
  device_label: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date | string;
  last_seen_at: Date | string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
  revocation_reason?: string | null;
}

export class PostgresSessionRepository implements SessionRepository {
  constructor(private readonly db: EazzioDatabase) {}

  private mapRowToSession(row: SessionRow): Session {
    return {
      id: row.id,
      userId: row.user_id,
      refreshTokenHash: row.refresh_token_hash ?? null,
      deviceLabel: row.device_label,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: new Date(row.created_at),
      lastSeenAt: new Date(row.last_seen_at),
      expiresAt: new Date(row.expires_at),
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
      revocationReason: row.revocation_reason ?? null,
    };
  }

  public async create(session: Session): Promise<void> {
    await this.db.query(
      `INSERT INTO sessions (id, user_id, refresh_token_hash, device_label, ip_address, user_agent, created_at, last_seen_at, expires_at, revoked_at, revocation_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        session.id,
        session.userId,
        session.refreshTokenHash ?? null,
        session.deviceLabel ?? null,
        session.ipAddress ?? null,
        session.userAgent ?? null,
        session.createdAt,
        session.lastSeenAt,
        session.expiresAt,
        session.revokedAt ?? null,
        session.revocationReason ?? null,
      ],
    );
  }

  public async findById(id: string): Promise<Session | null> {
    const rows = await this.db.query<SessionRow>(
      'SELECT id, user_id, refresh_token_hash, device_label, ip_address, user_agent, created_at, last_seen_at, expires_at, revoked_at, revocation_reason FROM sessions WHERE id = $1',
      [id],
    );
    return rows[0] ? this.mapRowToSession(rows[0]) : null;
  }

  public async findByUserId(userId: string): Promise<Session[]> {
    const rows = await this.db.query<SessionRow>(
      'SELECT id, user_id, refresh_token_hash, device_label, ip_address, user_agent, created_at, last_seen_at, expires_at, revoked_at, revocation_reason FROM sessions WHERE user_id = $1 ORDER BY last_seen_at DESC',
      [userId],
    );
    return rows.map((r) => this.mapRowToSession(r));
  }

  public async updateLastSeen(id: string, lastSeenAt: Date): Promise<void> {
    await this.db.query('UPDATE sessions SET last_seen_at = $2 WHERE id = $1', [id, lastSeenAt]);
  }

  public async updateRefreshTokenHash(id: string, refreshTokenHash: string): Promise<void> {
    await this.db.query('UPDATE sessions SET refresh_token_hash = $2, last_seen_at = now() WHERE id = $1', [id, refreshTokenHash]);
  }

  public async revoke(id: string, reason = 'LOGOUT'): Promise<void> {
    await this.db.query('UPDATE sessions SET revoked_at = now(), revocation_reason = $2 WHERE id = $1', [id, reason]);
  }

  public async revokeAllForUser(userId: string, reason = 'REVOKE_ALL'): Promise<void> {
    await this.db.query(
      'UPDATE sessions SET revoked_at = now(), revocation_reason = $2 WHERE user_id = $1 AND revoked_at IS NULL',
      [userId, reason],
    );
  }

  public async cleanupExpired(): Promise<number> {
    const res = (await this.db.query(
      'DELETE FROM sessions WHERE expires_at < now() - INTERVAL \'30 days\' OR (revoked_at IS NOT NULL AND revoked_at < now() - INTERVAL \'30 days\') RETURNING id',
      []
    )) as any[];
    return res.length;
  }
}
