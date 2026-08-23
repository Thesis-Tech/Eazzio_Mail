import { MessageRepository, Message } from '@eazzio/domain';
import { EazzioDatabase } from '../database/interface.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MessageRow {
  id: string;
  mailbox_id: string;
  folder_id: string;
  thread_id: string | null;
  message_id_header: string;
  in_reply_to: string | null;
  references_header: string | null;
  from_address: string;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  body_html: string | null;
  size_bytes: number;
  raw_object_key: string;
  is_read: boolean;
  is_starred: boolean;
  is_important: boolean;
  spam_score: number | null;
  auth_results: Record<string, unknown> | null;
  direction: 'inbound' | 'outbound';
  delivery_state: 'queued' | 'sending' | 'delivered' | 'retrying' | 'bounced' | null;
  received_at: Date | string;
}

export class PostgresMessageRepository implements MessageRepository {
  constructor(private readonly db: EazzioDatabase) {}

  private mapRowToMessage(row: MessageRow): Message {
    return new Message({
      id: row.id,
      mailboxId: row.mailbox_id,
      folderId: row.folder_id,
      threadId: row.thread_id,
      messageIdHeader: row.message_id_header,
      inReplyTo: row.in_reply_to,
      referencesHeader: row.references_header,
      fromAddress: row.from_address,
      subject: row.subject,
      snippet: row.snippet,
      bodyText: row.body_text,
      bodyHtml: row.body_html,
      sizeBytes: Number(row.size_bytes),
      rawObjectKey: row.raw_object_key,
      isRead: Boolean(row.is_read),
      isStarred: Boolean(row.is_starred),
      isImportant: Boolean(row.is_important),
      spamScore: row.spam_score !== null ? Number(row.spam_score) : null,
      authResults: row.auth_results,
      direction: row.direction,
      deliveryState: row.delivery_state,
      receivedAt: new Date(row.received_at),
    });
  }

  public async findById(id: string): Promise<Message | null> {
    if (!UUID_REGEX.test(id)) return null;
    const rows = await this.db.query<MessageRow>(
      `SELECT id, mailbox_id, folder_id, thread_id, message_id_header, in_reply_to,
              references_header, from_address, subject, snippet, body_text, body_html, size_bytes, raw_object_key,
              is_read, is_starred, is_important, spam_score, auth_results, direction,
              delivery_state, received_at
       FROM messages
       WHERE id = $1`,
      [id],
    );
    return rows[0] ? this.mapRowToMessage(rows[0]) : null;
  }

  public async findByMailboxId(
    mailboxId: string,
    folderId?: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<Message[]> {
    if (!UUID_REGEX.test(mailboxId)) return [];
    let sql = `
      SELECT id, mailbox_id, folder_id, thread_id, message_id_header, in_reply_to,
             references_header, from_address, subject, snippet, body_text, body_html, size_bytes, raw_object_key,
             is_read, is_starred, is_important, spam_score, auth_results, direction,
             delivery_state, received_at
      FROM messages
      WHERE mailbox_id = $1
    `;
    const params: unknown[] = [mailboxId];

    if (folderId && UUID_REGEX.test(folderId)) {
      params.push(folderId);
      sql += ` AND folder_id = $${params.length}`;
    }

    if (cursor) {
      params.push(new Date(cursor));
      sql += ` AND received_at < $${params.length}`;
    }

    params.push(limit);
    sql += ` ORDER BY received_at DESC LIMIT $${params.length}`;

    const rows = await this.db.query<MessageRow>(sql, params);
    return rows.map((row) => this.mapRowToMessage(row));
  }

  public async findByMessageIdHeader(
    mailboxId: string,
    messageIdHeader: string,
  ): Promise<Message | null> {
    if (!UUID_REGEX.test(mailboxId)) return null;
    const rows = await this.db.query<MessageRow>(
      `SELECT id, mailbox_id, folder_id, thread_id, message_id_header, in_reply_to,
              references_header, from_address, subject, snippet, body_text, body_html, size_bytes, raw_object_key,
              is_read, is_starred, is_important, spam_score, auth_results, direction,
              delivery_state, received_at
       FROM messages
       WHERE mailbox_id = $1 AND message_id_header = $2`,
      [mailboxId, messageIdHeader],
    );
    return rows[0] ? this.mapRowToMessage(rows[0]) : null;
  }

  public async save(message: Message): Promise<void> {
    await this.db.query(
      `INSERT INTO messages (
         id, mailbox_id, folder_id, thread_id, message_id_header, in_reply_to,
         references_header, from_address, subject, snippet, body_text, body_html, size_bytes, raw_object_key,
         is_read, is_starred, is_important, spam_score, auth_results, direction,
         delivery_state, received_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
       ) ON CONFLICT (id) DO UPDATE SET
         folder_id = EXCLUDED.folder_id,
         thread_id = EXCLUDED.thread_id,
         in_reply_to = EXCLUDED.in_reply_to,
         references_header = EXCLUDED.references_header,
         subject = EXCLUDED.subject,
         snippet = EXCLUDED.snippet,
         body_text = EXCLUDED.body_text,
         body_html = EXCLUDED.body_html,
         is_read = EXCLUDED.is_read,
         is_starred = EXCLUDED.is_starred,
         is_important = EXCLUDED.is_important,
         spam_score = EXCLUDED.spam_score,
         auth_results = EXCLUDED.auth_results,
         delivery_state = EXCLUDED.delivery_state`,
      [
        message.id,
        message.mailboxId,
        message.folderId,
        message.threadId ?? null,
        message.messageIdHeader,
        message.inReplyTo ?? null,
        message.referencesHeader ?? null,
        message.fromAddress,
        message.subject ?? null,
        message.snippet ?? null,
        message.bodyText ?? '',
        message.bodyHtml ?? null,
        message.sizeBytes,
        message.rawObjectKey,
        message.isRead,
        message.isStarred,
        message.isImportant,
        message.spamScore ?? null,
        message.authResults ? JSON.stringify(message.authResults) : null,
        message.direction,
        message.deliveryState ?? null,
        message.receivedAt,
      ],
    );
  }

  public async updateFolder(messageId: string, folderId: string): Promise<void> {
    if (!UUID_REGEX.test(messageId) || !UUID_REGEX.test(folderId)) return;
    await this.db.query('UPDATE messages SET folder_id = $2 WHERE id = $1', [messageId, folderId]);
  }

  public async setLabels(messageId: string, labelIds: string[]): Promise<void> {
    if (!UUID_REGEX.test(messageId)) return;
    await this.db.query('DELETE FROM message_labels WHERE message_id = $1', [messageId]);
    const validLabelIds = labelIds.filter((lid) => UUID_REGEX.test(lid));
    if (validLabelIds.length > 0) {
      const values = validLabelIds.map((_, idx) => `($1, $${idx + 2})`).join(', ');
      await this.db.query(
        `INSERT INTO message_labels (message_id, label_id) VALUES ${values} ON CONFLICT DO NOTHING`,
        [messageId, ...validLabelIds],
      );
    }
  }

  public async updateFlags(
    messageId: string,
    flags: { isRead?: boolean; isStarred?: boolean; isImportant?: boolean },
  ): Promise<void> {
    if (!UUID_REGEX.test(messageId)) return;
    const updates: string[] = [];
    const params: unknown[] = [messageId];

    if (flags.isRead !== undefined) {
      params.push(flags.isRead);
      updates.push(`is_read = $${params.length}`);
    }
    if (flags.isStarred !== undefined) {
      params.push(flags.isStarred);
      updates.push(`is_starred = $${params.length}`);
    }
    if (flags.isImportant !== undefined) {
      params.push(flags.isImportant);
      updates.push(`is_important = $${params.length}`);
    }

    if (updates.length > 0) {
      await this.db.query(`UPDATE messages SET ${updates.join(', ')} WHERE id = $1`, params);
    }
  }

  public async updateDeliveryState(
    messageId: string,
    state: 'queued' | 'sending' | 'delivered' | 'retrying' | 'bounced',
  ): Promise<void> {
    if (!UUID_REGEX.test(messageId)) return;
    await this.db.query('UPDATE messages SET delivery_state = $2 WHERE id = $1', [
      messageId,
      state,
    ]);
  }
}
