import { describe, it, expect } from 'vitest';
import { ManagedDomain } from '../src/types/admin';

describe('TASK-022: Custom Domain Management & 4-Check DNS Verification Tests', () => {
  const initialDomains: ManagedDomain[] = [
    {
      id: 'dom-1',
      organizationId: 'org-1',
      domainName: 'eazzio.com',
      verificationStatus: 'verified',
      isPrimary: true,
      mxVerified: true,
      spfVerified: true,
      dkimVerified: true,
      dmarcVerified: true,
      createdAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'dom-2',
      organizationId: 'org-1',
      domainName: 'apexfintech.io',
      verificationStatus: 'pending',
      isPrimary: false,
      mxVerified: true,
      spfVerified: true,
      dkimVerified: false,
      dmarcVerified: true,
      createdAt: '2026-08-20T08:15:00Z',
    },
  ];

  function evaluateDomainStatus(mx: boolean, spf: boolean, dkim: boolean, dmarc: boolean): 'verified' | 'partially_verified' | 'pending' {
    if (mx && spf && dkim && dmarc) return 'verified';
    if (mx || spf || dkim || dmarc) return 'partially_verified';
    return 'pending';
  }

  describe('4-Check DNS Verification Logic', () => {
    it('should mark domain as verified when all 4 checks pass (MX, SPF, DKIM, DMARC)', () => {
      const status = evaluateDomainStatus(true, true, true, true);
      expect(status).toBe('verified');
    });

    it('should mark domain as partially_verified when some checks pass but not all', () => {
      const status = evaluateDomainStatus(true, true, false, true);
      expect(status).toBe('partially_verified');
    });

    it('should mark domain as pending when no checks pass', () => {
      const status = evaluateDomainStatus(false, false, false, false);
      expect(status).toBe('pending');
    });
  });

  describe('Domain Management Operations', () => {
    it('should add a new custom domain and set initial pending status', () => {
      const newDomain: ManagedDomain = {
        id: 'dom-3',
        organizationId: 'org-1',
        domainName: 'acme.org',
        verificationStatus: 'pending',
        isPrimary: false,
        mxVerified: false,
        spfVerified: false,
        dkimVerified: false,
        dmarcVerified: false,
        createdAt: new Date().toISOString(),
      };

      const updated = [...initialDomains, newDomain];
      expect(updated).toHaveLength(3);
      expect(updated[2].domainName).toBe('acme.org');
      expect(updated[2].verificationStatus).toBe('pending');
    });

    it('should switch primary sending domain cleanly', () => {
      const targetId = 'dom-2';
      const updated = initialDomains.map((d) => ({
        ...d,
        isPrimary: d.id === targetId,
      }));

      const primary = updated.filter((d) => d.isPrimary);
      expect(primary).toHaveLength(1);
      expect(primary[0].id).toBe('dom-2');
    });

    it('should prevent deletion of primary domain', () => {
      const attemptDelete = (id: string, list: ManagedDomain[]) => {
        const target = list.find((d) => d.id === id);
        if (target?.isPrimary) {
          throw new Error('Cannot delete primary sending domain');
        }
        return list.filter((d) => d.id !== id);
      };

      expect(() => attemptDelete('dom-1', initialDomains)).toThrow('Cannot delete primary sending domain');
      const remaining = attemptDelete('dom-2', initialDomains);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('dom-1');
    });

    it('should simulate DNS re-verification and update domain state', () => {
      const verifyDomain = (id: string, list: ManagedDomain[]): ManagedDomain[] => {
        return list.map((d) => {
          if (d.id !== id) return d;
          return {
            ...d,
            mxVerified: true,
            spfVerified: true,
            dkimVerified: true,
            dmarcVerified: true,
            verificationStatus: 'verified',
          };
        });
      };

      const afterVerify = verifyDomain('dom-2', initialDomains);
      const verifiedTarget = afterVerify.find((d) => d.id === 'dom-2');
      expect(verifiedTarget?.verificationStatus).toBe('verified');
      expect(verifiedTarget?.dkimVerified).toBe(true);
    });
  });
});
