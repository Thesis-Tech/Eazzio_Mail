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
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  domainName?: string;
  dkimSelector?: string;
  dkimPrivateKeyPem?: string;
  idempotencyKey?: string;
  mailboxId?: string;
  folderId?: string;
}

let cachedFallbackDkimKey: { privateKey: string; publicKey: string } | null = null;

function getFallbackDkimKey(): { privateKey: string; publicKey: string } {
  if (!cachedFallbackDkimKey) {
    const pair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    cachedFallbackDkimKey = pair;
  }
  return cachedFallbackDkimKey;
}

export class OutboundService {
  constructor(
    private readonly queueRepo?: OutboundQueueRepository,
    private readonly messageRepo?: MessageRepository,
    private readonly storage?: EazzioStorage,
  ) {}

  public static composeAndSign(input: ComposeMessageInput): { rawMime: Buffer; messageId: string } {
    const domainName = input.domainName || input.fromAddress.split('@')[1] || 'eazzio.com';
    const messageId = `<${crypto.randomUUID()}@${domainName}>`;
    const sanitizedHtml = input.bodyHtml ? HtmlSanitizer.sanitize(input.bodyHtml) : undefined;
    const body = sanitizedHtml || input.bodyText || '';
    const verifiedSender = process.env.SMTP_FROM_EMAIL || input.fromAddress;
    const fromDisplayName = process.env.SMTP_FROM_NAME || 'Rahul Kumar (Eazzio Mail)';

    const mimeHeaderLines = [
      `From: "${fromDisplayName}" <${verifiedSender}>`,
      `Reply-To: ${input.fromAddress}`,
      `To: ${input.to.join(', ')}`,
    ];

    if (input.cc && input.cc.length > 0) {
      mimeHeaderLines.push(`Cc: ${input.cc.join(', ')}`);
    }

    mimeHeaderLines.push(
      `Subject: ${input.subject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      body,
    );

    const mimeString = mimeHeaderLines.join('\r\n');
    const unsignedMime = Buffer.from(mimeString, 'utf-8');

    const privateKey = input.dkimPrivateKeyPem || process.env.DKIM_PRIVATE_KEY || getFallbackDkimKey().privateKey;
    const selector = input.dkimSelector || process.env.DKIM_SELECTOR || 'default';

    try {
      const signedMime = DkimSigner.sign({
        rawMime: unsignedMime,
        domainName,
        selector,
        privateKeyPem: privateKey,
      });
      return { rawMime: signedMime, messageId };
    } catch {
      return { rawMime: unsignedMime, messageId };
    }
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

    const isPermanentRejection = Boolean(
      params.smtpCode &&
        (params.smtpCode.startsWith('5') ||
          params.smtpCode.includes('(5') ||
          params.smtpCode.toLowerCase().includes('permanent') ||
          params.smtpCode.toLowerCase().includes('notauthorized'))
    );

    const { nextAttemptAt, isExhausted } = calculateNextAttempt(params.currentAttempts, now);

    if (isPermanentRejection || isExhausted) {
      const event: MailBouncedEvent = {
        eventId,
        occurredAt: now.toISOString(),
        outboundQueueId: params.outboundQueueId,
        messageId: params.messageId,
        recipientAddress: params.recipientAddress,
        bounceType: isPermanentRejection ? 'permanent' : 'transient_exhausted',
        smtpCode: params.smtpCode,
      };
      return { state: 'bounced', event };
    }

    return { state: 'retrying', nextAttemptAt };
  }
}
