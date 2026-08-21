import { describe, it, expect } from 'vitest';
import {
  createEmailTransport,
  LocalTestTransport,
  DirectMtaEmailTransport,
  SmtpSubmissionTransport,
} from '../src/email-transport/index.js';

describe('Email Transport Factory and Adapters', () => {
  it('should instantiate LocalTestTransport when specified', () => {
    const transport = createEmailTransport('local');
    expect(transport).toBeInstanceOf(LocalTestTransport);
  });

  it('should instantiate SmtpSubmissionTransport when specified', () => {
    const transport = createEmailTransport('smtp');
    expect(transport).toBeInstanceOf(SmtpSubmissionTransport);
  });

  it('should instantiate DirectMtaEmailTransport by default', () => {
    const transport = createEmailTransport('direct');
    expect(transport).toBeInstanceOf(DirectMtaEmailTransport);
  });

  it('should capture outgoing mail in LocalTestTransport without network sockets', async () => {
    LocalTestTransport.clear();
    const transport = new LocalTestTransport();
    const result = await transport.submitOutbound(
      Buffer.from('Subject: Hello\r\n\r\nWorld'),
      'sender@eazzio.com',
      ['recipient@external.com']
    );

    expect(result.queueId).toBeDefined();
    expect(LocalTestTransport.capturedEmails.length).toBe(1);
    expect(LocalTestTransport.capturedEmails[0]!.envelopeFrom).toBe('sender@eazzio.com');
    expect(LocalTestTransport.capturedEmails[0]!.envelopeTo).toContain('recipient@external.com');
  });
});
