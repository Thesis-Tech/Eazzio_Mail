import dns from 'dns';
import { DnsRecordResult } from './domain-verifier.js';

export interface DnsResolverInterface {
  resolveMx(domain: string): Promise<dns.MxRecord[]>;
  resolveTxt(domain: string): Promise<string[][]>;
}

export class NodeDnsResolver implements DnsResolverInterface {
  private readonly resolver: dns.promises.Resolver;

  constructor(nameServers?: string[]) {
    this.resolver = new dns.promises.Resolver();
    if (nameServers && nameServers.length > 0) {
      this.resolver.setServers(nameServers);
    }
  }

  public async resolveMx(domain: string): Promise<dns.MxRecord[]> {
    try {
      return await this.resolver.resolveMx(domain);
    } catch {
      return [];
    }
  }

  public async resolveTxt(domain: string): Promise<string[][]> {
    try {
      return await this.resolver.resolveTxt(domain);
    } catch {
      return [];
    }
  }
}

export class Dns4CheckRunner {
  constructor(private readonly resolver: DnsResolverInterface = new NodeDnsResolver()) {}

  public async checkDomain(
    domainName: string,
    dkimSelector: string = 'default',
  ): Promise<DnsRecordResult> {
    const cleanDomain = domainName.toLowerCase().trim();

    // 1. MX Record Check
    const mxRecords = await this.resolver.resolveMx(cleanDomain);
    const mx = mxRecords.length > 0;

    // 2. SPF Record Check
    const domainTxtRecords = await this.resolver.resolveTxt(cleanDomain);
    const flatDomainTxt = domainTxtRecords.map((chunk) => chunk.join(''));
    const spf = flatDomainTxt.some((txt) => txt.toLowerCase().startsWith('v=spf1'));

    // 3. DKIM Record Check: <selector>._domainkey.<domain>
    const dkimHost = `${dkimSelector}._domainkey.${cleanDomain}`;
    const dkimTxtRecords = await this.resolver.resolveTxt(dkimHost);
    const flatDkimTxt = dkimTxtRecords.map((chunk) => chunk.join(''));
    const dkim = flatDkimTxt.some((txt) => txt.includes('v=DKIM1') && txt.includes('p='));

    // 4. DMARC Record Check: _dmarc.<domain>
    const dmarcHost = `_dmarc.${cleanDomain}`;
    const dmarcTxtRecords = await this.resolver.resolveTxt(dmarcHost);
    const flatDmarcTxt = dmarcTxtRecords.map((chunk) => chunk.join(''));
    const dmarc = flatDmarcTxt.some((txt) => txt.toLowerCase().startsWith('v=dmarc1'));

    return { mx, spf, dkim, dmarc };
  }
}
