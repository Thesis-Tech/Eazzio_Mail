import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { domainId, domainName } = await req.json();

    if (!domainName || typeof domainName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid domainName is required' },
        { status: 400 }
      );
    }

    const cleanDomain = domainName.toLowerCase().trim();

    // Perform live simulation / 4-check evaluation
    // If domain contains "fail" or "pending", simulate partial check
    const isMockFail = cleanDomain.includes('fail') || cleanDomain.includes('pending');

    const result = {
      domainId: domainId || `dom-${Date.now()}`,
      domainName: cleanDomain,
      mxVerified: true,
      spfVerified: true,
      dkimVerified: !isMockFail,
      dmarcVerified: true,
      verificationStatus: isMockFail ? 'partially_verified' : 'verified',
      isFullyVerified: !isMockFail,
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
