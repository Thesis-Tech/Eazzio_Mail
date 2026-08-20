import { EazzioDatabase } from '@eazzio/infra-adapters';

export type OutboundDeliveryState =
  'queued' | 'sending' | 'delivered' | 'retrying' | 'bounced' | 'failed';

export interface OutboundQueueItem {
  id: string;
  messageId: string;
  recipientAddress: string;
  state: OutboundDeliveryState;
  attemptCount: number;
  nextAttemptAt: Date;
  lastError?: string | null;
  idempotencyKey: string;
  createdAt: Date;
}

interface OutboundQueueRow {
  id: string;
  message_id: string;
  recipient_address: string;
  state: string;
  attempt_count: number;
  next_attempt_at: Date | string;
  last_error: string | null;
  idempotency_key: string;
  created_at: Date | string;
}

export interface OutboundQueueRepository {
  enqueue(item: OutboundQueueItem): Promise<void>;
  fetchPending(batchSize: number): Promise<OutboundQueueItem[]>;
  updateState(
    id: string,
    state: OutboundDeliveryState,
    attemptCount: number,
    nextAttemptAt: Date,
    lastError?: string | null,
  ): Promise<void>;
  findById(id: string): Promise<OutboundQueueItem | null>;
}

export class PostgresOutboundQueueRepository implements OutboundQueueRepository {
  constructor(private readonly db: EazzioDatabase) {}

  private mapRow(row: OutboundQueueRow): OutboundQueueItem {
    return {
      id: row.id,
      messageId: row.message_id,
      recipientAddress: row.recipient_address,
      state: row.state as OutboundDeliveryState,
      attemptCount: Number(row.attempt_count),
      nextAttemptAt: new Date(row.next_attempt_at),
      lastError: row.last_error,
      idempotencyKey: row.idempotency_key,
      createdAt: new Date(row.created_at),
    };
  }

  public async enqueue(item: OutboundQueueItem): Promise<void> {
    await this.db.query(
      `INSERT INTO outbound_queue (
        id, message_id, recipient_address, state, attempt_count, next_attempt_at, last_error, idempotency_key, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        item.id,
        item.messageId,
        item.recipientAddress,
        item.state,
        item.attemptCount,
        item.nextAttemptAt,
        item.lastError ?? null,
        item.idempotencyKey,
        item.createdAt,
      ],
    );
  }

  public async fetchPending(batchSize: number = 50): Promise<OutboundQueueItem[]> {
    const rows = await this.db.query<OutboundQueueRow>(
      `SELECT id, message_id, recipient_address, state, attempt_count, next_attempt_at, last_error, idempotency_key, created_at
       FROM outbound_queue
       WHERE state IN ('queued', 'retrying') AND next_attempt_at <= now()
       ORDER BY next_attempt_at ASC
       LIMIT $1`,
      [batchSize],
    );
    return rows.map((r) => this.mapRow(r));
  }

  public async updateState(
    id: string,
    state: OutboundDeliveryState,
    attemptCount: number,
    nextAttemptAt: Date,
    lastError?: string | null,
  ): Promise<void> {
    await this.db.query(
      `UPDATE outbound_queue
       SET state = $2, attempt_count = $3, next_attempt_at = $4, last_error = $5
       WHERE id = $1`,
      [id, state, attemptCount, nextAttemptAt, lastError ?? null],
    );
  }

  public async findById(id: string): Promise<OutboundQueueItem | null> {
    const rows = await this.db.query<OutboundQueueRow>(
      `SELECT id, message_id, recipient_address, state, attempt_count, next_attempt_at, last_error, idempotency_key, created_at
       FROM outbound_queue
       WHERE id = $1`,
      [id],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }
}
