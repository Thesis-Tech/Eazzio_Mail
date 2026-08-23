import { NextRequest, NextResponse } from 'next/server';
import { Dns4CheckRunner, DomainVerifier } from '@eazzio/admin-service';

export async function POST(req: NextRequest) {
  try {
    const { domainId, domainName, dkimSelector = 'mail' } = await req.json();

    if (!domainName || typeof domainName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid domainName is required' },
        { status: 400 }
      );
    }

    const cleanDomain = domainName.toLowerCase().trim();
    const runner = new Dns4CheckRunner();
    const dnsResult = await runner.checkDomain(cleanDomain, dkimSelector);
    const { status, isFullyVerified } = DomainVerifier.evaluateStatus(dnsResult);

    const result = {
      domainId: domainId || `dom-${Date.now()}`,
      domainName: cleanDomain,
      mxVerified: dnsResult.mx,
      spfVerified: dnsResult.spf,
      dkimVerified: dnsResult.dkim,
      dmarcVerified: dnsResult.dmarc,
      verificationStatus: status,
      isFullyVerified,
      details: dnsResult.details,
      evaluatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Domain DNS verification error' },
      { status: 500 }
    );
  }
}
