import { describe, it, expect, beforeEach } from 'vitest';
import { AdminAuthStore } from '../src/lib/admin-auth-store';
import { AdminUser } from '../src/types/admin';

describe('TASK-021: Admin Portal Authentication & Session Tests', () => {
  beforeEach(() => {
    AdminAuthStore.clearSession();
  });

  it('should initialize with unauthenticated state when storage is empty', () => {
    const state = AdminAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.session).toBeNull();
  });

  it('should store and retrieve active admin session', () => {
    const adminUser: AdminUser = {
      userId: 'usr-admin-1',
      email: 'admin@eazzio.com',
      displayName: 'Global Admin',
      role: 'PlatformAdmin',
      organizationName: 'Global Platform',
    };

    AdminAuthStore.setSession({
      token: 'jwt-token-admin-xyz',
      user: adminUser,
      expiresAt: Date.now() + 3600000,
    });

    const state = AdminAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.session?.user.email).toBe('admin@eazzio.com');
    expect(state.session?.user.role).toBe('PlatformAdmin');
  });

  it('should clear admin session upon sign out', () => {
    const adminUser: AdminUser = {
      userId: 'usr-admin-2',
      email: 'orgadmin@acmecorp.com',
      displayName: 'Org Admin',
      role: 'OrgAdmin',
      organizationId: 'org-1',
    };

    AdminAuthStore.setSession({
      token: 'jwt-org-admin',
      user: adminUser,
      expiresAt: Date.now() + 3600000,
    });

    expect(AdminAuthStore.getState().isAuthenticated).toBe(true);
    AdminAuthStore.clearSession();
    expect(AdminAuthStore.getState().isAuthenticated).toBe(false);
    expect(AdminAuthStore.getState().session).toBeNull();
  });
});
