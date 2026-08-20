import { MailboxRepository, Mailbox } from '@eazzio/domain';
import { EazzioDatabase } from '../database/interface.js';

interface MailboxRow {
  id: string;
  owner_user_id: string;
  domain_id: string | null;
  address: string;
  quota_bytes: string | number | bigint;
  used_bytes: string | number | bigint;
  created_at: Date | string;
}

export class PostgresMailboxRepository implements MailboxRepository {
  constructor(private readonly db: EazzioDatabase) {}

  private mapRowToMailbox(row: MailboxRow): Mailbox {
    return new Mailbox({
      id: row.id,
      ownerUserId: row.owner_user_id,
      domainId: row.domain_id,
      address: row.address,
      quotaBytes: BigInt(row.quota_bytes),
      usedBytes: BigInt(row.used_bytes),
      createdAt: new Date(row.created_at),
    });
  }

  public async findById(id: string): Promise<Mailbox | null> {
    const rows = await this.db.query<MailboxRow>(
      'SELECT id, owner_user_id, domain_id, address, quota_bytes, used_bytes, created_at FROM mailboxes WHERE id = $1',
      [id],
    );
    return rows[0] ? this.mapRowToMailbox(rows[0]) : null;
  }

  public async findByAddress(address: string): Promise<Mailbox | null> {
    const rows = await this.db.query<MailboxRow>(
      'SELECT id, owner_user_id, domain_id, address, quota_bytes, used_bytes, created_at FROM mailboxes WHERE LOWER(address) = LOWER($1)',
      [address],
    );
    return rows[0] ? this.mapRowToMailbox(rows[0]) : null;
  }

  public async findByOwnerId(userId: string): Promise<Mailbox[]> {
    const rows = await this.db.query<MailboxRow>(
      'SELECT id, owner_user_id, domain_id, address, quota_bytes, used_bytes, created_at FROM mailboxes WHERE owner_user_id = $1 ORDER BY created_at ASC',
      [userId],
    );
    return rows.map((row) => this.mapRowToMailbox(row));
  }

  public async save(mailbox: Mailbox): Promise<void> {
    await this.db.query(
      `INSERT INTO mailboxes (id, owner_user_id, domain_id, address, quota_bytes, used_bytes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         owner_user_id = EXCLUDED.owner_user_id,
         domain_id = EXCLUDED.domain_id,
         address = EXCLUDED.address,
         quota_bytes = EXCLUDED.quota_bytes,
         used_bytes = EXCLUDED.used_bytes`,
      [
        mailbox.id,
        mailbox.ownerUserId,
        mailbox.domainId ?? null,
        mailbox.address,
        mailbox.quotaBytes.toString(),
        mailbox.usedBytes.toString(),
        mailbox.createdAt,
      ],
    );
  }

  public async updateQuotaUsage(mailboxId: string, usedBytes: bigint): Promise<void> {
    await this.db.query('UPDATE mailboxes SET used_bytes = $2 WHERE id = $1', [
      mailboxId,
      usedBytes.toString(),
    ]);
  }
}
