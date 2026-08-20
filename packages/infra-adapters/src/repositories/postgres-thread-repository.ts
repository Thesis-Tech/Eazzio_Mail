import { ThreadRepository, Thread } from '@eazzio/domain';
import { EazzioDatabase } from '../database/interface.js';

interface ThreadRow {
  id: string;
  mailbox_id: string;
  subject_normalized: string | null;
  last_message_at: Date | string;
  message_count: number;
}

export class PostgresThreadRepository implements ThreadRepository {
  constructor(private readonly db: EazzioDatabase) {}

  private mapRowToThread(row: ThreadRow): Thread {
    return new Thread({
      id: row.id,
      mailboxId: row.mailbox_id,
      subjectNormalized: row.subject_normalized,
      lastMessageAt: new Date(row.last_message_at),
      messageCount: Number(row.message_count),
    });
  }

  public async findById(id: string): Promise<Thread | null> {
    const rows = await this.db.query<ThreadRow>(
      'SELECT id, mailbox_id, subject_normalized, last_message_at, message_count FROM threads WHERE id = $1',
      [id],
    );
    return rows[0] ? this.mapRowToThread(rows[0]) : null;
  }

  public async findByNormalizedSubject(
    mailboxId: string,
    subjectNormalized: string,
  ): Promise<Thread | null> {
    const rows = await this.db.query<ThreadRow>(
      'SELECT id, mailbox_id, subject_normalized, last_message_at, message_count FROM threads WHERE mailbox_id = $1 AND subject_normalized = $2',
      [mailboxId, subjectNormalized],
    );
    return rows[0] ? this.mapRowToThread(rows[0]) : null;
  }

  public async save(thread: Thread): Promise<void> {
    await this.db.query(
      `INSERT INTO threads (id, mailbox_id, subject_normalized, last_message_at, message_count)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         subject_normalized = EXCLUDED.subject_normalized,
         last_message_at = EXCLUDED.last_message_at,
         message_count = EXCLUDED.message_count`,
      [
        thread.id,
        thread.mailboxId,
        thread.subjectNormalized ?? null,
        thread.lastMessageAt,
        thread.messageCount,
      ],
    );
  }

  public async updateLastMessage(
    threadId: string,
    lastMessageAt: Date,
    messageCount: number,
  ): Promise<void> {
    await this.db.query(
      'UPDATE threads SET last_message_at = $2, message_count = $3 WHERE id = $1',
      [threadId, lastMessageAt, messageCount],
    );
  }
}
