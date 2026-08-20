import { EazzioDatabase } from '@eazzio/infra-adapters';
import { Session } from '../domain/session-state.js';

export interface SessionRepository {
  create(session: Session): Promise<void>;
  findById(id: string): Promise<Session | null>;
  findByUserId(userId: string): Promise<Session[]>;
  updateLastSeen(id: string, lastSeenAt: Date): Promise<void>;
  revoke(id: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}

interface SessionRow {
  id: string;
  user_id: string;
  device_label: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date | string;
  last_seen_at: Date | string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
}

export class PostgresSessionRepository implements SessionRepository {
  constructor(private readonly db: EazzioDatabase) {}

  private mapRowToSession(row: SessionRow): Session {
    return {
      id: row.id,
      userId: row.user_id,
      deviceLabel: row.device_label,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: new Date(row.created_at),
      lastSeenAt: new Date(row.last_seen_at),
      expiresAt: new Date(row.expires_at),
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    };
  }

  public async create(session: Session): Promise<void> {
    await this.db.query(
      `INSERT INTO sessions (id, user_id, device_label, ip_address, user_agent, created_at, last_seen_at, expires_at, revoked_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        session.id,
        session.userId,
        session.deviceLabel ?? null,
        session.ipAddress ?? null,
        session.userAgent ?? null,
        session.createdAt,
        session.lastSeenAt,
        session.expiresAt,
        session.revokedAt ?? null,
      ],
    );
  }

  public async findById(id: string): Promise<Session | null> {
    const rows = await this.db.query<SessionRow>(
      'SELECT id, user_id, device_label, ip_address, user_agent, created_at, last_seen_at, expires_at, revoked_at FROM sessions WHERE id = $1',
      [id],
    );
    return rows[0] ? this.mapRowToSession(rows[0]) : null;
  }

  public async findByUserId(userId: string): Promise<Session[]> {
    const rows = await this.db.query<SessionRow>(
      'SELECT id, user_id, device_label, ip_address, user_agent, created_at, last_seen_at, expires_at, revoked_at FROM sessions WHERE user_id = $1 ORDER BY last_seen_at DESC',
      [userId],
    );
    return rows.map((r) => this.mapRowToSession(r));
  }

  public async updateLastSeen(id: string, lastSeenAt: Date): Promise<void> {
    await this.db.query('UPDATE sessions SET last_seen_at = $2 WHERE id = $1', [id, lastSeenAt]);
  }

  public async revoke(id: string): Promise<void> {
    await this.db.query('UPDATE sessions SET revoked_at = now() WHERE id = $1', [id]);
  }

  public async revokeAllForUser(userId: string): Promise<void> {
    await this.db.query(
      'UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId],
    );
  }
}
