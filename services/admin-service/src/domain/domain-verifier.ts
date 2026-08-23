export interface DnsRecordResult {
  mx: boolean;
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
}

export interface DetailedDnsRecordResult extends DnsRecordResult {
  details?: {
    mx: { verified: boolean; records: string[]; isCloudflare: boolean };
    spf: { verified: boolean; rawRecord?: string; hasBrevo: boolean };
    dkim: { verified: boolean; selectorUsed?: string; rawRecord?: string; isBrevo: boolean };
    dmarc: { verified: boolean; rawRecord?: string; policy?: string };
  };
}

export type DomainVerificationStatus = 'pending' | 'partially_verified' | 'verified' | 'failed';

export class DomainVerifier {
  // Domain 4-check verification state machine (FR-DOM-02, LLD.md Section 5.3)
  public static evaluateStatus(dns: DnsRecordResult): {
    status: DomainVerificationStatus;
    isFullyVerified: boolean;
  } {
    const isFullyVerified = dns.mx && dns.spf && dns.dkim && dns.dmarc;
    if (isFullyVerified) {
      return { status: 'verified', isFullyVerified: true };
    }

    const anyCheckPassed = dns.mx || dns.spf || dns.dkim || dns.dmarc;
    if (anyCheckPassed) {
      return { status: 'partially_verified', isFullyVerified: false };
    }

    return { status: 'pending', isFullyVerified: false };
  }
}
