import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { calculateNextAttempt } from '../../src/domain/backoff.js';
import { HtmlSanitizer } from '../../src/domain/sanitizer.js';
import { OutboundService } from '../../src/application/outbound-service.js';

describe('Outbound Mail Engine & DKIM Signing', () => {
  // Generate a test RSA keypair for testing
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  it('should calculate exponential backoff accurately', () => {
    const baseNow = new Date('2026-08-20T12:00:00Z');
    // Attempt 0 -> 30s
    const res0 = calculateNextAttempt(0, baseNow);
    expect(res0.nextAttemptAt.getTime() - baseNow.getTime()).toBe(30 * 1000);

    // Attempt 1 -> 60s
    const res1 = calculateNextAttempt(1, baseNow);
    expect(res1.nextAttemptAt.getTime() - baseNow.getTime()).toBe(60 * 1000);

    // Attempt 8 -> Exhausted
    const res8 = calculateNextAttempt(8, baseNow);
    expect(res8.isExhausted).toBe(true);
  });

  it('should sanitize dangerous HTML tags', () => {
    const dirty = '<p>Hello</p><script>alert("hack")</script><a href="javascript:void(0)">Click</a>';
    const clean = HtmlSanitizer.sanitize(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('javascript:');
  });

  it('should compose and DKIM-sign outbound email', () => {
    const { rawMime, messageId } = OutboundService.composeAndSign({
      fromAddress: 'sender@eazzio.com',
      to: ['recipient@external.com'],
      subject: 'Outbound Test',
      bodyHtml: '<p>Hello world!</p>',
      domainName: 'eazzio.com',
      dkimSelector: 'default',
      dkimPrivateKeyPem: privateKey,
      idempotencyKey: 'idemp-123'
    });

    const mimeStr = rawMime.toString('utf-8');
    expect(mimeStr).toContain('DKIM-Signature:');
    expect(mimeStr).toContain('d=eazzio.com');
    expect(mimeStr).toContain('s=default');
    expect(messageId).toContain('@eazzio.com>');
  });

  it('should transition to delivered state on successful SMTP send', () => {
    const res = OutboundService.handleDeliveryAttempt({
      outboundQueueId: 'q-1',
      messageId: 'msg-1',
      recipientAddress: 'test@external.com',
      currentAttempts: 0,
      success: true
    });
    expect(res.state).toBe('delivered');
    expect(res.event?.recipientAddress).toBe('test@external.com');
  });

  it('should transition to bounced on retry exhaustion', () => {
    const res = OutboundService.handleDeliveryAttempt({
      outboundQueueId: 'q-1',
      messageId: 'msg-1',
      recipientAddress: 'test@external.com',
      currentAttempts: 8,
      success: false,
      smtpCode: '550 User unknown'
    });
    expect(res.state).toBe('bounced');
  });
});
