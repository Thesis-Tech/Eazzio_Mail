'use client';

import React, { useState, useEffect } from 'react';
import { NavigationSidebar } from './NavigationSidebar';
import { AppHeader } from './AppHeader';
import { FolderItem, LabelItem, ThreadSummary } from '../../types/mail';
import { AuthStore, AuthUser } from '../../lib/auth-store';
import { realtimeClient, ConnectionStatus } from '../../lib/websocket-client';
import { X } from 'lucide-react';

export interface DashboardLayoutProps {
  children: React.ReactNode;
  activeFolderId?: string;
  activeLabelId?: string;
  onSelectFolder?: (folderId: string) => void;
  onSelectLabel?: (labelId: string) => void;
  onOpenCompose?: () => void;
  onOpenSettings?: () => void;
  onSearch?: (query: string) => void;
  availableThreads?: ThreadSummary[];
  customFolders?: FolderItem[];
  customLabels?: LabelItem[];
}

const defaultFolders: FolderItem[] = [
  { id: 'fld-inbox', name: 'Inbox', slug: 'inbox', type: 'system', unreadCount: 0, totalCount: 0 },
  { id: 'fld-starred', name: 'Starred', slug: 'starred', type: 'system', unreadCount: 0, totalCount: 0 },
  { id: 'fld-sent', name: 'Sent', slug: 'sent', type: 'system', unreadCount: 0, totalCount: 0 },
  { id: 'fld-drafts', name: 'Drafts', slug: 'drafts', type: 'system', unreadCount: 0, totalCount: 0 },
  { id: 'fld-spam', name: 'Spam', slug: 'spam', type: 'system', unreadCount: 0, totalCount: 0 },
  { id: 'fld-trash', name: 'Trash', slug: 'trash', type: 'system', unreadCount: 0, totalCount: 0 },
  { id: 'fld-archive', name: 'Archive', slug: 'archive', type: 'system', unreadCount: 0, totalCount: 0 },
];

const defaultLabels: LabelItem[] = [
  { id: 'lbl-work', name: 'Work', color: '#2D5BFF' },
  { id: 'lbl-finance', name: 'Finance', color: '#10B981' },
  { id: 'lbl-urgent', name: 'Urgent', color: '#EF4444' },
];

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeFolderId = 'fld-inbox',
  activeLabelId,
  onSelectFolder,
  onSelectLabel,
  onOpenCompose,
  onOpenSettings,
  onSearch,
  availableThreads = [],
  customFolders = defaultFolders,
  customLabels = defaultLabels,
}) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');

  useEffect(() => {
    AuthStore.initFromStorage();
    const user = AuthStore.getState().user;
    const token = AuthStore.getState().token;
    setCurrentUser(user);

    if (token) {
      realtimeClient.setToken(token);
    }
    realtimeClient.connect();

    const unsubscribeAuth = AuthStore.subscribe((state) => {
      setCurrentUser(state.user);
      if (state.token) {
        realtimeClient.setToken(state.token);
      }
    });

    const unsubscribeWs = realtimeClient.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeWs();
    };
  }, []);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileDrawerOpen) {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileDrawerOpen]);

  const handleFolderSelect = (folderId: string) => {
    setIsMobileDrawerOpen(false);
    if (onSelectFolder) onSelectFolder(folderId);
  };

  const handleLabelSelect = (labelId: string) => {
    setIsMobileDrawerOpen(false);
    if (onSelectLabel) onSelectLabel(labelId);
  };

  const handleLogout = () => {
    AuthStore.clearSession();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-[#0F1115] text-[#EDEEF0] relative"
      data-testid="dashboard-layout"
    >
      {/* Desktop Left Sidebar (>= md) */}
      <div className="hidden md:flex h-full">
        <NavigationSidebar
          folders={customFolders}
          labels={customLabels}
          activeFolderId={activeFolderId}
          activeLabelId={activeLabelId}
          onSelectFolder={handleFolderSelect}
          onSelectLabel={handleLabelSelect}
          onOpenCompose={onOpenCompose || (() => {})}
          onOpenSettings={onOpenSettings}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Mobile Slide-Out Drawer (< md) */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fade-in">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Sidebar Content */}
          <div className="relative w-72 max-w-[80vw] h-full bg-[#111317] border-r border-[#22262E] shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="absolute top-4 right-3 z-20">
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E232B] transition-colors"
                aria-label="Close navigation drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavigationSidebar
              folders={customFolders}
              labels={customLabels}
              activeFolderId={activeFolderId}
              activeLabelId={activeLabelId}
              onSelectFolder={handleFolderSelect}
              onSelectLabel={handleLabelSelect}
              onOpenCompose={() => {
                setIsMobileDrawerOpen(false);
                if (onOpenCompose) onOpenCompose();
              }}
              onOpenSettings={() => {
                setIsMobileDrawerOpen(false);
                if (onOpenSettings) onOpenSettings();
              }}
              isCollapsed={false}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader
          user={currentUser}
          onLogout={handleLogout}
          onOpenSettings={onOpenSettings}
          onSearch={onSearch}
          availableThreads={availableThreads}
          isRealtimeConnected={connectionStatus === 'connected'}
          realtimeStatus={connectionStatus}
          onToggleMobileMenu={() => setIsMobileDrawerOpen(true)}
        />
        <main className="flex-1 overflow-hidden flex flex-col bg-[#0F1115]">{children}</main>
      </div>
    </div>
  );
};
