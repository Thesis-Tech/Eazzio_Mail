'use client';

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

export interface AppHeaderProps {
  user?: AuthUser | null;
  onLogout?: () => void;
  onSearch?: (query: string) => void;
  isRealtimeConnected?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  onLogout,
  onSearch,
  isRealtimeConnected = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <header
      className="h-16 border-b border-[#2A2E37] bg-[#16181D] px-4 flex items-center justify-between gap-4 select-none shrink-0"
      data-testid="app-header"
    >
      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages, senders, attachments (/ or ⌘K)"
            className="w-full bg-[#0F1115] border border-[#2A2E37] focus:border-[#2D5BFF] focus:ring-1 focus:ring-[#2D5BFF] rounded-xl pl-10 pr-12 py-2 text-sm text-[#E1E4EA] placeholder-slate-500 outline-none transition-all"
            data-testid="global-search-input"
          />
          <kbd className="absolute right-3 hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-[#1C1F26] border border-[#2A2E37] rounded">
            ⌘K
          </kbd>
        </div>
      </form>

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
