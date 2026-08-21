import { NextRequest, NextResponse } from 'next/server';

let currentPolicies = {
  requireMfa: true,
  allowAiSummarization: true,
  strictDkimAlignment: true,
  spamAction: 'quarantine',
  sessionTimeoutMinutes: 30,
  ipAllowlist: '',
  updatedAt: new Date().toISOString(),
  updatedBy: 'admin@eazzio.com',
};

export async function GET() {
  return NextResponse.json({ success: true, data: currentPolicies });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    currentPolicies = {
      ...currentPolicies,
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json({ success: true, data: currentPolicies });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update security policies' },
      { status: 500 }
    );
  }
}
