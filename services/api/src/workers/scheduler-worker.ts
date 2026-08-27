import { defaultDb } from '../config/index.js';
import {
  PostgresMessageRepository,
  MemoryStorageAdapter,
  createEmailTransport,
} from '@eazzio/infra-adapters';
import { PostgresOutboundQueueRepository, QueueRunner } from '@eazzio/mail-outbound';
import { wsGateway } from '../server.js';

const queueRepo = new PostgresOutboundQueueRepository(defaultDb);
const messageRepo = new PostgresMessageRepository(defaultDb);
const storage = new MemoryStorageAdapter();

function getQueueRunner(): QueueRunner {
  const currentTransport = createEmailTransport();
  return new QueueRunner(queueRepo, messageRepo, storage, currentTransport);
}

export class SchedulerWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  public start(intervalMs: number = 10000) {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.runCycle().catch((err) => {
        console.error('SchedulerWorker cycle error:', err);
      });
    }, intervalMs);

    console.log(`⏱️ Eazzio Mail SchedulerWorker started (interval: ${intervalMs}ms)`);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public async runCycle() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      await this.processSnoozedMessages();
      await this.processScheduledOutbound();
      await this.processAutoPurge();
    } finally {
      this.isRunning = false;
    }
  }

  // 1. Wakeup snoozed messages whose timestamp has passed
  private async processSnoozedMessages() {
    const expired = (await defaultDb.query(
      `SELECT m.id, m.mailbox_id, m.thread_id, u.email as user_email
       FROM messages m
       JOIN mailboxes mb ON mb.id = m.mailbox_id
       JOIN users u ON u.id = mb.owner_user_id
       WHERE m.is_snoozed = true AND m.snoozed_until <= now()`,
      []
    )) as any[];

    if (expired.length === 0) return;

    console.log(`⏰ SchedulerWorker waking up ${expired.length} snoozed message(s)...`);

    await defaultDb.query(
      `UPDATE messages 
       SET is_snoozed = false, snoozed_until = NULL 
       WHERE is_snoozed = true AND snoozed_until <= now()`,
      []
    );

    await defaultDb.query(
      `UPDATE threads 
       SET is_snoozed = false, snoozed_until = NULL 
       WHERE is_snoozed = true AND snoozed_until <= now()`,
      []
    );

    // Notify connected clients via WebSocket
    for (const item of expired) {
      try {
        if (wsGateway) {
          wsGateway.broadcastAll({
            type: 'message.unsnoozed',
            mailboxId: item.mailbox_id,
            data: {
              messageId: item.id,
              threadId: item.thread_id,
              userEmail: item.user_email,
            },
          });
        }
      } catch {
        // Ignore WS delivery errors if client is offline
      }
    }
  }

  // 2. Dispatch scheduled outbound emails whose timestamp has arrived
  private async processScheduledOutbound() {
    const scheduledJobs = (await defaultDb.query(
      `SELECT q.id, q.message_id 
       FROM outbound_queue q 
       WHERE q.state = 'scheduled' AND q.scheduled_at <= now()`,
      []
    )) as any[];

    if (scheduledJobs.length === 0) return;

    console.log(`📤 SchedulerWorker releasing ${scheduledJobs.length} scheduled outbound message(s)...`);

    await defaultDb.query(
      `UPDATE outbound_queue 
       SET state = 'queued', next_attempt_at = now() 
       WHERE state = 'scheduled' AND scheduled_at <= now()`,
      []
    );

    await defaultDb.query(
      `UPDATE messages 
       SET delivery_state = 'queued' 
       WHERE delivery_state = 'scheduled' AND scheduled_at <= now()`,
      []
    );

    // Trigger queue runner batch
    try {
      await getQueueRunner().processNextBatch(10);
    } catch (runnerErr) {
      console.error('Scheduler outbound queue runner error:', runnerErr);
    }
  }

  // 3. Auto-purge trash and spam older than 30 days
  private async processAutoPurge() {
    await defaultDb.query(
      `DELETE FROM messages 
       WHERE folder_id IN (
         SELECT f.id FROM folders f WHERE f.kind IN ('trash', 'spam')
       ) 
       AND received_at < now() - INTERVAL '30 days'`,
      []
    );
  }
}

export const schedulerWorker = new SchedulerWorker();
