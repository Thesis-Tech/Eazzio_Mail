import { describe, it, expect } from 'vitest';
import { DsnParser } from '../../src/domain/dsn-parser.js';

describe('RFC 3464 DSN & Bounce Report Parser (FR-OUT-07)', () => {
  it('should accurately parse standard 550 Mailbox Not Found bounce report', () => {
    const rawHeaders = {
      'content-type': 'multipart/report; report-type=delivery-status; boundary="boundary_123"',
      'subject': 'Undelivered Mail Returned to Sender',
      'in-reply-to': '<original-msg-12345@eazzio.com>',
    };

    const dsnBody = `
This is the mail system at host mx.google.com.

I'm sorry to have to inform you that your message could not
be delivered to one or more recipients. It's attached below.

<invalid.user.404@gmail.com>: host gmail-smtp-in.l.google.com[142.250.152.26] said:
    550-5.1.1 The email account that you tried to reach does not exist. Please try
    550-5.1.1 double-checking the recipient's email address for typos or
    550-5.1.1 unnecessary spaces. Learn more at
    550 5.1.1  https://support.google.com/mail/?p=NoSuchUser

Reporting-MTA: dns; mx.google.com
Arrival-Date: Sun, 23 Aug 2026 15:45:00 +0000

Final-Recipient: rfc822; invalid.user.404@gmail.com
Action: failed
Status: 5.1.1
Diagnostic-Code: smtp; 550-5.1.1 The email account that you tried to reach does not exist.
`;

    const report = DsnParser.parse(dsnBody, rawHeaders);

    expect(report.isBounce).toBe(true);
    expect(report.action).toBe('failed');
    expect(report.status).toBe('5.1.1');
    expect(report.originalRecipient).toBe('invalid.user.404@gmail.com');
    expect(report.originalMessageId).toBe('<original-msg-12345@eazzio.com>');
    expect(report.reportingMta).toBe('mx.google.com');
    expect(report.diagnosticCode).toContain('The email account that you tried to reach does not exist');
  });

  it('should ignore regular non-bounce incoming emails', () => {
    const rawHeaders = {
      'content-type': 'text/plain',
      'subject': 'Project Update and Meeting Notes',
    };
    const body = 'Hello team, here are the minutes from today meeting.';

    const report = DsnParser.parse(body, rawHeaders);

    expect(report.isBounce).toBe(false);
  });
});
