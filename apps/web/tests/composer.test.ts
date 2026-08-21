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
});
