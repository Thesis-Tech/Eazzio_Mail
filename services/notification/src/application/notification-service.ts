import { MailAcceptedEvent } from '@eazzio/contracts';
import { NotificationChannelManager, RealtimeMessage } from '../domain/notification-channel.js';

export interface RealtimePublisher {
  publish(channel: string, message: RealtimeMessage): Promise<void>;
}

export class NotificationService {
  constructor(private readonly publisher: RealtimePublisher) {}

  public async handleMailAccepted(event: MailAcceptedEvent): Promise<void> {
    const channel = NotificationChannelManager.getMailboxChannel(event.mailboxId);
    const msg = NotificationChannelManager.createMailArrivedPayload(
      event.messageId,
      event.fromAddress,
      event.subject
    );
    await this.publisher.publish(channel, msg);
  }

  public async checkQuota(mailboxId: string, usedBytes: bigint, quotaBytes: bigint): Promise<boolean> {
    if (quotaBytes > 0n && (usedBytes * 100n) / quotaBytes >= 90n) {
      const channel = NotificationChannelManager.getMailboxChannel(mailboxId);
      const msg = NotificationChannelManager.createQuotaWarningPayload(mailboxId, usedBytes, quotaBytes);
      await this.publisher.publish(channel, msg);
      return true;
    }
    return false;
  }
}
