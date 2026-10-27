import { describe, it, expect } from 'vitest';
import {
  stripQuotedContent,
  foldNestedQuotes,
  EMAIL_QUOTE_REGEX,
} from '../src/lib/jwz-quote-normalizer.js';

describe('JWZ Quoted Content & Thread Delta Stripping / Normalization', () => {
  it('should split Gmail-style quote blocks cleanly', () => {
    const htmlBody = '<p>Thanks for the update! We will proceed immediately.</p><div class="gmail_quote"><div class="gmail_attr">On Fri, Sep 4, 2026, Alice wrote:<br></div><blockquote>Can you check the deployment spec?</blockquote></div>';
    const split = stripQuotedContent(htmlBody, true);

    expect(split.hasQuotedContent).toBe(true);
    expect(split.primaryContent).toBe('<p>Thanks for the update! We will proceed immediately.</p>');
    expect(split.quotedContent).toContain('gmail_quote');
    expect(split.quotedContent).toContain('Can you check the deployment spec?');
  });

  it('should split Outlook-style "-----Original Message-----" blocks', () => {
    const textBody = 'Looks good to me.\n\n-----Original Message-----\nFrom: bob@corp.com\nSent: Friday, September 4, 2026 10:00 AM\nTo: rahul@eazzio.com\nSubject: Spec review\n\nDid you review the RFC?';
    const split = stripQuotedContent(textBody, false);

    expect(split.hasQuotedContent).toBe(true);
    expect(split.primaryContent).toBe('Looks good to me.');
    expect(split.quotedContent).toContain('-----Original Message-----');
    expect(split.quotedContent).toContain('Did you review the RFC?');
  });

  it('should split RFC-2822 / Markdown line quoting (> )', () => {
    const markdownQuoted = 'Here is my reply.\n\n> Previous point 1\n> Previous point 2';
    const split = stripQuotedContent(markdownQuoted, false);

    expect(split.hasQuotedContent).toBe(true);
    expect(split.primaryContent).toBe('Here is my reply.');
    expect(split.quotedContent).toContain('> Previous point 1');
  });

  it('should fold deeply nested blockquotes to prevent DOM explosion', () => {
    const nestedQuotes = '<blockquote>First quote<blockquote>Second quote<blockquote>Third deeply nested quote</blockquote></blockquote></blockquote>';
    const folded = foldNestedQuotes(nestedQuotes);

    expect(folded).toContain('nested-quote-folded');
  });

  it('should preserve bodies without quotes', () => {
    const cleanBody = '<p>Stand-alone email message without any quoted reply text.</p>';
    const split = stripQuotedContent(cleanBody, true);

    expect(split.hasQuotedContent).toBe(false);
    expect(split.primaryContent).toBe(cleanBody);
    expect(split.quotedContent).toBe('');
  });
});
