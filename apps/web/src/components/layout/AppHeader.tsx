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
  Menu,
} from 'lucide-react';
import { PrivacyModeBadge } from '../PrivacyModeBadge';
import { AuthUser, AuthStore } from '../../lib/auth-store';
import { SearchBar } from '../search/SearchBar';
import { ThreadSummary } from '../../types/mail';

export interface AppHeaderProps {
  user?: AuthUser | null;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  onSearch?: (query: string) => void;
  availableThreads?: ThreadSummary[];
  isRealtimeConnected?: boolean;
  realtimeStatus?: 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
  onToggleMobileMenu?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  onLogout,
  onOpenSettings,
  onSearch,
  availableThreads = [],
  isRealtimeConnected = true,
  realtimeStatus,
  onToggleMobileMenu,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const effectiveStatus = realtimeStatus || (isRealtimeConnected ? 'connected' : 'disconnected');
  const isLive = effectiveStatus === 'connected';
  const isTransitioning = effectiveStatus === 'connecting' || effectiveStatus === 'reconnecting';

  return (
    <header
      className="h-16 border-b border-[#E2E8F0] bg-white px-3 sm:px-4 flex items-center justify-between gap-2.5 sm:gap-4 select-none shrink-0"
      data-testid="app-header"
    >
      {/* Mobile Menu Button (< md) */}
      {onToggleMobileMenu && (
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] focus:outline-none shrink-0"
          aria-label="Open folder navigation drawer"
          data-testid="mobile-menu-toggle"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Search Input Bar with Typeahead */}
      <SearchBar
        onSearch={onSearch || (() => {})}
        availableThreads={availableThreads}
      />

      {/* Right Utility Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Realtime Connection Dot */}
        <div
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] text-xs cursor-default"
          title={
            isLive
              ? 'Realtime WebSocket Connected (Live updates)'
              : isTransitioning
              ? 'Connecting to Realtime Service...'
              : 'Realtime WebSocket Offline (Polling active)'
          }
          data-testid="realtime-status"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isLive
                ? 'bg-emerald-500 animate-pulse'
                : isTransitioning
                ? 'bg-amber-400 animate-ping'
                : 'bg-red-500'
            }`}
          />
          <span className="text-[#475569] font-medium text-[11px] hidden sm:inline capitalize">
            {isLive ? 'Live' : isTransitioning ? 'Connecting' : 'Offline'}
          </span>
        </div>

        {/* Privacy Badge */}
        <div className="hidden lg:block">
          <PrivacyModeBadge mode="standard" />
        </div>

        {/* User Profile Avatar Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#14B8A6] to-[#0F766E] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm transition-all hover:opacity-90"
            data-testid="user-profile-button"
            title={user?.email || 'User Account'}
            aria-label="User account profile"
          >
            {user?.displayName
              ? user.displayName.slice(0, 2).toUpperCase()
              : user?.email
                ? user.email.slice(0, 2).toUpperCase()
                : 'U'}
          </button>

          {isProfileOpen && (
            <div
              className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 text-[#0F172A]"
              data-testid="user-profile-dropdown"
            >
              {/* Active User Header */}
              <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#14B8A6] to-[#0F766E] flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm">
                  {user?.displayName
                    ? user.displayName.slice(0, 2).toUpperCase()
                    : user?.email
                      ? user.email.slice(0, 2).toUpperCase()
                      : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#0F172A] truncate">
                    {user?.displayName || 'Active User'}
                  </p>
                  <p className="text-xs text-[#64748B] font-mono truncate">
                    {user?.email || 'user@eazzio.com'}
                  </p>
                </div>
              </div>

              {/* Active Mailbox Info */}
              <div className="p-2 border-b border-[#E2E8F0]">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
                  Active Mailbox
                </div>
                <div className="px-2.5 py-1.5 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-xs flex items-center justify-between text-[#0F766E]">
                  <div className="truncate">
                    <p className="font-bold text-[#0F172A] truncate">{user?.displayName || 'Personal Account'}</p>
                    <p className="text-[11px] text-[#0F766E] font-mono truncate">{user?.email}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-[#14B8A6] shrink-0" />
                </div>
              </div>

              {/* Settings & Security */}
              <div className="py-1">
                <button
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F172A] flex items-center gap-2.5 transition-colors"
                  onClick={() => {
                    setIsProfileOpen(false);
                    if (onOpenSettings) onOpenSettings();
                  }}
                >
                  <Settings className="w-4 h-4 text-[#64748B]" />
                  <span>Account Settings</span>
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F172A] flex items-center gap-2.5 transition-colors"
                  onClick={() => {
                    setIsProfileOpen(false);
                    if (onOpenSettings) onOpenSettings();
                  }}
                >
                  <Shield className="w-4 h-4 text-[#64748B]" />
                  <span>Security & MFA</span>
                </button>
              </div>

              {/* Sign Out */}
              <div className="pt-1 border-t border-[#E2E8F0]">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors"
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
