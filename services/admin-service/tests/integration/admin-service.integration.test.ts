import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  PostgresAdapter,
  PostgresDomainRepository,
  PostgresOrganizationRepository,
} from '@eazzio/infra-adapters';
import { AdminService } from '../../src/application/admin-service.js';
import { DnsResolverInterface } from '../../src/domain/dns-resolver.js';

describe('Admin Service Domain & Organization Live Integration Tests (TASK-013)', () => {
  const dbUrl =
    process.env.DATABASE_URL ||
    'postgresql://eazzio_user:eazzio_password@localhost:5432/eazzio_mail';
  let db: PostgresAdapter;

  let domainRepo: PostgresDomainRepository;
  let orgRepo: PostgresOrganizationRepository;
  let adminService: AdminService;

  const testSuffix = Date.now().toString();
  const orgId = crypto.randomUUID();
  const fullyVerifiedDomainName = `verified-${testSuffix}.com`;
  const partialDomainName = `partial-${testSuffix}.com`;

  const mockDnsResolver: DnsResolverInterface = {
    resolveMx: async (domain) => {
      if (domain === fullyVerifiedDomainName || domain === partialDomainName) {
        return [{ exchange: 'mail.eazzio.com', priority: 10 }];
      }
      return [];
    },
    resolveTxt: async (domain) => {
      if (domain === fullyVerifiedDomainName) {
        return [['v=spf1 include:_spf.eazzio.com ~all']];
      }
      if (domain === `default._domainkey.${fullyVerifiedDomainName}`) {
        return [['v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQE']];
      }
      if (domain === `_dmarc.${fullyVerifiedDomainName}`) {
        return [['v=DMARC1; p=quarantine;']];
      }
      return [];
    },
  };

  beforeAll(async () => {
    db = new PostgresAdapter(dbUrl);
    domainRepo = new PostgresDomainRepository(db);
    orgRepo = new PostgresOrganizationRepository(db);
    adminService = new AdminService(domainRepo, orgRepo, mockDnsResolver);
  });

  afterAll(async () => {
    await db.query('DELETE FROM domains WHERE organization_id = $1', [orgId]);
    await db.query('DELETE FROM organizations WHERE id = $1', [orgId]);
    await db.close();
  });

  it('should provision organization and create domain in pending verification status', async () => {
    const org = await adminService.createOrganization(`Test Enterprise ${testSuffix}`, orgId);
    expect(org.id).toBe(orgId);

    const domain = await adminService.createDomain({
      organizationId: orgId,
      domainName: fullyVerifiedDomainName,
    });

    expect(domain.domainName).toBe(fullyVerifiedDomainName);
    expect(domain.verificationStatus).toBe('pending');

    const dbDomain = await domainRepo.findById(domain.id);
    expect(dbDomain).not.toBeNull();
    expect(dbDomain?.verificationStatus).toBe('pending');
  });

  it('should execute 4-check DNS evaluation and transition domain to verified status with event emission', async () => {
    const domain = await domainRepo.findByName(fullyVerifiedDomainName);
    expect(domain).not.toBeNull();

    const result = await adminService.verifyDomain({
      domainId: domain!.id,
      dkimSelector: 'default',
    });

    expect(result.status).toBe('verified');
    expect(result.isFullyVerified).toBe(true);
    expect(result.dnsRecords.mx).toBe(true);
    expect(result.dnsRecords.spf).toBe(true);
    expect(result.dnsRecords.dkim).toBe(true);
    expect(result.dnsRecords.dmarc).toBe(true);
    expect(result.event).toBeDefined();
    expect(result.event?.domainName).toBe(fullyVerifiedDomainName);

    // Verify DB record updated
    const updatedDbDomain = await domainRepo.findById(domain!.id);
    expect(updatedDbDomain?.verificationStatus).toBe('verified');
    expect(updatedDbDomain?.mxVerified).toBe(true);
    expect(updatedDbDomain?.spfVerified).toBe(true);
    expect(updatedDbDomain?.dkimVerified).toBe(true);
    expect(updatedDbDomain?.dmarcVerified).toBe(true);
    expect(updatedDbDomain?.activatedAt).not.toBeNull();
  });

  it('should transition domain to partially_verified when only subset of DNS checks pass', async () => {
    const partialDomain = await adminService.createDomain({
      organizationId: orgId,
      domainName: partialDomainName,
    });

    const result = await adminService.verifyDomain({
      domainId: partialDomain.id,
    });

    expect(result.status).toBe('partially_verified');
    expect(result.isFullyVerified).toBe(false);
    expect(result.dnsRecords.mx).toBe(true);
    expect(result.dnsRecords.spf).toBe(false);
    expect(result.event).toBeUndefined();

    const updatedDbDomain = await domainRepo.findById(partialDomain.id);
    expect(updatedDbDomain?.verificationStatus).toBe('partially_verified');
    expect(updatedDbDomain?.activatedAt).toBeNull();
  });
});
