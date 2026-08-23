'use client';

import React, { useState } from 'react';
import { LogOut, Building, ShieldCheck, ChevronDown, CheckCircle2 } from 'lucide-react';
import { AdminUser } from '../../types/admin';
import { AdminAuthStore } from '../../lib/admin-auth-store';

interface AdminHeaderProps {
  user: AdminUser | null;
  onLogout: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ user, onLogout }) => {
  const [isScopeMenuOpen, setIsScopeMenuOpen] = useState(false);

  const handleSwitchScope = (role: 'PlatformAdmin' | 'OrgAdmin', orgName: string, email: string) => {
    AdminAuthStore.setSession({
      token: `admin-jwt-${Date.now()}`,
      user: {
        userId: `usr-${role.toLowerCase()}`,
        email,
        displayName: role === 'PlatformAdmin' ? 'Platform SuperAdmin (Dev)' : `${orgName} Admin (Business)`,
        role,
        organizationName: orgName,
      },
      expiresAt: Date.now() + 86400000,
    });
    setIsScopeMenuOpen(false);
  };

  return (
    <header
      className="h-16 px-6 bg-[#16181D] border-b border-[#2A2E37] flex items-center justify-between"
      data-testid="admin-header"
    >
      {/* Active Organization & Scope Switcher */}
      <div className="relative">
        <button
          onClick={() => setIsScopeMenuOpen(!isScopeMenuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1C1F26] hover:bg-[#2A2E37]/50 border border-[#2A2E37] text-xs transition-colors"
          data-testid="scope-switcher-button"
        >
          <Building className="w-4 h-4 text-[#2D5BFF]" />
          <span className="font-semibold text-white">
            {user?.role === 'PlatformAdmin' ? 'Global Platform Scope (Dev)' : `${user?.organizationName || 'Organization'} (Business)`}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
        </button>

        {isScopeMenuOpen && (
          <div className="absolute left-0 mt-2 w-72 rounded-xl bg-[#16181D] border border-[#2A2E37] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-2 block py-1">
              Select Administration Scope
            </span>

            {/* Platform SuperAdmin Scope */}
            <button
              onClick={() => handleSwitchScope('PlatformAdmin', 'Eazzio Enterprise Global', 'admin@eazzio.com')}
              className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                user?.role === 'PlatformAdmin'
                  ? 'bg-[#2D5BFF]/15 text-[#2D5BFF] font-semibold border border-[#2D5BFF]/30'
                  : 'text-slate-300 hover:bg-[#1C1F26]'
              }`}
            >
              <div>
                <p className="font-semibold">Global Platform Scope (Dev / Root)</p>
                <p className="text-[10px] text-slate-400 font-mono">admin@eazzio.com • Full Cluster Access</p>
              </div>
              {user?.role === 'PlatformAdmin' && (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5BFF] shrink-0" />
              )}
            </button>

            {/* Business Org Scope (Thesis Tech) */}
            <button
              onClick={() => handleSwitchScope('OrgAdmin', 'Thesis Tech', 'admin@thesistech.io')}
              className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                user?.role === 'OrgAdmin' && user?.organizationName === 'Thesis Tech'
                  ? 'bg-purple-500/15 text-purple-400 font-semibold border border-purple-500/30'
                  : 'text-slate-300 hover:bg-[#1C1F26]'
              }`}
            >
              <div>
                <p className="font-semibold">Thesis Tech (Business / Org)</p>
                <p className="text-[10px] text-slate-400 font-mono">admin@thesistech.io • Tenant Scope</p>
              </div>
              {user?.role === 'OrgAdmin' && user?.organizationName === 'Thesis Tech' && (
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Admin User Profile & Actions */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2D5BFF]/20 border border-[#2D5BFF]/30 text-[#2D5BFF] flex items-center justify-center font-bold text-xs">
            {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'AD'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-white leading-tight">{user?.displayName || 'Administrator'}</p>
            <p className="text-[10px] text-slate-400 font-mono">{user?.email || 'admin@eazzio.com'}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Sign Out"
          data-testid="admin-logout-btn"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
