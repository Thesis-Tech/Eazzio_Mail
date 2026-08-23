import dns from 'dns';
import { DetailedDnsRecordResult } from './domain-verifier.js';

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
    dkimSelector: string = 'mail',
  ): Promise<DetailedDnsRecordResult> {
    const cleanDomain = domainName.toLowerCase().trim();

    // 1. MX Record Check
    const mxRecords = await this.resolver.resolveMx(cleanDomain);
    const mxStrings = mxRecords.map((r) => `${r.priority} ${r.exchange}`);
    const mx = mxRecords.length > 0;
    const isCloudflareMx = mxRecords.some((r) => r.exchange.toLowerCase().includes('cloudflare.net'));

    // 2. SPF Record Check
    const domainTxtRecords = await this.resolver.resolveTxt(cleanDomain);
    const flatDomainTxt = domainTxtRecords.map((chunk) => chunk.join(''));
    const spfRecord = flatDomainTxt.find((txt) => txt.toLowerCase().startsWith('v=spf1'));
    const spf = Boolean(spfRecord);
    const hasBrevoSpf = Boolean(spfRecord && spfRecord.toLowerCase().includes('spf.brevo.com'));

    // 3. DKIM Record Check across selectors (e.g. mail, eazzio, default, or custom)
    const selectorsToTry = Array.from(new Set([dkimSelector, 'mail', 'eazzio', 'default'])).filter(Boolean);
    let dkim = false;
    let dkimRecord: string | undefined;
    let matchedSelector: string | undefined;

    for (const selector of selectorsToTry) {
      const dkimHost = `${selector}._domainkey.${cleanDomain}`;
      const dkimTxtRecords = await this.resolver.resolveTxt(dkimHost);
      const flatDkimTxt = dkimTxtRecords.map((chunk) => chunk.join(''));
      const found = flatDkimTxt.find((txt) => txt.includes('v=DKIM1') && txt.includes('p='));
      if (found) {
        dkim = true;
        dkimRecord = found;
        matchedSelector = selector;
        break;
      }
    }

    const isBrevoDkim = Boolean(matchedSelector === 'mail' || (dkimRecord && dkimRecord.length > 50));

    // 4. DMARC Record Check: _dmarc.<domain>
    const dmarcHost = `_dmarc.${cleanDomain}`;
    const dmarcTxtRecords = await this.resolver.resolveTxt(dmarcHost);
    const flatDmarcTxt = dmarcTxtRecords.map((chunk) => chunk.join(''));
    const dmarcRecord = flatDmarcTxt.find((txt) => txt.toLowerCase().startsWith('v=dmarc1'));
    const dmarc = Boolean(dmarcRecord);
    const policyMatch = dmarcRecord ? dmarcRecord.match(/p=([a-z]+)/i) : null;
    const policy = policyMatch ? policyMatch[1] : undefined;

    return {
      mx,
      spf,
      dkim,
      dmarc,
      details: {
        mx: { verified: mx, records: mxStrings, isCloudflare: isCloudflareMx },
        spf: { verified: spf, rawRecord: spfRecord, hasBrevo: hasBrevoSpf },
        dkim: { verified: dkim, selectorUsed: matchedSelector || dkimSelector, rawRecord: dkimRecord, isBrevo: isBrevoDkim },
        dmarc: { verified: dmarc, rawRecord: dmarcRecord, policy },
      },
    };
  }
}
