import { describe, it, expect } from 'vitest';
import { decide } from '../src/decide.js';

describe('Deterministic Inbound Security Pipeline decide()', () => {
  it('should hard-reject malware infected messages', () => {
    const res = decide({
      authResults: { spf: 'pass', dkim: 'pass', dmarc: 'pass', fromDomain: 'trusted.com' },
      spamRuleResult: { score: 0, matchedRules: [] },
      spamStatisticalScore: 0,
      avResult: { status: 'infected', virusName: 'Eicar-Test-Signature' }
    });
    expect(res.action).toBe('REJECT');
    expect(res.reasonCode).toBe('MALWARE_DETECTED');
  });

  it('should hard-reject DMARC failure when policy is reject', () => {
    const res = decide({
      authResults: { spf: 'fail', dkim: 'fail', dmarc: 'fail', fromDomain: 'spoofed.com' },
      domainDmarcPolicy: 'reject',
      spamRuleResult: { score: 0, matchedRules: [] },
      spamStatisticalScore: 0,
      avResult: { status: 'clean' }
    });
    expect(res.action).toBe('REJECT');
    expect(res.reasonCode).toBe('DMARC_REJECT');
  });

  it('should quarantine high spam score messages', () => {
    const res = decide({
      authResults: { spf: 'softfail', dkim: 'none', dmarc: 'none', fromDomain: 'unknown.com' },
      spamRuleResult: { score: 0.4, matchedRules: ['SUSPICIOUS_LINKS'] },
      spamStatisticalScore: 0.1,
      avResult: { status: 'clean' }
    });
    expect(res.action).toBe('QUARANTINE');
    expect(res.spamScore).toBeGreaterThanOrEqual(0.6);
  });

  it('should accept clean and authenticated messages', () => {
    const res = decide({
      authResults: { spf: 'pass', dkim: 'pass', dmarc: 'pass', fromDomain: 'trusted.com' },
      spamRuleResult: { score: 0.05, matchedRules: [] },
      spamStatisticalScore: 0.02,
      avResult: { status: 'clean' }
    });
    expect(res.action).toBe('ACCEPT');
    expect(res.spamScore).toBeLessThan(0.6);
  });
});
