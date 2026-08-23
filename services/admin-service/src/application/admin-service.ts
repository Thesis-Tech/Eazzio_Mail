import {
  DomainVerifier,
  DetailedDnsRecordResult,
  DomainVerificationStatus,
} from '../domain/domain-verifier.js';
import { Dns4CheckRunner, DnsResolverInterface } from '../domain/dns-resolver.js';
import { DomainVerifiedEvent } from '@eazzio/contracts';
import { Domain, Organization, DomainRepository, OrganizationRepository } from '@eazzio/domain';
import crypto from 'crypto';

export interface VerifyDomainInput {
  domainId: string;
  dkimSelector?: string;
}

export interface VerifyDomainResult {
  domainId: string;
  domainName: string;
  status: DomainVerificationStatus;
  isFullyVerified: boolean;
  dnsRecords: DetailedDnsRecordResult;
  event?: DomainVerifiedEvent;
}

export class AdminService {
  private readonly dnsRunner: Dns4CheckRunner;

  constructor(
    private readonly domainRepo?: DomainRepository,
    private readonly orgRepo?: OrganizationRepository,
    dnsResolver?: DnsResolverInterface,
  ) {
    this.dnsRunner = new Dns4CheckRunner(dnsResolver);
  }

  public async createOrganization(
    name: string,
    id: string = crypto.randomUUID(),
    policy: Record<string, unknown> = {},
  ): Promise<Organization> {
    const org = new Organization({
      id,
      name,
      policy,
      createdAt: new Date(),
    });

    if (this.orgRepo) {
      await this.orgRepo.save(org);
    }
    return org;
  }

  public async createDomain(params: {
    domainName: string;
    organizationId?: string | null;
    id?: string;
  }): Promise<Domain> {
    const cleanDomain = params.domainName.toLowerCase().trim();
    const id = params.id || crypto.randomUUID();

    const domain = new Domain({
      id,
      organizationId: params.organizationId,
      domainName: cleanDomain,
      verificationStatus: 'pending',
      mxVerified: false,
      spfVerified: false,
      dkimVerified: false,
      dmarcVerified: false,
      createdAt: new Date(),
    });

    if (this.domainRepo) {
      await this.domainRepo.save(domain);
    }
    return domain;
  }

  public async verifyDomain(input: VerifyDomainInput): Promise<VerifyDomainResult> {
    if (!this.domainRepo) {
      throw new Error('DomainRepository required for verification');
    }

    const domain = await this.domainRepo.findById(input.domainId);
    if (!domain) {
      throw new Error(`Domain not found: ${input.domainId}`);
    }

    const selector = input.dkimSelector || 'default';
    const dnsRecords = await this.dnsRunner.checkDomain(domain.domainName, selector);
    const { status, isFullyVerified } = DomainVerifier.evaluateStatus(dnsRecords);

    const now = new Date();
    await this.domainRepo.updateVerificationStatus(domain.id, {
      mxVerified: dnsRecords.mx,
      spfVerified: dnsRecords.spf,
      dkimVerified: dnsRecords.dkim,
      dmarcVerified: dnsRecords.dmarc,
      verificationStatus: status,
      activatedAt: isFullyVerified ? now : null,
    });

    let event: DomainVerifiedEvent | undefined;
    if (isFullyVerified) {
      event = {
        eventId: crypto.randomUUID(),
        occurredAt: now.toISOString(),
        domainId: domain.id,
        domainName: domain.domainName,
      };
    }

    return {
      domainId: domain.id,
      domainName: domain.domainName,
      status,
      isFullyVerified,
      dnsRecords,
      event,
    };
  }

  public async listDomains(organizationId: string): Promise<Domain[]> {
    if (!this.domainRepo) return [];
    return this.domainRepo.findByOrganizationId(organizationId);
  }
}
