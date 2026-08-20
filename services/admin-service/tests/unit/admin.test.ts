import { describe, it, expect } from 'vitest';
import { DomainVerifier } from '../../src/domain/domain-verifier.js';
import { AdminService } from '../../src/application/admin-service.js';

describe('Admin Service & Domain DNS 4-Check Gate', () => {
  it('should return pending when zero DNS checks pass', () => {
    const res = DomainVerifier.evaluateStatus({ mx: false, spf: false, dkim: false, dmarc: false });
    expect(res.status).toBe('pending');
    expect(res.isFullyVerified).toBe(false);
  });

  it('should return partially_verified when some but not all DNS checks pass', () => {
    const res = DomainVerifier.evaluateStatus({ mx: true, spf: true, dkim: false, dmarc: false });
    expect(res.status).toBe('partially_verified');
    expect(res.isFullyVerified).toBe(false);
  });

  it('should return verified and emit DomainVerifiedEvent only when all 4 checks pass', () => {
    const res = AdminService.verifyDomain({
      domainId: 'dom-1',
      domainName: 'eazzio.com',
      dnsRecords: { mx: true, spf: true, dkim: true, dmarc: true }
    });

    expect(res.status).toBe('verified');
    expect(res.isFullyVerified).toBe(true);
    expect(res.event?.domainName).toBe('eazzio.com');
  });
});
