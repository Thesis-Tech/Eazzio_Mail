import crypto from 'crypto';
import dns from 'dns/promises';
import { PostgresDomainRepository } from '@eazzio/infra-adapters';
import { Domain } from '@eazzio/domain';
import { AppError } from '../middleware/error-handler.js';

export interface DnsRecordRecommendation {
  recordType: 'MX' | 'TXT' | 'CNAME' | 'A';
  host: string;
  value: string;
  priority?: number;
  purpose: 'MX Routing' | 'SPF Authentication' | 'DKIM Signing' | 'DMARC Policy';
  status: 'verified' | 'unverified' | 'failed';
}

export interface DomainDetailsResponse {
  id: string;
  organizationId: string | null;
  domainName: string;
  verificationStatus: 'pending' | 'partially_verified' | 'verified' | 'failed';
  mxVerified: boolean;
  spfVerified: boolean;
  dkimVerified: boolean;
  dmarcVerified: boolean;
  dkimPublicKey: string;
  dnsRecords: DnsRecordRecommendation[];
  createdAt: string;
  activatedAt: string | null;
}

export interface VerificationResult {
  domainId: string;
  domainName: string;
  verificationStatus: 'pending' | 'partially_verified' | 'verified' | 'failed';
  mxVerified: boolean;
  spfVerified: boolean;
  dkimVerified: boolean;
  dmarcVerified: boolean;
  details: {
    mx: { found: string[]; matchesExpected: boolean };
    spf: { record: string | null; matchesExpected: boolean };
    dkim: { record: string | null; matchesExpected: boolean };
    dmarc: { record: string | null; matchesExpected: boolean };
  };
}

export class DomainService {
  constructor(private readonly domainRepo: PostgresDomainRepository) {}

  public static generateDkimKeyPair(): { privateKeyPem: string; publicKeyBase64: string } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Extract base64 without PEM headers for DNS p= field
    const publicKeyBase64 = publicKey
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\r?\n/g, '')
      .trim();


    return { privateKeyPem: privateKey, publicKeyBase64 };
  }

  public static buildRecommendedDnsRecords(
    domainName: string,
    publicKeyBase64: string,
    verification: { mx: boolean; spf: boolean; dkim: boolean; dmarc: boolean },
  ): DnsRecordRecommendation[] {
    const mtaHost = process.env.DIRECT_MTA_HOST || 'mail.eazzio.com';
    return [
      {
        recordType: 'MX',
        host: '@',
        priority: 10,
        value: mtaHost,
        purpose: 'MX Routing',
        status: verification.mx ? 'verified' : 'unverified',
      },
      {
        recordType: 'TXT',
        host: '@',
        value: 'v=spf1 include:spf.eazzio.com ~all',
        purpose: 'SPF Authentication',
        status: verification.spf ? 'verified' : 'unverified',
      },
      {
        recordType: 'TXT',
        host: 'default._domainkey',
        value: `v=DKIM1; k=rsa; p=${publicKeyBase64}`,
        purpose: 'DKIM Signing',
        status: verification.dkim ? 'verified' : 'unverified',
      },
      {
        recordType: 'TXT',
        host: '_dmarc',
        value: `v=DMARC1; p=none; rua=mailto:dmarc-reports@${domainName}; pct=100; sp=none; aspf=r; adkim=r`,
        purpose: 'DMARC Policy',
        status: verification.dmarc ? 'verified' : 'unverified',
      },
    ];
  }

  public async registerDomain(
    domainNameRaw: string,
    organizationId?: string | null,
  ): Promise<DomainDetailsResponse> {
    const domainName = domainNameRaw.trim().toLowerCase();
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
    if (!domainRegex.test(domainName)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid domain name format', 400);
    }

    const existing = await this.domainRepo.findByName(domainName);
    if (existing) {
      throw new AppError('DOMAIN_EXISTS', `Domain ${domainName} is already registered`, 409);
    }


    // Generate dedicated 2048-bit RSA DKIM Keypair
    const { privateKeyPem, publicKeyBase64 } = DomainService.generateDkimKeyPair();

    const domain = new Domain({
      id: crypto.randomUUID(),
      organizationId: organizationId || null,
      domainName,
      verificationStatus: 'pending',
      mxVerified: false,
      spfVerified: false,
      dkimVerified: false,
      dmarcVerified: false,
      dkimPrivateKeyRef: privateKeyPem,
      createdAt: new Date(),
      activatedAt: null,
    });

    await this.domainRepo.save(domain);

    const dnsRecords = DomainService.buildRecommendedDnsRecords(domainName, publicKeyBase64, {
      mx: false,
      spf: false,
      dkim: false,
      dmarc: false,
    });

    return {
      id: domain.id,
      organizationId: domain.organizationId ?? null,
      domainName: domain.domainName,
      verificationStatus: domain.verificationStatus,
      mxVerified: domain.mxVerified,
      spfVerified: domain.spfVerified,
      dkimVerified: domain.dkimVerified,
      dmarcVerified: domain.dmarcVerified,
      dkimPublicKey: publicKeyBase64,
      dnsRecords,
      createdAt: domain.createdAt.toISOString(),
      activatedAt: domain.activatedAt ? domain.activatedAt.toISOString() : null,
    };
  }

  public async getDomainById(id: string): Promise<DomainDetailsResponse> {
    const domain = await this.domainRepo.findById(id);
    if (!domain) {
      throw new AppError('NOT_FOUND', 'Domain not found', 404);
    }


    // Derive public key from stored private key
    let publicKeyBase64 = '';
    if (domain.dkimPrivateKeyRef) {
      try {
        const pubKeyObject = crypto.createPublicKey(domain.dkimPrivateKeyRef);
        publicKeyBase64 = pubKeyObject
          .export({ type: 'spki', format: 'pem' })
          .toString()
          .replace(/-----BEGIN PUBLIC KEY-----/g, '')
          .replace(/-----END PUBLIC KEY-----/g, '')
          .replace(/\r?\n/g, '')
          .trim();
      } catch {
        publicKeyBase64 = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...';
      }
    }

    const dnsRecords = DomainService.buildRecommendedDnsRecords(domain.domainName, publicKeyBase64, {
      mx: domain.mxVerified,
      spf: domain.spfVerified,
      dkim: domain.dkimVerified,
      dmarc: domain.dmarcVerified,
    });

    return {
      id: domain.id,
      organizationId: domain.organizationId ?? null,
      domainName: domain.domainName,
      verificationStatus: domain.verificationStatus,
      mxVerified: domain.mxVerified,
      spfVerified: domain.spfVerified,
      dkimVerified: domain.dkimVerified,
      dmarcVerified: domain.dmarcVerified,
      dkimPublicKey: publicKeyBase64,
      dnsRecords,
      createdAt: domain.createdAt.toISOString(),
      activatedAt: domain.activatedAt ? domain.activatedAt.toISOString() : null,
    };

  }

  public async listDomains(organizationId?: string | null): Promise<DomainDetailsResponse[]> {
    let domains: Domain[];
    if (organizationId) {
      domains = await this.domainRepo.findByOrganizationId(organizationId);
    } else {
      // Fetch all visible domains
      const rows = await (this.domainRepo as any).db.query(
        `SELECT id, organization_id, domain_name, verification_status, mx_verified,
                spf_verified, dkim_verified, dmarc_verified, dkim_private_key_ref,
                created_at, activated_at
         FROM domains
         ORDER BY created_at DESC`,
      );
      domains = rows.map((r: any) => (this.domainRepo as any).mapRowToDomain(r));
    }

    return Promise.all(domains.map((d) => this.getDomainById(d.id)));
  }

  public async verifyDomainDns(id: string): Promise<VerificationResult> {
    const domain = await this.domainRepo.findById(id);
    if (!domain) {
      throw new AppError('NOT_FOUND', 'Domain not found', 404);
    }


    const domainName = domain.domainName;
    const details: VerificationResult['details'] = {
      mx: { found: [], matchesExpected: false },
      spf: { record: null, matchesExpected: false },
      dkim: { record: null, matchesExpected: false },
      dmarc: { record: null, matchesExpected: false },
    };

    // 1. Verify MX
    try {
      const mxRecords = await dns.resolveMx(domainName);
      details.mx.found = mxRecords.map((m) => `${m.priority} ${m.exchange}`);
      // Accept if any MX points to mail.eazzio.com or custom server
      details.mx.matchesExpected = mxRecords.some((m) =>
        m.exchange.toLowerCase().includes('eazzio') || m.exchange.toLowerCase().includes('mail')
      );
    } catch {
      details.mx.matchesExpected = false;
    }

    // 2. Verify SPF
    try {
      const txtRecords = await dns.resolveTxt(domainName);
      const flattened = txtRecords.map((chunks) => chunks.join(''));
      const spf = flattened.find((t) => t.startsWith('v=spf1'));
      if (spf) {
        details.spf.record = spf;
        details.spf.matchesExpected = true;
      }
    } catch {
      details.spf.matchesExpected = false;
    }

    // 3. Verify DKIM
    try {
      const dkimTxt = await dns.resolveTxt(`default._domainkey.${domainName}`);
      const flattened = dkimTxt.map((chunks) => chunks.join(''));
      const dkimRecord = flattened.find((t) => t.includes('v=DKIM1'));
      if (dkimRecord) {
        details.dkim.record = dkimRecord;
        details.dkim.matchesExpected = true;
      }
    } catch {
      details.dkim.matchesExpected = false;
    }

    // 4. Verify DMARC
    try {
      const dmarcTxt = await dns.resolveTxt(`_dmarc.${domainName}`);
      const flattened = dmarcTxt.map((chunks) => chunks.join(''));
      const dmarcRecord = flattened.find((t) => t.startsWith('v=DMARC1'));
      if (dmarcRecord) {
        details.dmarc.record = dmarcRecord;
        details.dmarc.matchesExpected = true;
      }
    } catch {
      details.dmarc.matchesExpected = false;
    }

    // Calculate aggregate verification state
    const mxOk = details.mx.matchesExpected;
    const spfOk = details.spf.matchesExpected;
    const dkimOk = details.dkim.matchesExpected;
    const dmarcOk = details.dmarc.matchesExpected;

    const count = [mxOk, spfOk, dkimOk, dmarcOk].filter(Boolean).length;
    let newStatus: 'pending' | 'partially_verified' | 'verified' | 'failed' = 'pending';
    if (count === 4) {
      newStatus = 'verified';
    } else if (count > 0) {
      newStatus = 'partially_verified';
    } else {
      newStatus = 'failed';
    }

    // Update database
    await (this.domainRepo as any).db.query(
      `UPDATE domains
       SET mx_verified = $1,
           spf_verified = $2,
           dkim_verified = $3,
           dmarc_verified = $4,
           verification_status = $5,
           activated_at = CASE WHEN $5 = 'verified' AND activated_at IS NULL THEN NOW() ELSE activated_at END
       WHERE id = $6`,
      [mxOk, spfOk, dkimOk, dmarcOk, newStatus, id],
    );

    return {
      domainId: domain.id,
      domainName: domain.domainName,
      verificationStatus: newStatus,
      mxVerified: mxOk,
      spfVerified: spfOk,
      dkimVerified: dkimOk,
      dmarcVerified: dmarcOk,
      details,
    };
  }

  public async deleteDomain(id: string): Promise<void> {
    const domain = await this.domainRepo.findById(id);
    if (!domain) {
      throw new AppError('NOT_FOUND', 'Domain not found', 404);
    }
    await (this.domainRepo as any).db.query(`DELETE FROM domains WHERE id = $1`, [id]);
  }

}
