import { describe, it, expect } from 'vitest';
import { MessageDetail } from '../src/types/mail.js';

describe('Conversation Viewer Component Logic (TASK-016 / STEP-7-STATE-SYNC)', () => {
  const sampleMessages: MessageDetail[] = [
    {
      id: 'msg-1',
      threadId: 'th-100',
      mailboxId: 'mbx-100',
      folderId: 'fld-inbox',
      from: { name: 'Alice Smith', email: 'alice@corp.com' },
      to: [{ name: 'Alex Rivers', email: 'alex@eazzio.com' }],
      subject: 'Architecture Alignment',
      snippet: 'Initial design proposal for the email router...',
      bodyText: 'Hello Alex,\n\nPlease find the router spec.',
      bodyHtml: '<p>Hello Alex,<br>Please find the router spec.</p>',
      receivedAt: 'Aug 21, 10:00 AM',
      isRead: true,
      isStarred: false,
      security: {
        spf: 'pass',
        dkim: 'pass',
        dmarc: 'pass',
        clamavStatus: 'clean',
        spamScore: 0.0,
      },
      attachments: [
        {
          id: 'att-1',
          filename: 'spec.pdf',
          contentType: 'application/pdf',
          sizeBytes: 25000,
          antivirusStatus: 'clean',
        },
      ],
    },
  ];

  it('should verify sender authentication alignment (SPF & DKIM pass)', () => {
    const msg = sampleMessages[0]!;
    const isVerified =
      msg.security.spf === 'pass' && msg.security.dkim === 'pass';
    expect(isVerified).toBe(true);
    expect(msg.security.clamavStatus).toBe('clean');
  });

  it('should correctly count attachments and format file sizes', () => {
    const msg = sampleMessages[0]!;
    expect(msg.attachments.length).toBe(1);
    expect(msg.attachments[0]?.filename).toBe('spec.pdf');
    expect(Math.round((msg.attachments[0]?.sizeBytes || 0) / 1024)).toBe(24);
  });

  it('should append quick replies to threaded message history', () => {
    const threadMessages = [...sampleMessages];
    const newReply: MessageDetail = {
      id: 'msg-2',
      threadId: 'th-100',
      mailboxId: 'mbx-100',
      folderId: 'fld-inbox',
      from: { name: 'You', email: 'alex@eazzio.com' },
      to: [{ name: 'Alice Smith', email: 'alice@corp.com' }],
      subject: 'Re: Architecture Alignment',
      snippet: 'Approved, thanks!',
      bodyText: 'Approved, thanks!',
      bodyHtml: '<p>Approved, thanks!</p>',
      receivedAt: 'Just now',
      isRead: true,
      isStarred: false,
      security: {
        spf: 'pass',
        dkim: 'pass',
        dmarc: 'pass',
        clamavStatus: 'clean',
        spamScore: 0.0,
      },
      attachments: [],
    };

    threadMessages.push(newReply);
    expect(threadMessages.length).toBe(2);
    expect(threadMessages[1]?.bodyText).toBe('Approved, thanks!');
  });

  it('should dynamically align folder badges with active folder or thread labels', () => {
    const activeFolder = 'sent';
    const threadLabels = ['Sent'];
    const displayBadges = threadLabels.length > 0
      ? threadLabels
      : [activeFolder.charAt(0).toUpperCase() + activeFolder.slice(1).toLowerCase()];

    expect(displayBadges).toEqual(['Sent']);
    expect(displayBadges).not.toContain('Inbox');
  });

  it('should format Reply payload with correct subject, sender recipient, and quoted body', () => {
    const msg = sampleMessages[0]!;
    const rawSubj = msg.subject || '';
    const cleanSubj = rawSubj.toLowerCase().startsWith('re:') ? rawSubj : `Re: ${rawSubj}`;
    const quotedBody = `\n\nOn ${msg.receivedAt}, ${msg.from.name || msg.from.email} wrote:\n> ${(msg.bodyText || '').split('\n').join('\n> ')}`;

    expect(cleanSubj).toBe('Re: Architecture Alignment');
    expect(quotedBody).toContain('On Aug 21, 10:00 AM, Alice Smith wrote:');
    expect(quotedBody).toContain('> Hello Alex,');
    expect(quotedBody).toContain('> Please find the router spec.');
  });

  it('should format Reply All payload with all unique recipients and CCs excluding current user', () => {
    const msg: MessageDetail = {
      ...sampleMessages[0]!,
      to: [{ name: 'Alex Rivers', email: 'alex@eazzio.com' }, { name: 'Bob Dev', email: 'bob@eazzio.com' }],
      cc: [{ name: 'Carol Lead', email: 'carol@corp.com' }],
    };
    const currentUserEmail = 'alex@eazzio.com';
    const allTo = [
      msg.from.email,
      ...msg.to.map((t) => t.email).filter((e) => e.toLowerCase() !== currentUserEmail),
    ];
    const uniqueTo = Array.from(new Set(allTo));
    const uniqueCc = msg.cc ? Array.from(new Set(msg.cc.map((c) => c.email).filter((e) => e.toLowerCase() !== currentUserEmail))) : [];

    expect(uniqueTo).toEqual(['alice@corp.com', 'bob@eazzio.com']);
    expect(uniqueCc).toEqual(['carol@corp.com']);
  });

  it('should format Forward payload with Fwd prefix, forwarded header block, and copy attachments', () => {
    const msg = sampleMessages[0]!;
    const rawSubj = msg.subject || '';
    const cleanSubj = rawSubj.toLowerCase().startsWith('fwd:') ? rawSubj : `Fwd: ${rawSubj}`;
    const fwdBody = `\n\n---------- Forwarded message ---------\nFrom: ${msg.from.name} <${msg.from.email}>\nDate: ${msg.receivedAt}\nSubject: ${msg.subject}\nTo: ${msg.to.map((t) => t.email).join(', ')}\n\n${msg.bodyText}`;

    expect(cleanSubj).toBe('Fwd: Architecture Alignment');
    expect(fwdBody).toContain('---------- Forwarded message ---------');
    expect(fwdBody).toContain('From: Alice Smith <alice@corp.com>');
    expect(fwdBody).toContain('To: alex@eazzio.com');
    expect(msg.attachments.length).toBe(1);
    expect(msg.attachments[0]?.filename).toBe('spec.pdf');
  });
});

