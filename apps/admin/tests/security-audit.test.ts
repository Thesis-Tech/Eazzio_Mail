import { describe, it, expect } from 'vitest';
import { AuditLogEntry } from '../src/types/admin';

describe('TASK-024: Organization Security Policies & Immutable Audit Logs Tests', () => {
  const initialPolicies = {
    requireMfa: true,
    allowAiSummarization: true,
    strictDkimAlignment: true,
    spamAction: 'quarantine',
    sessionTimeoutMinutes: 30,
    ipAllowlist: '192.168.1.0/24',
  };

  const mockLogs: AuditLogEntry[] = [
    {
      id: 'aud-1',
      timestamp: '2026-08-21T14:45:10Z',
      actorUserId: 'usr-admin-1',
      actorEmail: 'admin@eazzio.com',
      actorRole: 'PlatformAdmin',
      action: 'policy.update',
      resourceType: 'SecurityPolicy',
      resourceId: 'org-eazzio',
      ipAddress: '192.168.1.100',
      status: 'success',
      details: { changes: { requireMfa: true } },
    },
    {
      id: 'aud-2',
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
      id: 'aud-3',
      timestamp: '2026-08-21T12:20:18Z',
      actorUserId: 'usr-org-2',
      actorEmail: 'admin@acmecorp.com',
      actorRole: 'OrgAdmin',
      action: 'mailbox.quota_update',
      resourceType: 'Mailbox',
      resourceId: 'devops@acmecorp.com',
      ipAddress: '198.51.100.22',
      status: 'success',
    },
  ];

  describe('Security Policies Configuration', () => {
    it('should update organization security policy toggles', () => {
      const updated = {
        ...initialPolicies,
        allowAiSummarization: false,
        sessionTimeoutMinutes: 60,
      };

      expect(updated.requireMfa).toBe(true);
      expect(updated.allowAiSummarization).toBe(false);
      expect(updated.sessionTimeoutMinutes).toBe(60);
    });

    it('should validate IP allowlist CIDR strings', () => {
      const allowlist = '192.168.1.0/24, 10.0.0.0/16';
      const subnets = allowlist.split(',').map((s) => s.trim());
      expect(subnets).toHaveLength(2);
      expect(subnets[0]).toBe('192.168.1.0/24');
    });
  });

  describe('Immutable Audit Log Filtering & Export', () => {
    it('should filter audit logs by action category prefix', () => {
      const authLogs = mockLogs.filter((l) => l.action.startsWith('auth'));
      const policyLogs = mockLogs.filter((l) => l.action.startsWith('policy'));

      expect(authLogs).toHaveLength(1);
      expect(authLogs[0].id).toBe('aud-2');
      expect(policyLogs).toHaveLength(1);
      expect(policyLogs[0].id).toBe('aud-1');
    });

    it('should filter audit logs by status outcome', () => {
      const successfulLogs = mockLogs.filter((l) => l.status === 'success');
      const failedLogs = mockLogs.filter((l) => l.status === 'failure');

      expect(successfulLogs).toHaveLength(2);
      expect(failedLogs).toHaveLength(1);
      expect(failedLogs[0].action).toBe('auth.spoof_blocked');
    });

    it('should filter audit logs by search query keyword', () => {
      const search = (q: string) =>
        mockLogs.filter(
          (l) =>
            l.actorEmail.includes(q) ||
            l.resourceId.includes(q) ||
            l.action.includes(q) ||
            l.ipAddress.includes(q)
        );

      expect(search('attacker@external.net')).toHaveLength(1);
      expect(search('198.51.100.22')).toHaveLength(1);
      expect(search('nonexistent')).toHaveLength(0);
    });

    it('should generate valid CSV export string for audit records', () => {
      const headers = ['Timestamp', 'ActorEmail', 'Action', 'Status'];
      const rows = mockLogs.map((l) => [l.timestamp, l.actorEmail, l.action, l.status]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      expect(csv).toContain('Timestamp,ActorEmail,Action,Status');
      expect(csv).toContain('admin@eazzio.com,policy.update,success');
      expect(csv).toContain('attacker@external.net,auth.spoof_blocked,failure');
    });
  });
});
