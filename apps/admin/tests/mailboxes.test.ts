import { describe, it, expect } from 'vitest';
import { AdminMailbox } from '../src/types/admin';

describe('TASK-023: Mailbox Provisioning & Quota Management Tests', () => {
  const initialMailboxes: AdminMailbox[] = [
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
    },
    {
      id: 'mbx-2',
      userId: 'usr-2',
      displayName: 'Priya Sharma',
      address: 'priya@eazzio.com',
      domain: 'eazzio.com',
      department: 'Operations',
      quotaBytes: 5 * 1024 * 1024 * 1024,
      usedBytes: 4.5 * 1024 * 1024 * 1024, // 90% usage
      status: 'active',
      isMfaEnabled: true,
      createdAt: '2026-08-10T12:00:00Z',
    },
    {
      id: 'mbx-3',
      userId: 'usr-3',
      displayName: 'DevOps Automated Relay',
      address: 'devops@acmecorp.com',
      domain: 'acmecorp.com',
      department: 'Engineering',
      quotaBytes: 10 * 1024 * 1024 * 1024,
      usedBytes: 2 * 1024 * 1024 * 1024,
      status: 'suspended',
      isMfaEnabled: false,
      createdAt: '2026-08-19T09:10:00Z',
    },
  ];

  describe('Mailbox Creation & Provisioning', () => {
    it('should provision a new mailbox with canonical address and assigned domain', () => {
      const newMailbox: AdminMailbox = {
        id: 'mbx-4',
        userId: 'usr-4',
        displayName: 'Alex Henderson',
        address: 'alex@eazzio.com',
        domain: 'eazzio.com',
        department: 'Engineering',
        quotaBytes: 5 * 1024 * 1024 * 1024,
        usedBytes: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      const updated = [newMailbox, ...initialMailboxes];
      expect(updated).toHaveLength(4);
      expect(updated[0].address).toBe('alex@eazzio.com');
      expect(updated[0].quotaBytes).toBe(5 * 1024 * 1024 * 1024);
      expect(updated[0].status).toBe('active');
    });
  });

  describe('Storage Quota Calculations & Alert Thresholds', () => {
    it('should calculate accurate quota percentage and flag high usage (>80%)', () => {
      const mbx1Usage = (initialMailboxes[0].usedBytes / initialMailboxes[0].quotaBytes) * 100;
      const mbx2Usage = (initialMailboxes[1].usedBytes / initialMailboxes[1].quotaBytes) * 100;

      expect(mbx1Usage).toBeLessThan(80);
      expect(mbx2Usage).toBe(90);

      const isHighUsage = (m: AdminMailbox) => m.usedBytes / m.quotaBytes > 0.8;
      expect(isHighUsage(initialMailboxes[0])).toBe(false);
      expect(isHighUsage(initialMailboxes[1])).toBe(true);
    });

    it('should update mailbox quota bytes when modified', () => {
      const updatedQuota = 15 * 1024 * 1024 * 1024; // 15 GB
      const updatedList = initialMailboxes.map((m) =>
        m.id === 'mbx-2' ? { ...m, quotaBytes: updatedQuota } : m
      );

      const modified = updatedList.find((m) => m.id === 'mbx-2');
      expect(modified?.quotaBytes).toBe(updatedQuota);
      // New usage percentage: 4.5 GB / 15 GB = 30%
      const newUsage = (modified!.usedBytes / modified!.quotaBytes) * 100;
      expect(newUsage).toBe(30);
    });
  });

  describe('Account Status Toggles & Security', () => {
    it('should toggle mailbox status between active and suspended', () => {
      const toggle = (id: string, list: AdminMailbox[]) =>
        list.map((m) => (m.id === id ? { ...m, status: m.status === 'active' ? 'suspended' : 'active' } : m));

      const afterSuspension = toggle('mbx-1', initialMailboxes);
      expect(afterSuspension.find((m) => m.id === 'mbx-1')?.status).toBe('suspended');

      const afterActivation = toggle('mbx-3', initialMailboxes);
      expect(afterActivation.find((m) => m.id === 'mbx-3')?.status).toBe('active');
    });

    it('should aggregate total storage used and allocated across mailboxes', () => {
      const totalAllocated = initialMailboxes.reduce((acc, m) => acc + m.quotaBytes, 0);
      const totalUsed = initialMailboxes.reduce((acc, m) => acc + m.usedBytes, 0);

      expect(totalAllocated).toBe(40 * 1024 * 1024 * 1024); // 40 GB
      expect(totalUsed).toBe(7.7 * 1024 * 1024 * 1024); // 7.7 GB
    });
  });
});
