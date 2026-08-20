import { EazzioDatabase } from '@eazzio/infra-adapters';

export interface MfaRepository {
  saveSecret(userId: string, secret: string, confirmedAt?: Date | null): Promise<void>;
  getSecret(userId: string): Promise<string | null>;
  confirmSecret(userId: string): Promise<void>;
  deleteSecret(userId: string): Promise<void>;
}

interface MfaRow {
  user_id: string;
  secret_encrypted: string;
  confirmed_at: Date | string | null;
}

export class PostgresMfaRepository implements MfaRepository {
  constructor(private readonly db: EazzioDatabase) {}

  public async saveSecret(
    userId: string,
    secret: string,
    confirmedAt: Date | null = null,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO mfa_totp_secrets (user_id, secret_encrypted, confirmed_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         secret_encrypted = EXCLUDED.secret_encrypted,
         confirmed_at = EXCLUDED.confirmed_at`,
      [userId, secret, confirmedAt],
    );
  }

  public async getSecret(userId: string): Promise<string | null> {
    const rows = await this.db.query<MfaRow>(
      'SELECT user_id, secret_encrypted, confirmed_at FROM mfa_totp_secrets WHERE user_id = $1',
      [userId],
    );
    return rows[0] ? rows[0].secret_encrypted : null;
  }

  public async confirmSecret(userId: string): Promise<void> {
    await this.db.query('UPDATE mfa_totp_secrets SET confirmed_at = now() WHERE user_id = $1', [
      userId,
    ]);
  }

  public async deleteSecret(userId: string): Promise<void> {
    await this.db.query('DELETE FROM mfa_totp_secrets WHERE user_id = $1', [userId]);
  }
}
