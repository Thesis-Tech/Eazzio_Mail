'use client';

import React from 'react';
import { LogOut, Building, ShieldCheck, UserCheck } from 'lucide-react';
import { AdminUser } from '../../types/admin';

interface AdminHeaderProps {
  user: AdminUser | null;
  onLogout: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ user, onLogout }) => {
  return (
    <header
      className="h-16 px-6 bg-[#16181D] border-b border-[#2A2E37] flex items-center justify-between"
      data-testid="admin-header"
    >
      {/* Active Organization & Scope Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1C1F26] border border-[#2A2E37] text-xs">
          <Building className="w-4 h-4 text-[#2D5BFF]" />
          <span className="font-semibold text-white">
            {user?.role === 'PlatformAdmin' ? 'Global Platform Scope' : user?.organizationName || 'Organization Admin'}
          </span>
        </div>
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
