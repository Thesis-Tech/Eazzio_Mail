import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const mailboxes = [
    {
      id: 'mbx-1',
      userId: 'usr-1',
      displayName: 'Rahul Kumar',
      address: 'rahul@eazzio.com',
      domain: 'eazzio.com',
      department: 'Leadership',
      quotaBytes: 25 * 1024 * 1024 * 1024,
      usedBytes: 1.2 * 1024 * 1024 * 1024,
      status: 'active',
      isMfaEnabled: true,
      createdAt: '2026-08-01T00:00:00Z',
      lastLoginAt: '10 mins ago',
    },
    {
      id: 'mbx-2',
      userId: 'usr-2',
      displayName: 'Priya Sharma',
      address: 'priya@eazzio.com',
      domain: 'eazzio.com',
      department: 'Operations',
      quotaBytes: 5 * 1024 * 1024 * 1024,
      usedBytes: 512 * 1024 * 1024,
      status: 'active',
      isMfaEnabled: true,
      createdAt: '2026-08-10T12:00:00Z',
      lastLoginAt: 'Yesterday',
    },
    {
      id: 'mbx-3',
      userId: 'usr-3',
      displayName: 'Executive Desk',
      address: 'ceo@eazzio.com',
      domain: 'eazzio.com',
      department: 'Leadership',
      quotaBytes: 50 * 1024 * 1024 * 1024,
      usedBytes: 4.8 * 1024 * 1024 * 1024,
      status: 'active',
      isMfaEnabled: true,
      createdAt: '2026-08-15T08:00:00Z',
      lastLoginAt: '1 hour ago',
    },
  ];

  return NextResponse.json({ success: true, data: mailboxes });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    if (!payload.address || !payload.displayName) {
      return NextResponse.json(
        { success: false, error: 'Display name and address are required' },
        { status: 400 }
      );
    }

    const newMailbox = {
      id: payload.id || `mbx-${Date.now()}`,
      userId: payload.userId || `usr-${Date.now()}`,
      displayName: payload.displayName,
      address: payload.address.toLowerCase().trim(),
      domain: payload.domain || payload.address.split('@')[1],
      department: payload.department || 'Engineering',
      quotaBytes: payload.quotaBytes || 5 * 1024 * 1024 * 1024,
      usedBytes: payload.usedBytes || 0,
      status: payload.status || 'active',
      isMfaEnabled: payload.isMfaEnabled || false,
      createdAt: new Date().toISOString(),
      lastLoginAt: 'Never',
    };

    return NextResponse.json({ success: true, data: newMailbox });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to provision mailbox' },
      { status: 500 }
    );
  }
}
