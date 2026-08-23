import React, { useState } from 'react';
import {
  Search,
  Bell,
  Shield,
  User,
  LogOut,
  Settings,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { PrivacyModeBadge } from '../PrivacyModeBadge';
import { AuthUser } from '../../lib/auth-store';
import { SearchBar } from '../search/SearchBar';
import { ThreadSummary } from '../../types/mail';

export interface AppHeaderProps {
  user?: AuthUser | null;
  onLogout?: () => void;
  onSearch?: (query: string) => void;
  availableThreads?: ThreadSummary[];
  isRealtimeConnected?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  onLogout,
  onSearch,
  availableThreads = [],
  isRealtimeConnected = true,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header
      className="h-16 border-b border-[#2A2E37] bg-[#16181D] px-4 flex items-center justify-between gap-4 select-none shrink-0"
      data-testid="app-header"
    >
      {/* Search Input Bar with Typeahead */}
      <SearchBar
        onSearch={onSearch || (() => {})}
        availableThreads={availableThreads}
      />

      {/* Right Utility Actions */}
      <div className="flex items-center gap-3">
        {/* Realtime Connection Dot */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0F1115] border border-[#2A2E37] text-xs"
          title={isRealtimeConnected ? 'Realtime WebSocket Connected' : 'Disconnected'}
          data-testid="realtime-status"
        >
          <span
            className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}
          />
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            {isRealtimeConnected ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Privacy Badge */}
        <div className="hidden md:block">
          <PrivacyModeBadge mode="standard" />
        </div>

        {/* User Profile Avatar Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-9 h-9 rounded-xl bg-[#2D5BFF]/20 border border-[#2D5BFF]/30 text-[#2D5BFF] hover:bg-[#2D5BFF]/30 flex items-center justify-center font-bold text-sm transition-all"
            data-testid="user-profile-button"
            title={user?.email || 'User Account'}
          >
            {user?.displayName
              ? user.displayName.slice(0, 2).toUpperCase()
              : user?.email
                ? user.email.slice(0, 2).toUpperCase()
                : 'U'}
          </button>

          {isProfileOpen && (
            <div
              className="absolute right-0 mt-2 w-64 rounded-xl bg-[#16181D] border border-[#2A2E37] shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95"
              data-testid="user-profile-dropdown"
            >
              <div className="px-4 py-2 border-b border-[#2A2E37]">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.displayName || 'Active User'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.email || 'user@eazzio.local'}
                </p>
              </div>

              {/* Identity Mode Switcher (Personal Dev vs Business) */}
              <div className="p-2 border-b border-[#2A2E37] space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-2 block">
                  Active Identity Mode
                </span>
                <button
                  onClick={() => {
                    AuthStore.setSession(
                      {
                        id: 'usr-dev-101',
                        email: 'rahulkumar@eazzio.com',
                        displayName: 'Rahul Kumar (Personal/Dev)',
                        role: 'Developer',
                      },
                      'dev-token-personal'
                    );
                    setIsProfileOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                    !user?.email?.includes('thesistech')
                      ? 'bg-[#2D5BFF]/15 text-[#2D5BFF] font-semibold border border-[#2D5BFF]/30'
                      : 'text-slate-300 hover:bg-[#1C1F26]'
                  }`}
                >
                  <div className="truncate">
                    <p className="truncate">Rahul (Personal / Dev)</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">rahulkumar@eazzio.com</p>
                  </div>
                  {!user?.email?.includes('thesistech') && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5BFF] shrink-0" />
                  )}
                </button>

                <button
                  onClick={() => {
                    AuthStore.setSession(
                      {
                        id: 'usr-biz-202',
                        email: 'rahul@thesistech.io',
                        displayName: 'Rahul Kumar (Thesis Tech)',
                        role: 'BusinessAdmin',
                      },
                      'biz-token-thesistech'
                    );
                    setIsProfileOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                    user?.email?.includes('thesistech')
                      ? 'bg-purple-500/15 text-purple-400 font-semibold border border-purple-500/30'
                      : 'text-slate-300 hover:bg-[#1C1F26]'
                  }`}
                >
                  <div className="truncate">
                    <p className="truncate">Rahul (Business / Org)</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">rahul@thesistech.io</p>
                  </div>
                  {user?.email?.includes('thesistech') && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  )}
                </button>
              </div>

              <div className="py-1">
                <button
                  className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-[#1C1F26] hover:text-white flex items-center gap-2.5 transition-colors"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Account Settings</span>
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-[#1C1F26] hover:text-white flex items-center gap-2.5 transition-colors"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Security & MFA</span>
                </button>
              </div>

              <div className="pt-1 border-t border-[#2A2E37]">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                  data-testid="logout-button"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
