import { DomainVerifier, DnsRecordResult } from '../domain/domain-verifier.js';
import { DomainVerifiedEvent } from '@eazzio/contracts';

export interface ProvisionOrgInput {
  name: string;
  adminEmail: string;
  policy?: Record<string, unknown>;
}

export interface VerifyDomainInput {
  domainId: string;
  domainName: string;
  dnsRecords: DnsRecordResult;
}

export class AdminService {
  public static verifyDomain(input: VerifyDomainInput): {
    status: string;
    isFullyVerified: boolean;
    event?: DomainVerifiedEvent;
  } {
    const { status, isFullyVerified } = DomainVerifier.evaluateStatus(input.dnsRecords);

    if (isFullyVerified) {
      const event: DomainVerifiedEvent = {
        eventId: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
        domainId: input.domainId,
        domainName: input.domainName
      };
      return { status, isFullyVerified, event };
    }

    return { status, isFullyVerified };
  }
}
