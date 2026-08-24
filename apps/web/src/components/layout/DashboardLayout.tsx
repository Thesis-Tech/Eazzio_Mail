'use client';

import React, { useState, useEffect } from 'react';
import { NavigationSidebar } from './NavigationSidebar';
import { AppHeader } from './AppHeader';
import { FolderItem, LabelItem, ThreadSummary } from '../../types/mail';
import { AuthStore, AuthUser } from '../../lib/auth-store';
import { realtimeClient, ConnectionStatus } from '../../lib/websocket-client';

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
  const [currentFolder, setCurrentFolder] = useState<string>(activeFolderId);
  const [currentLabel, setCurrentLabel] = useState<string | undefined>(activeLabelId);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
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

  const handleFolderSelect = (folderId: string) => {
    setCurrentFolder(folderId);
    setCurrentLabel(undefined);
    if (onSelectFolder) onSelectFolder(folderId);
  };

  const handleLabelSelect = (labelId: string) => {
    setCurrentLabel(labelId);
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
      className="flex h-screen w-screen overflow-hidden bg-[#0F1115] text-[#EDEEF0]"
      data-testid="dashboard-layout"
    >
      {/* Left Sidebar */}
      <NavigationSidebar
        folders={customFolders}
        labels={customLabels}
        activeFolderId={currentFolder}
        activeLabelId={currentLabel}
        onSelectFolder={handleFolderSelect}
        onSelectLabel={handleLabelSelect}
        onOpenCompose={onOpenCompose || (() => {})}
        onOpenSettings={onOpenSettings}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader
          user={currentUser}
          onLogout={handleLogout}
          onSearch={onSearch}
          availableThreads={availableThreads}
          isRealtimeConnected={connectionStatus === 'connected'}
          realtimeStatus={connectionStatus}
        />
        <main className="flex-1 overflow-auto bg-[#0F1115]">{children}</main>
      </div>
    </div>
  );
};
