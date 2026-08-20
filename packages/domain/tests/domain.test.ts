import { describe, it, expect } from 'vitest';
import { EmailAddress, MessageId, Quota, SpamScore, User, Domain } from '../src/index.js';

describe('Domain Value Objects & Models', () => {
  it('should validate RFC email addresses correctly', () => {
    const email = new EmailAddress('user@example.com');
    expect(email.value).toBe('user@example.com');
    expect(email.localPart).toBe('user');
    expect(email.domain).toBe('example.com');
    expect(() => new EmailAddress('invalid-email')).toThrow();
  });

  it('should manage quota calculations accurately', () => {
    const quota = new Quota(5000n, 1000n);
    expect(quota.remainingBytes).toBe(4000n);
    expect(quota.isExceeded(3000)).toBe(false);
    expect(quota.isExceeded(4001)).toBe(true);
  });

  it('should evaluate spam score thresholds', () => {
    const score = new SpamScore(0.7);
    expect(score.isQuarantine(0.6)).toBe(true);
    expect(score.isReject(0.95)).toBe(false);
  });

  it('should verify complete domain activation condition', () => {
    const domain = new Domain({
      id: 'dom-1',
      domainName: 'eazzio.com',
      verificationStatus: 'verified',
      mxVerified: true,
      spfVerified: true,
      dkimVerified: true,
      dmarcVerified: true,
      createdAt: new Date()
    });
    expect(domain.isFullyVerified()).toBe(true);
  });
});
