'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminAuthStore } from '../../lib/admin-auth-store';
import { AdminUser, AdminRole } from '../../types/admin';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  allowedRoles?: AdminRole[];
}

const DEFAULT_ALLOWED_ROLES: AdminRole[] = ['PlatformAdmin', 'OrgAdmin'];

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  allowedRoles = DEFAULT_ALLOWED_ROLES,
}) => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const rolesKey = allowedRoles.join(',');

  useEffect(() => {
    AdminAuthStore.initFromStorage();
    const state = AdminAuthStore.getState();

    if (!state.isAuthenticated || !state.session) {
      // In dev environment, bootstrap default PlatformAdmin session if none exists
      const defaultAdmin: AdminUser = {
        userId: 'admin-usr-101',
        email: 'admin@eazzio.com',
        displayName: 'Platform Admin',
        role: 'PlatformAdmin',
        organizationName: 'Eazzio Enterprise Global',
      };
      AdminAuthStore.setSession({
        token: 'dev-admin-jwt-token',
        user: defaultAdmin,
        expiresAt: Date.now() + 86400000,
      });
      setCurrentUser(defaultAdmin);
      setIsAuthorized(allowedRoles.includes(defaultAdmin.role));
      setIsLoading(false);
      return;
    }

    const user = state.session.user;
    setCurrentUser(user);
    const authorized = allowedRoles.includes(user.role);
    setIsAuthorized(authorized);
    setIsLoading(false);

    const unsubscribe = AdminAuthStore.subscribe((newState) => {
      if (newState.session) {
        setCurrentUser(newState.session.user);
        setIsAuthorized(allowedRoles.includes(newState.session.user.role));
      } else {
        setCurrentUser(null);
        setIsAuthorized(false);
      }
    });

    return () => unsubscribe();
  }, [rolesKey]);

  const handleLogout = () => {
    AdminAuthStore.clearSession();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#0F1115] flex items-center justify-center text-slate-400 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-[#2D5BFF]" />
        <span className="text-sm">Verifying Admin Access...</span>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="h-screen w-screen bg-[#0F1115] flex flex-col items-center justify-center p-6 text-center text-white" data-testid="access-denied-view">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold">403 — Unauthorized Access</h2>
        <p className="text-sm text-slate-400 mt-1.5 max-w-md">
          Your account role (<span className="text-red-400 font-semibold">{currentUser?.role || 'Guest'}</span>) does not have sufficient permissions to access this administrative portal.
        </p>
        <button
          onClick={handleLogout}
          className="mt-6 px-4 py-2 bg-[#2A2E37] hover:bg-[#3B4252] text-white rounded-xl text-xs font-semibold transition-all"
        >
          Sign in with different credentials
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0F1115] text-[#EDEEF0]">
      <AdminSidebar
        role={currentUser?.role || 'OrgAdmin'}
        orgName={currentUser?.organizationName}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader user={currentUser} onLogout={handleLogout} />
        <main className="flex-1 overflow-auto bg-[#0F1115] p-6">{children}</main>
      </div>
    </div>
  );
};
