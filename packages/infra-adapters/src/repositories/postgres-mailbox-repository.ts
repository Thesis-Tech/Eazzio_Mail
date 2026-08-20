import { MailboxRepository, Mailbox } from '@eazzio/domain';
import { EazzioDatabase } from '../database/interface.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    if (!UUID_REGEX.test(id)) {
      return null;
    }
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
    if (!UUID_REGEX.test(userId)) {
      return [];
    }
    const rows = await this.db.query<MailboxRow>(
      'SELECT id, owner_user_id, domain_id, address, quota_bytes, used_bytes, created_at FROM mailboxes WHERE owner_user_id = $1 ORDER BY created_at ASC',
      [userId],
    );
    return rows.map((r) => this.mapRowToMailbox(r));
  }

  public async save(mailbox: Mailbox): Promise<void> {
    await this.db.query(
      `INSERT INTO mailboxes (id, owner_user_id, domain_id, address, quota_bytes, used_bytes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        mailbox.id,
        mailbox.ownerUserId,
        mailbox.domainId,
        mailbox.address,
        mailbox.quotaBytes.toString(),
        mailbox.usedBytes.toString(),
        mailbox.createdAt,
      ],
    );
  }

  public async updateQuotaUsage(id: string, usedBytes: bigint): Promise<void> {
    if (!UUID_REGEX.test(id)) return;
    await this.db.query('UPDATE mailboxes SET used_bytes = $2 WHERE id = $1', [
      id,
      usedBytes.toString(),
    ]);
  }
}
