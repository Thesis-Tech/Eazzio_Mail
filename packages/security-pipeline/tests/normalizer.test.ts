import { describe, it, expect } from 'vitest';
import {
  stripZeroWidth,
  normalizeHomoglyphs,
  normalizeAdversarialText,
  ZERO_WIDTH_REGEX,
  HOMOGLYPH_MAP,
} from '../src/normalizer.js';
import { decide } from '../src/decide.js';

describe('RETVec / Adversarial Unicode & Zero-Width Text Normalizer', () => {
  it('should strip zero-width and invisible unicode characters', () => {
    // String interspersed with zero-width space (\u200B), soft hyphen (\u00AD), BOM (\uFEFF)
    const obfuscated = 'v\u200Bi\u00ADa\uFEFFg\u200Cr\u200Da';
    const { text, count } = stripZeroWidth(obfuscated);
    expect(text).toBe('viagra');
    expect(count).toBe(5);
  });

  it('should normalize Cyrillic homoglyphs to ASCII equivalents', () => {
    // Cyrillic letters: а (\u0430), с (\u0441), е (\u0435), о (\u043E), р (\u0440)
    const cyrillicSpoof = '\u0440\u0430\u0443\u0440\u0430\u043B'; // "paypal" with Cyrillic p, a, y, p, a, and Cyrillic l
    const { text, count } = normalizeHomoglyphs(cyrillicSpoof);
    expect(text).toContain('paypa');
    expect(count).toBeGreaterThanOrEqual(5);
  });

  it('should normalize Greek homoglyphs to ASCII equivalents', () => {
    // Greek letters: \u03B1 (alpha -> a), \u03BF (omicron -> o)
    const greekSpoof = 'micr\u03BFs\u03BFft \u03B1cc\u03BFunt';
    const { text, count } = normalizeHomoglyphs(greekSpoof);
    expect(text).toBe('microsoft account');
    expect(count).toBe(4);
  });

  it('should compute evasion penalty and detect adversarial input', () => {
    const maliciousPayload = 'U\u200Br\u200Bg\u200Be\u200Bn\u200Bt: V\u0435rif\u0443 y\u043Eur b\u0430nk';
    const analysis = normalizeAdversarialText(maliciousPayload);

    expect(analysis.isAdversarial).toBe(true);
    expect(analysis.zeroWidthCount).toBeGreaterThan(3);
    expect(analysis.homoglyphCount).toBeGreaterThan(2);
    expect(analysis.evasionPenalty).toBeGreaterThan(0.2);
    expect(analysis.normalizedText).toContain('Urgent: Verify your bank');
  });

  it('should integrate with decide() and trigger quarantine or reject for evasive obfuscation', () => {
    // Clean auth, but high adversarial evasion penalty pushes it into quarantine
    const res = decide({
      authResults: { spf: 'pass', dkim: 'pass', dmarc: 'pass', fromDomain: 'legit-domain.com' },
      spamRuleResult: { score: 0.35, matchedRules: ['URGENT_ACTION'] },
      spamStatisticalScore: 0.1,
      avResult: { status: 'clean' },
      rawTextContent: 'C\u200Bl\u200Bi\u200Bc\u200Bk h\u0435r\u0435 t\u043E cl\u0430im y\u043Eur crypt\u043E pr\u0456z\u0435',
    });

    expect(res.adversarialAnalysis).toBeDefined();
    expect(res.adversarialAnalysis?.isAdversarial).toBe(true);
    expect(res.spamScore).toBeGreaterThanOrEqual(0.6);
    expect(res.action).toBe('QUARANTINE');
    expect(res.reasonCode).toBe('ADVERSARIAL_OBFUSCATION_QUARANTINE');
  });

  it('should reject when composite score plus adversarial penalty exceeds threshold', () => {
    const res = decide({
      authResults: { spf: 'softfail', dkim: 'none', dmarc: 'none', fromDomain: 'unknown.com' },
      spamRuleResult: { score: 0.4, matchedRules: ['SUSPICIOUS_LINKS'] },
      spamStatisticalScore: 0.1,
      avResult: { status: 'clean' },
      rawTextContent: 'W\u200Bi\u200Bn\u200Bn\u200Be\u200Br \u0430\u0441\u0441\u043E\u0443\u043Et \u0441\u043Enf\u0456rm\u0430t\u0456\u043En',
    });

    expect(res.spamScore).toBeGreaterThanOrEqual(0.95);
    expect(res.action).toBe('REJECT');
    expect(res.reasonCode).toBe('ADVERSARIAL_OBFUSCATION_REJECT');
  });
});
