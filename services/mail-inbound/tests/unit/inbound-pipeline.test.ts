import { describe, it, expect } from 'vitest';
import { InboundEnvelope } from '../../src/domain/envelope.js';
import { MimeParser } from '../../src/domain/mime-parser.js';
import { InboundPipeline } from '../../src/application/inbound-pipeline.js';

describe('Inbound Mail Pipeline & Security Gating Unit Tests', () => {
  const rawSampleMime = Buffer.from(
    'From: sender@example.com\r\nTo: recipient@eazzio.com\r\nSubject: Test Email\r\nMessage-ID: <msg-123@example.com>\r\n\r\nHello, world!',
    'utf-8',
  );

  const pipeline = new InboundPipeline();

  it('should parse raw MIME headers and body text', async () => {
    const parsed = await MimeParser.parse(rawSampleMime);
    expect(parsed.from).toBe('sender@example.com');
    expect(parsed.subject).toBe('Test Email');
    expect(parsed.bodyText).toBe('Hello, world!');
    expect(parsed.messageIdHeader).toBe('<msg-123@example.com>');
  });

  it('should sanitize dangerous filenames to prevent path traversal', () => {
    expect(MimeParser.sanitizeFilename('../../etc/passwd')).toBe('etc_passwd');
    expect(MimeParser.sanitizeFilename('..\\..\\windows\\system32.dll')).toBe(
      'windows_system32.dll',
    );
    expect(MimeParser.sanitizeFilename('safe-report.pdf')).toBe('safe-report.pdf');
  });

  it('should reject email with malware detection', async () => {
    const envelope = new InboundEnvelope({
      envelopeFrom: 'attacker@bad.com',
      envelopeTo: ['user@eazzio.com'],
      clientIp: '1.2.3.4',
      sizeBytes: 1024,
    });

    const result = await pipeline.process({
      envelope,
      rawMime: rawSampleMime,
      authResults: { spf: 'pass', dkim: 'pass', dmarc: 'pass', fromDomain: 'bad.com' },
      spamRuleResult: { score: 0, matchedRules: [] },
      spamStatisticalScore: 0,
      avResult: { status: 'infected', virusName: 'Trojan.Sample' },
      targetMailboxId: 'mbx-1',
      defaultFolderId: 'fld-inbox',
    });

    expect(result.status).toBe('REJECTED');
    if (result.status === 'REJECTED') {
      expect(result.event.reasonCode).toBe('MALWARE_DETECTED');
    }
  });

  it('should quarantine email when spam score exceeds threshold', async () => {
    const envelope = new InboundEnvelope({
      envelopeFrom: 'spammer@suspicious.com',
      envelopeTo: ['user@eazzio.com'],
      clientIp: '1.2.3.4',
      sizeBytes: 1024,
    });

    const result = await pipeline.process({
      envelope,
      rawMime: rawSampleMime,
      authResults: { spf: 'softfail', dkim: 'none', dmarc: 'none', fromDomain: 'suspicious.com' },
      spamRuleResult: { score: 0.4, matchedRules: ['LOTTERY_SPAM'] },
      spamStatisticalScore: 0.1,
      avResult: { status: 'clean' },
      targetMailboxId: 'mbx-1',
      defaultFolderId: 'fld-inbox',
    });

    expect(result.status).toBe('QUARANTINED');
    if (result.status === 'QUARANTINED') {
      expect(result.event.mailboxId).toBe('mbx-1');
    }
  });

  it('should accept clean mail and emit MailAcceptedEvent', async () => {
    const envelope = new InboundEnvelope({
      envelopeFrom: 'friend@good.com',
      envelopeTo: ['user@eazzio.com'],
      clientIp: '1.2.3.4',
      sizeBytes: rawSampleMime.length,
    });

    const result = await pipeline.process({
      envelope,
      rawMime: rawSampleMime,
      authResults: { spf: 'pass', dkim: 'pass', dmarc: 'pass', fromDomain: 'good.com' },
      spamRuleResult: { score: 0.05, matchedRules: [] },
      spamStatisticalScore: 0.02,
      avResult: { status: 'clean' },
      targetMailboxId: 'mbx-1',
      defaultFolderId: 'fld-inbox',
    });

    expect(result.status).toBe('ACCEPTED');
    if (result.status === 'ACCEPTED') {
      expect(result.event.fromAddress).toBe('friend@good.com');
      expect(result.event.subject).toBe('Test Email');
    }
  });
});
