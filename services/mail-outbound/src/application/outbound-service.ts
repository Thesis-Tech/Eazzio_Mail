import { DkimSigner } from '../domain/dkim-signer.js';
import { HtmlSanitizer } from '../domain/sanitizer.js';
import { calculateNextAttempt } from '../domain/backoff.js';
import { MailDeliveredEvent, MailBouncedEvent } from '@eazzio/contracts';

export interface ComposeMessageInput {
  fromAddress: string;
  to: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  domainName: string;
  dkimSelector: string;
  dkimPrivateKeyPem: string;
  idempotencyKey: string;
}

export type OutboundDeliveryState = 'queued' | 'sending' | 'delivered' | 'retrying' | 'bounced';

export class OutboundService {
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
      body
    ].join('\r\n');

    const unsignedMime = Buffer.from(mimeString, 'utf-8');
    const signedMime = DkimSigner.sign({
      rawMime: unsignedMime,
      domainName: input.domainName,
      selector: input.dkimSelector,
      privateKeyPem: input.dkimPrivateKeyPem
    });

    return { rawMime: signedMime, messageId };
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
        recipientAddress: params.recipientAddress
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
        smtpCode: params.smtpCode
      };
      return { state: 'bounced', event };
    }

    return { state: 'retrying', nextAttemptAt };
  }
}
