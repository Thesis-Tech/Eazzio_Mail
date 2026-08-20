import { describe, it, expect } from 'vitest';
import { NotificationService } from '../../src/application/notification-service.js';
import { NotificationChannelManager } from '../../src/domain/notification-channel.js';
import { MailAcceptedEvent } from '@eazzio/contracts';

describe('Notification Service & Realtime Channels', () => {
  it('should format mailbox channel name', () => {
    expect(NotificationChannelManager.getMailboxChannel('mbx-123')).toBe('mailbox:mbx-123:events');
  });

  it('should publish MAIL_ARRIVED message upon MailAcceptedEvent', async () => {
    const published: any[] = [];
    const mockPublisher = {
      publish: async (channel: string, message: any) => {
        published.push({ channel, message });
      }
    };

    const service = new NotificationService(mockPublisher);
    const event: MailAcceptedEvent = {
      eventId: 'evt-1',
      occurredAt: new Date().toISOString(),
      messageId: 'msg-999',
      mailboxId: 'mbx-1',
      folderId: 'fld-inbox',
      fromAddress: 'sender@example.com',
      subject: 'Urgent Update',
      sizeBytes: 1024
    };

    await service.handleMailAccepted(event);
    expect(published.length).toBe(1);
    expect(published[0].channel).toBe('mailbox:mbx-1:events');
    expect(published[0].message.type).toBe('MAIL_ARRIVED');
    expect(published[0].message.payload.messageId).toBe('msg-999');
  });

  it('should trigger QUOTA_WARNING message when used >= 90%', async () => {
    const published: any[] = [];
    const mockPublisher = {
      publish: async (channel: string, message: any) => {
        published.push({ channel, message });
      }
    };

    const service = new NotificationService(mockPublisher);
    // 950MB used out of 1000MB (95%)
    const triggered = await service.checkQuota('mbx-1', 950000000n, 1000000000n);
    expect(triggered).toBe(true);
    expect(published.length).toBe(1);
    expect(published[0].message.type).toBe('QUOTA_WARNING');
    expect(published[0].message.payload.percentage).toBe(95);
  });
});
