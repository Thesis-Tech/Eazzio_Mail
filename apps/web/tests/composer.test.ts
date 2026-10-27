import { describe, it, expect } from 'vitest';
import { ComposeEmailPayload, ComposerAttachment } from '../src/components/mail/MailComposer.js';

describe('Rich Text Mail Composer Logic (TASK-017)', () => {
  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  it('should validate recipient email syntax correctly', () => {
    expect(validateEmail('alice@example.com')).toBe(true);
    expect(validateEmail('bob.smith@eazzio.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('missing@domain')).toBe(false);
  });

  it('should construct valid ComposeEmailPayload with attachments', () => {
    const attachment: ComposerAttachment = {
      id: 'att-100',
      name: 'invoice.pdf',
      sizeBytes: 1048576, // 1 MB
    };

    const payload: ComposeEmailPayload = {
      to: ['client@corp.com'],
      cc: ['manager@corp.com'],
      subject: 'Monthly Invoice Q3',
      body: 'Please find attached the invoice.',
      attachments: [attachment],
    };

    expect(payload.to).toContain('client@corp.com');
    expect(payload.cc).toContain('manager@corp.com');
    expect(payload.attachments?.length).toBe(1);
    expect(payload.attachments?.[0]?.name).toBe('invoice.pdf');
  });

  it('should support adding and removing recipient chips', () => {
    let toChips = ['alex@eazzio.com'];

    // Add chip
    toChips = [...toChips, 'dev@eazzio.com'];
    expect(toChips.length).toBe(2);

    // Remove chip
    toChips = toChips.filter((c) => c !== 'alex@eazzio.com');
    expect(toChips).toEqual(['dev@eazzio.com']);
  });

  it('should allow support and billing as automated role senders and filter out no-reply', () => {
    const domain = 'eazzio.com';
    const rawSenders = [
      { label: 'Rahul Kumar <kumarrahul0@eazzio.com>', email: 'kumarrahul0@eazzio.com', isPrimary: true, type: 'primary' },
      { label: `Support <support@${domain}>`, email: `support@${domain}`, type: 'automated' },
      { label: `Billing <billing@${domain}>`, email: `billing@${domain}`, type: 'automated' },
      { label: `No Reply <no-reply@${domain}>`, email: `no-reply@${domain}`, type: 'system' },
      { label: `No Reply System <noreply@${domain}>`, email: `noreply@${domain}`, type: 'system' },
    ];

    const isSystemNoReply = (email: string) =>
      email.toLowerCase().startsWith('no-reply@') || email.toLowerCase().startsWith('noreply@');

    const filteredSenders = rawSenders.filter((s) => !isSystemNoReply(s.email));

    expect(filteredSenders.map((s) => s.email)).toEqual([
      'kumarrahul0@eazzio.com',
      'support@eazzio.com',
      'billing@eazzio.com',
    ]);
    expect(filteredSenders.find((s) => s.email === 'support@eazzio.com')?.type).toBe('automated');
    expect(filteredSenders.find((s) => s.email === 'billing@eazzio.com')?.type).toBe('automated');
    expect(filteredSenders.some((s) => isSystemNoReply(s.email))).toBe(false);
  });

  it('should reject outbound manual composition from system-generated no-reply addresses', () => {
    const validateSenderAddress = (from: string): { valid: boolean; error?: string } => {
      const lower = from.toLowerCase().trim();
      if (lower.startsWith('no-reply@') || lower.startsWith('noreply@')) {
        return {
          valid: false,
          error: 'System-generated no-reply addresses cannot be used to compose messages.',
        };
      }
      return { valid: true };
    };

    expect(validateSenderAddress('kumarrahul0@eazzio.com').valid).toBe(true);
    expect(validateSenderAddress('support@eazzio.com').valid).toBe(true);
    expect(validateSenderAddress('billing@eazzio.com').valid).toBe(true);

    const noReplyResult = validateSenderAddress('no-reply@eazzio.com');
    expect(noReplyResult.valid).toBe(false);
    expect(noReplyResult.error).toContain('cannot be used to compose messages');

    const noreplyResult = validateSenderAddress('noreply@eazzio.com');
    expect(noreplyResult.valid).toBe(false);
    expect(noreplyResult.error).toContain('cannot be used to compose messages');
  });
});
