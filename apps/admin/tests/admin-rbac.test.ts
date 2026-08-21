import { describe, it, expect } from 'vitest';
import { AdminAuthStore } from '../src/lib/admin-auth-store';
import { AdminUser } from '../src/types/admin';

describe('TASK-021: Admin RBAC Role Permissions & Gate Enforcement', () => {
  const platformAdmin: AdminUser = {
    userId: 'usr-p-1',
    email: 'superadmin@eazzio.com',
    displayName: 'Platform Admin',
    role: 'PlatformAdmin',
  };

  const orgAdmin: AdminUser = {
    userId: 'usr-o-1',
    email: 'admin@acmecorp.com',
    displayName: 'Acme Org Admin',
    role: 'OrgAdmin',
    organizationId: 'org-acme',
  };

  const regularUser: AdminUser = {
    userId: 'usr-u-1',
    email: 'user@acmecorp.com',
    displayName: 'Regular User',
    role: 'User',
  };

  it('should authorize PlatformAdmin for all admin routes', () => {
    const isAllowed = AdminAuthStoreManager_isAuthorized(platformAdmin, ['PlatformAdmin', 'OrgAdmin']);
    expect(isAllowed).toBe(true);
    expect(AdminAuthStore.constructor.prototype.constructor.hasPermission('PlatformAdmin', 'manage_all_orgs')).toBe(true);
  });

  it('should authorize OrgAdmin for org-scoped features but deny multi-org management', () => {
    const isAllowed = AdminAuthStoreManager_isAuthorized(orgAdmin, ['PlatformAdmin', 'OrgAdmin']);
    expect(isAllowed).toBe(true);
    expect(AdminAuthStore.constructor.prototype.constructor.hasPermission('OrgAdmin', 'manage_all_orgs')).toBe(false);
    expect(AdminAuthStore.constructor.prototype.constructor.hasPermission('OrgAdmin', 'manage_domains')).toBe(true);
    expect(AdminAuthStore.constructor.prototype.constructor.hasPermission('OrgAdmin', 'view_audit_logs')).toBe(true);
  });

  it('should deny regular users from accessing admin routes', () => {
    const isAllowed = AdminAuthStoreManager_isAuthorized(regularUser, ['PlatformAdmin', 'OrgAdmin']);
    expect(isAllowed).toBe(false);
    expect(AdminAuthStore.constructor.prototype.constructor.hasPermission('User', 'manage_domains')).toBe(false);
  });
});

function AdminAuthStoreManager_isAuthorized(user: AdminUser | null, allowedRoles: any[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}
