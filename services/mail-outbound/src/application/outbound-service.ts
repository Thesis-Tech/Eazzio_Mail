import { DkimSigner } from '../domain/dkim-signer.js';
import { HtmlSanitizer } from '../domain/sanitizer.js';
import { calculateNextAttempt } from '../domain/backoff.js';
import { MailDeliveredEvent, MailBouncedEvent } from '@eazzio/contracts';
import {
  OutboundDeliveryState,
  OutboundQueueRepository,
} from '../repositories/outbound-queue-repository.js';
import { Message, MessageRepository } from '@eazzio/domain';
import { EazzioStorage } from '@eazzio/infra-adapters';
import crypto from 'crypto';

export interface ComposeMessageInput {
  fromAddress: string;
  to: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  domainName: string;
  dkimSelector: string;
  dkimPrivateKeyPem: string;
  idempotencyKey?: string;
  mailboxId?: string;
  folderId?: string;
}

export class OutboundService {
  constructor(
    private readonly queueRepo?: OutboundQueueRepository,
    private readonly messageRepo?: MessageRepository,
    private readonly storage?: EazzioStorage,
  ) {}

  public static composeAndSign(input: ComposeMessageInput): { rawMime: Buffer; messageId: string } {
    const messageId = `<${crypto.randomUUID()}@${input.domainName}>`;
    const sanitizedHtml = input.bodyHtml ? HtmlSanitizer.sanitize(input.bodyHtml) : undefined;
    const body = sanitizedHtml || input.bodyText || '';

    const mimeString = [
      `From: ${input.fromAddress}`,
      `To: ${input.to.join(', ')}`,
      `Subject: ${input.subject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      body,
    ].join('\r\n');

    const unsignedMime = Buffer.from(mimeString, 'utf-8');
    const signedMime = DkimSigner.sign({
      rawMime: unsignedMime,
      domainName: input.domainName,
      selector: input.dkimSelector,
      privateKeyPem: input.dkimPrivateKeyPem,
    });

    return { rawMime: signedMime, messageId };
  }

  public async enqueueOutbound(
    input: ComposeMessageInput,
  ): Promise<{ messageId: string; queueIds: string[] }> {
    const { rawMime, messageId } = OutboundService.composeAndSign(input);
    const dbMessageId = crypto.randomUUID();
    const queueIds: string[] = [];

    const mailboxId = input.mailboxId || crypto.randomUUID();
    const folderId = input.folderId || 'fld-sent';
    const rawObjectKey = `mailboxes/${mailboxId}/messages/${dbMessageId}/raw.eml`;

    // 1. Store signed raw MIME in storage
    if (this.storage) {
      await this.storage.put(rawObjectKey, rawMime, 'message/rfc822');
    }

    // 2. Persist outbound Message record in PostgreSQL
    if (this.messageRepo) {
      const message = new Message({
        id: dbMessageId,
        mailboxId,
        folderId,
        messageIdHeader: messageId,
        fromAddress: input.fromAddress,
        subject: input.subject,
        snippet: (input.bodyText || input.bodyHtml || '').slice(0, 200).replace(/\s+/g, ' ').trim(),
        sizeBytes: rawMime.length,
        rawObjectKey,
        isRead: true,
        isStarred: false,
        isImportant: false,
        direction: 'outbound',
        deliveryState: 'queued',
        receivedAt: new Date(),
      });
      await this.messageRepo.save(message);
    }

    // 3. Enqueue delivery record per recipient in outbound_queue
    if (this.queueRepo) {
      for (const recipient of input.to) {
        const queueId = crypto.randomUUID();
        const idempotencyKey = input.idempotencyKey
          ? `${input.idempotencyKey}_${recipient}`
          : `${dbMessageId}_${recipient}`;

        await this.queueRepo.enqueue({
          id: queueId,
          messageId: dbMessageId,
          recipientAddress: recipient,
          state: 'queued',
          attemptCount: 0,
          nextAttemptAt: new Date(),
          idempotencyKey,
          createdAt: new Date(),
        });
        queueIds.push(queueId);
      }
    }

    return { messageId, queueIds };
  }

  public static handleDeliveryAttempt(params: {
    outboundQueueId: string;
    messageId: string;
    recipientAddress: string;
    currentAttempts: number;
    success: boolean;
    smtpCode?: string;
  }): {
    state: OutboundDeliveryState;
    nextAttemptAt?: Date;
    event?: MailDeliveredEvent | MailBouncedEvent;
  } {
    const now = new Date();
    const eventId = crypto.randomUUID();

    if (params.success) {
      const event: MailDeliveredEvent = {
        eventId,
        occurredAt: now.toISOString(),
        outboundQueueId: params.outboundQueueId,
        messageId: params.messageId,
        recipientAddress: params.recipientAddress,
      };
      return { state: 'delivered', event };
    }

    const { nextAttemptAt, isExhausted } = calculateNextAttempt(params.currentAttempts, now);

    if (isExhausted) {
      const event: MailBouncedEvent = {
        eventId,
        occurredAt: now.toISOString(),
        outboundQueueId: params.outboundQueueId,
        messageId: params.messageId,
        recipientAddress: params.recipientAddress,
        bounceType: 'transient_exhausted',
        smtpCode: params.smtpCode,
      };
      return { state: 'bounced', event };
    }

    return { state: 'retrying', nextAttemptAt };
  }
}
