import { UserRepository, User } from '@eazzio/domain';
import { EazzioDatabase } from '../database/interface.js';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  status: 'active' | 'suspended' | 'deleted';
  mfa_enabled: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly db: EazzioDatabase) {}

  private mapRowToUser(row: UserRow): User {
    return new User({
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      displayName: row.display_name,
      status: row.status,
      mfaEnabled: row.mfa_enabled,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  public async findById(id: string): Promise<User | null> {
    const rows = await this.db.query<UserRow>(
      'SELECT id, email, password_hash, display_name, status, mfa_enabled, created_at, updated_at FROM users WHERE id = $1',
      [id],
    );
    return rows[0] ? this.mapRowToUser(rows[0]) : null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db.query<UserRow>(
      'SELECT id, email, password_hash, display_name, status, mfa_enabled, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1)',
      [email],
    );
    return rows[0] ? this.mapRowToUser(rows[0]) : null;
  }

  public async save(user: User): Promise<void> {
    await this.db.query(
      `INSERT INTO users (id, email, password_hash, display_name, status, mfa_enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         display_name = EXCLUDED.display_name,
         status = EXCLUDED.status,
         mfa_enabled = EXCLUDED.mfa_enabled,
         updated_at = EXCLUDED.updated_at`,
      [
        user.id,
        user.email,
        user.passwordHash,
        user.displayName ?? null,
        user.status,
        user.mfaEnabled,
        user.createdAt,
        user.updatedAt,
      ],
    );
  }

  public async update(user: User): Promise<void> {
    await this.db.query(
      `UPDATE users SET
         email = $2,
         password_hash = $3,
         display_name = $4,
         status = $5,
         mfa_enabled = $6,
         updated_at = $7
       WHERE id = $1`,
      [
        user.id,
        user.email,
        user.passwordHash,
        user.displayName ?? null,
        user.status,
        user.mfaEnabled,
        user.updatedAt,
      ],
    );
  }
}
