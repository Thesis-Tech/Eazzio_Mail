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
      await this.processBouncedMessages();
      await this.processAutoPurge();
    } finally {
      this.isRunning = false;
    }
  }

  // 4. Inbound bounce mail detection & notification (DSN / Mail Delivery Subsystem)
  private async processBouncedMessages() {
    const bounces = (await defaultDb.query(
      `SELECT m.id, m.mailbox_id, m.from_address, m.subject, m.snippet, m.body_text
       FROM messages m
       WHERE (m.from_address ILIKE '%mailer-daemon%' 
              OR m.from_address ILIKE '%postmaster%' 
              OR m.subject ILIKE '%Delivery Status Notification%' 
              OR m.subject ILIKE '%Undelivered Mail%'
              OR m.subject ILIKE '%failure notice%')
         AND m.is_read = false`,
      []
    )) as any[];

    if (bounces.length === 0) return;

    for (const b of bounces) {
      // Find matching outbound queue message that failed and flag it
      await defaultDb.query(
        `UPDATE outbound_queue 
         SET state = 'failed', last_error = 'Bounced: Delivery failed (DSN received)' 
         WHERE mailbox_id = $1 AND state != 'failed'`,
        [b.mailbox_id]
      );

      // Broadcast real-time bounce event
      try {
        if (wsGateway) {
          wsGateway.broadcastAll({
            type: 'message.bounced',
            mailboxId: b.mailbox_id,
            data: {
              bounceMessageId: b.id,
              subject: b.subject,
              snippet: b.snippet,
            },
          });
        }
      } catch {}
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
    // 1. Release scheduled records in outbound_queue
    const scheduledQueueJobs = (await defaultDb.query(
      `SELECT q.id, q.message_id 
       FROM outbound_queue q 
       WHERE q.state = 'scheduled' AND q.scheduled_at <= now()`,
      []
    )) as any[];

    // 2. Also find scheduled messages directly in messages table
    const scheduledMessages = (await defaultDb.query(
      `SELECT m.id, m.mailbox_id, m.from_address, m.subject, m.scheduled_at, m.thread_id,
              u.email as sender_email
       FROM messages m
       JOIN mailboxes mb ON mb.id = m.mailbox_id
       JOIN users u ON u.id = mb.owner_user_id
       WHERE m.delivery_state = 'scheduled' AND m.scheduled_at <= now()`,
      []
    )) as any[];

    if (scheduledQueueJobs.length === 0 && scheduledMessages.length === 0) return;

    console.log(`📤 SchedulerWorker releasing ${scheduledQueueJobs.length} scheduled outbound queue job(s) and ${scheduledMessages.length} scheduled message(s)...`);

    if (scheduledQueueJobs.length > 0) {
      await defaultDb.query(
        `UPDATE outbound_queue 
         SET state = 'queued', next_attempt_at = now() 
         WHERE state = 'scheduled' AND scheduled_at <= now()`,
        []
      );
    }

    if (scheduledMessages.length > 0) {
      await defaultDb.query(
        `UPDATE messages 
         SET delivery_state = 'delivered', received_at = now() 
         WHERE delivery_state = 'scheduled' AND scheduled_at <= now()`,
        []
      );

      // Deliver local recipients if any for these messages
      const localDomains = (process.env.LOCAL_DOMAINS || 'eazzio.com').split(',').map(d => d.trim().toLowerCase());
      for (const msg of scheduledMessages) {
        try {
          const recips = (await defaultDb.query(
            `SELECT address FROM message_recipients WHERE message_id = $1`,
            [msg.id]
          )) as any[];

          for (const r of recips) {
            const domain = r.address.split('@')[1]?.toLowerCase();
            if (domain && localDomains.includes(domain)) {
              // Find recipient mailbox & deliver to their inbox
              const recipUserRows = (await defaultDb.query(
                `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
                [r.address.toLowerCase()]
              )) as any[];

              if (recipUserRows.length > 0) {
                const mbRows = (await defaultDb.query(
                  `SELECT id FROM mailboxes WHERE owner_user_id = $1 LIMIT 1`,
                  [recipUserRows[0].id]
                )) as any[];

                if (mbRows.length > 0) {
                  const targetMbId = mbRows[0].id;
                  const inboxFldRows = (await defaultDb.query(
                    `SELECT id FROM folders WHERE mailbox_id = $1 AND kind = 'inbox' LIMIT 1`,
                    [targetMbId]
                  )) as any[];

                  if (inboxFldRows.length > 0) {
                    const localMsgId = crypto.randomUUID();
                    await defaultDb.query(
                      `INSERT INTO messages (id, mailbox_id, folder_id, message_id_header, from_address, subject, snippet, size_bytes, raw_object_key, is_read, is_starred, is_important, direction, delivery_state, received_at)
                       SELECT $1, $2, $3, message_id_header, from_address, subject, snippet, size_bytes, raw_object_key, false, false, false, 'inbound', 'delivered', now()
                       FROM messages WHERE id = $4`,
                      [localMsgId, targetMbId, inboxFldRows[0].id, msg.id]
                    );
                  }
                }
              }
            }
          }

          // Broadcast websocket event to notify client
          if (wsGateway) {
            wsGateway.broadcastAll({
              type: 'message.sent',
              mailboxId: msg.mailbox_id,
              data: {
                messageId: msg.id,
                threadId: msg.thread_id,
                userEmail: msg.sender_email,
                subject: msg.subject,
              },
            });
          }
        } catch (deliveryErr) {
          console.error(`Scheduler local delivery error for msg ${msg.id}:`, deliveryErr);
        }
      }
    }

    // Trigger queue runner batch if there are external queue jobs
    if (scheduledQueueJobs.length > 0) {
      try {
        await getQueueRunner().processNextBatch(10);
      } catch (runnerErr) {
        console.error('Scheduler outbound queue runner error:', runnerErr);
      }
    }
  }
}

export const schedulerWorker = new SchedulerWorker();
