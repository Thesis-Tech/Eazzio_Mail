import { NextRequest, NextResponse } from 'next/server';
import { AuditLogEntry } from '../../../types/admin';

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'aud-101',
    timestamp: '2026-08-21T14:45:10Z',
    actorUserId: 'usr-admin-1',
    actorEmail: 'admin@eazzio.com',
    actorRole: 'PlatformAdmin',
    action: 'policy.update',
    resourceType: 'SecurityPolicy',
    resourceId: 'org-eazzio',
    ipAddress: '192.168.1.100',
    status: 'success',
    details: { changes: { requireMfa: true, strictDkimAlignment: true } },
  },
  {
    id: 'aud-102',
    timestamp: '2026-08-21T14:30:25Z',
    actorUserId: 'usr-admin-1',
    actorEmail: 'admin@eazzio.com',
    actorRole: 'PlatformAdmin',
    action: 'mailbox.create',
    resourceType: 'Mailbox',
    resourceId: 'alex@eazzio.com',
    ipAddress: '192.168.1.100',
    status: 'success',
    details: { quotaBytes: 5368709120, department: 'Engineering' },
  },
  {
    id: 'aud-103',
    timestamp: '2026-08-21T14:15:00Z',
    actorUserId: 'usr-admin-1',
    actorEmail: 'admin@eazzio.com',
    actorRole: 'PlatformAdmin',
    action: 'domain.verify',
    resourceType: 'Domain',
    resourceId: 'eazzio.com',
    ipAddress: '192.168.1.100',
    status: 'success',
    details: { mx: true, spf: true, dkim: true, dmarc: true },
  },
  {
    id: 'aud-104',
    timestamp: '2026-08-21T13:50:42Z',
    actorUserId: 'usr-spoof-attacker',
    actorEmail: 'attacker@external.net',
    actorRole: 'User',
    action: 'auth.spoof_blocked',
    resourceType: 'Mailbox',
    resourceId: 'ceo@eazzio.com',
    ipAddress: '203.0.113.45',
    status: 'failure',
    details: { reason: 'Unauthorized sender identity verification rejection' },
  },
  {
    id: 'aud-105',
    timestamp: '2026-08-21T12:20:18Z',
    actorUserId: 'usr-org-2',
    actorEmail: 'admin@acmecorp.com',
    actorRole: 'OrgAdmin',
    action: 'mailbox.quota_update',
    resourceType: 'Mailbox',
    resourceId: 'devops@acmecorp.com',
    ipAddress: '198.51.100.22',
    status: 'success',
    details: { oldQuota: 5368709120, newQuota: 10737418240 },
  },
  {
    id: 'aud-106',
    timestamp: '2026-08-21T10:05:00Z',
    actorUserId: 'usr-admin-1',
    actorEmail: 'admin@eazzio.com',
    actorRole: 'PlatformAdmin',
    action: 'auth.login_2fa',
    resourceType: 'Session',
    resourceId: 'sess-84920',
    ipAddress: '192.168.1.100',
    status: 'success',
    details: { method: 'TOTP_AUTHENTICATOR' },
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const status = searchParams.get('status');
  const search = searchParams.get('search')?.toLowerCase();

  let logs = [...mockAuditLogs];

  if (action && action !== 'ALL') {
    logs = logs.filter((l) => l.action.startsWith(action));
  }

  if (status && status !== 'ALL') {
    logs = logs.filter((l) => l.status === status.toLowerCase());
  }

  if (search) {
    logs = logs.filter(
      (l) =>
        l.actorEmail.toLowerCase().includes(search) ||
        l.resourceId.toLowerCase().includes(search) ||
        l.ipAddress.includes(search) ||
        l.action.toLowerCase().includes(search)
    );
  }

  return NextResponse.json({ success: true, data: logs });
}
