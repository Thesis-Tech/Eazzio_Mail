import { describe, it, expect } from 'vitest';
import { MailAcceptedEvent, MailRejectedEvent } from '../src/events/events.js';

describe('Event Schemas', () => {
  it('should structure MailAcceptedEvent correctly', () => {
    const event: MailAcceptedEvent = {
      eventId: 'evt-1',
      occurredAt: new Date().toISOString(),
      messageId: 'msg-1',
      mailboxId: 'mbx-1',
      folderId: 'fld-1',
      fromAddress: 'sender@example.com',
      subject: 'Hello',
      sizeBytes: 1024
    };
    expect(event.messageId).toBe('msg-1');
  });
});
