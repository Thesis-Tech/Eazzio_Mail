import { describe, it, expect } from 'vitest';
import { DomainVerifier } from '../../src/domain/domain-verifier.js';
import { Dns4CheckRunner, DnsResolverInterface } from '../../src/domain/dns-resolver.js';

describe('Admin Service & Domain DNS 4-Check Gate Unit Tests', () => {
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

  it('should return verified when all 4 checks pass', () => {
    const res = DomainVerifier.evaluateStatus({ mx: true, spf: true, dkim: true, dmarc: true });
    expect(res.status).toBe('verified');
    expect(res.isFullyVerified).toBe(true);
  });

  it('should query DNS resolver and perform 4-check DNS evaluation', async () => {
    const mockResolver: DnsResolverInterface = {
      resolveMx: async (d) =>
        d === 'eazzio.com' ? [{ exchange: 'mail.eazzio.com', priority: 10 }] : [],
      resolveTxt: async (d) => {
        if (d === 'eazzio.com') return [['v=spf1 include:_spf.eazzio.com ~all']];
        if (d === 'default._domainkey.eazzio.com')
          return [['v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQE']];
        if (d === '_dmarc.eazzio.com') return [['v=DMARC1; p=reject; rua=mailto:dmarc@eazzio.com']];
        return [];
      },
    };

    const runner = new Dns4CheckRunner(mockResolver);
    const results = await runner.checkDomain('eazzio.com', 'default');
    expect(results.mx).toBe(true);
    expect(results.spf).toBe(true);
    expect(results.dkim).toBe(true);
    expect(results.dmarc).toBe(true);
  });
});
