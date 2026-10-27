'use client';

import React, { useState, useEffect } from 'react';
import { FolderItem, LabelItem, ThreadSummary } from '../../types/mail';
import { AuthStore, AuthUser } from '../../lib/auth-store';
import { realtimeClient, ConnectionStatus } from '../../lib/websocket-client';
import { 
  X, Search, Bell, Shield, User, LogOut, Settings, HelpCircle, 
  CheckCircle2, Menu, Inbox, Star, Send, FileText, AlertOctagon, 
  Trash2, Archive, Bookmark, Plus, Tag, ShieldCheck, Clock, 
  ShoppingBag, Calendar, Mail, ChevronDown, ChevronUp, Edit3, 
  Command, Sparkles, CheckSquare, LayoutList, CalendarDays, 
  PanelRightClose, PanelRightOpen, HardDrive, Check, Keyboard,
  Users
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { PrivacyModeBadge } from '../PrivacyModeBadge';
import { KeyboardShortcutsModal } from '../ui/KeyboardShortcutsModal';
import { SlidersHorizontal } from 'lucide-react';

const AdvancedSearchModal = dynamic(
  () => import('../search/AdvancedSearchModal').then((mod) => mod.AdvancedSearchModal),
  { ssr: false }
);

const QuickSettingsPanel = dynamic(
  () => import('../settings/QuickSettingsPanel').then((mod) => mod.QuickSettingsPanel),
  { ssr: false }
);

export interface DashboardLayoutProps {
  children: React.ReactNode;
  activeFolderId?: string;
  activeLabelId?: string;
  onSelectFolder?: (folderId: string) => void;
  onSelectLabel?: (labelId: string) => void;
  onOpenCompose?: () => void;
  onOpenSettings?: (tab?: any) => void;
  onCreateLabel?: (name: string, color: string) => Promise<void> | void;
  onSearch?: (query: string) => void;
  availableThreads?: ThreadSummary[];
  customFolders?: FolderItem[];
  customLabels?: LabelItem[];
  density?: 'default' | 'comfortable' | 'compact';
  onDensityChange?: (density: 'default' | 'comfortable' | 'compact') => void;
  readingPane?: 'none' | 'right' | 'below';
  onReadingPaneChange?: (readingPane: 'none' | 'right' | 'below') => void;
}

const defaultFolders: FolderItem[] = [
  { id: 'fld-inbox', name: 'Inbox', slug: 'inbox', type: 'system', unreadCount: 12, totalCount: 45 },
  { id: 'fld-starred', name: 'Starred', slug: 'starred', type: 'system', unreadCount: 0, totalCount: 5 },
  { id: 'fld-sent', name: 'Sent', slug: 'sent', type: 'system', unreadCount: 0, totalCount: 124 },
  { id: 'fld-drafts', name: 'Drafts', slug: 'drafts', type: 'system', unreadCount: 0, totalCount: 3 },
  { id: 'fld-spam', name: 'Spam', slug: 'spam', type: 'system', unreadCount: 2, totalCount: 15 },
  { id: 'fld-trash', name: 'Trash', slug: 'trash', type: 'system', unreadCount: 0, totalCount: 42 },
  { id: 'fld-archive', name: 'Archive', slug: 'archive', type: 'system', unreadCount: 0, totalCount: 890 },
];

const defaultLabels: LabelItem[] = [
  { id: 'lbl-work', name: 'Work', color: '#3B82F6' },
  { id: 'lbl-finance', name: 'Finance', color: '#10B981' },
  { id: 'lbl-urgent', name: 'Urgent', color: '#EF4444' },
];

export interface ThemeConfig {
  id: string;
  name: string;
  isDark?: boolean;
  bgMain: string;
  bgSidebar: string;
  bgHeader: string;
  bgCard: string;
  bgHover: string;
  border: string;
  borderStrong?: string;
  accent: string;
  accentHover: string;
  accentBg: string;
  accentGlow: string;
  textPrimary?: string;
  textSecondary?: string;
  textMuted?: string;
}

export const THEME_CONFIGS: Record<string, ThemeConfig> = {
  'eazzio-teal': {
    id: 'eazzio-teal',
    name: 'Eazzio Light (Default)',
    isDark: false,
    bgMain: '#F8FAFC',
    bgSidebar: '#FFFFFF',
    bgHeader: '#FFFFFF',
    bgCard: '#FFFFFF',
    bgHover: '#F1F5F9',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    accent: '#14B8A6',
    accentHover: '#0D9488',
    accentBg: '#F0FDFA',
    accentGlow: 'rgba(20, 184, 166, 0.15)',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
  },
  'dark-oled': {
    id: 'dark-oled',
    name: 'Royal Dark',
    isDark: true,
    bgMain: '#0A0C10',
    bgSidebar: '#090A0D',
    bgHeader: '#0A0C10',
    bgCard: '#12141A',
    bgHover: '#15181F',
    border: '#1E232B',
    accent: '#2D5BFF',
    accentHover: '#1E40AF',
    accentBg: 'rgba(45, 91, 255, 0.15)',
    accentGlow: 'rgba(45, 91, 255, 0.35)',
    textPrimary: '#EDEEF0',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
  },
  'emerald': {
    id: 'emerald',
    name: 'Cyber Emerald',
    isDark: true,
    bgMain: '#030E0B',
    bgSidebar: '#020806',
    bgHeader: '#030E0B',
    bgCard: '#071F17',
    bgHover: '#0C2B21',
    border: '#103F31',
    accent: '#10B981',
    accentHover: '#059669',
    accentBg: 'rgba(16, 185, 129, 0.15)',
    accentGlow: 'rgba(16, 185, 129, 0.35)',
    textPrimary: '#EDEEF0',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
  },
  'midnight': {
    id: 'midnight',
    name: 'Midnight Blue',
    isDark: true,
    bgMain: '#070D18',
    bgSidebar: '#040810',
    bgHeader: '#070D18',
    bgCard: '#0E1B33',
    bgHover: '#142747',
    border: '#1E3B68',
    accent: '#38BDF8',
    accentHover: '#0284C7',
    accentBg: 'rgba(56, 189, 248, 0.15)',
    accentGlow: 'rgba(56, 189, 248, 0.35)',
    textPrimary: '#EDEEF0',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
  },
  'purple': {
    id: 'purple',
    name: 'Deep Amethyst',
    isDark: true,
    bgMain: '#0D0716',
    bgSidebar: '#08040E',
    bgHeader: '#0D0716',
    bgCard: '#1A0E2E',
    bgHover: '#251540',
    border: '#3D1C63',
    accent: '#A855F7',
    accentHover: '#9333EA',
    accentBg: 'rgba(168, 85, 247, 0.15)',
    accentGlow: 'rgba(168, 85, 247, 0.35)',
    textPrimary: '#EDEEF0',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
  },
  'graphite': {
    id: 'graphite',
    name: 'Graphite Slate',
    isDark: true,
    bgMain: '#111113',
    bgSidebar: '#0B0B0D',
    bgHeader: '#111113',
    bgCard: '#1C1C21',
    bgHover: '#24242B',
    border: '#2E2E38',
    accent: '#14B8A6',
    accentHover: '#0D9488',
    accentBg: 'rgba(20, 184, 166, 0.15)',
    accentGlow: 'rgba(20, 184, 166, 0.35)',
    textPrimary: '#EDEEF0',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
  },
  'sunset': {
    id: 'sunset',
    name: 'Crimson Dusk',
    isDark: true,
    bgMain: '#120609',
    bgSidebar: '#0A0305',
    bgHeader: '#120609',
    bgCard: '#1F0B11',
    bgHover: '#2C1019',
    border: '#4D1627',
    accent: '#F43F5E',
    accentHover: '#E11D48',
    accentBg: 'rgba(244, 63, 94, 0.15)',
    accentGlow: 'rgba(244, 63, 94, 0.35)',
    textPrimary: '#EDEEF0',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
  },
  'cyberpunk': {
    id: 'cyberpunk',
    name: 'Cyberpunk Gold',
    isDark: true,
    bgMain: '#0C0C08',
    bgSidebar: '#060604',
    bgHeader: '#0C0C08',
    bgCard: '#18170D',
    bgHover: '#282510',
    border: '#383416',
    accent: '#FACC15',
    accentHover: '#EAB308',
    accentBg: 'rgba(250, 204, 21, 0.15)',
    accentGlow: 'rgba(250, 204, 21, 0.35)',
    textPrimary: '#EDEEF0',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
  },
  'ocean': {
    id: 'ocean',
    name: 'Deep Ocean',
    isDark: true,
    bgMain: '#040C12',
    bgSidebar: '#02070A',
    bgHeader: '#040C12',
    bgCard: '#081D2C',
    bgHover: '#0D2B42',
    border: '#13476E',
    accent: '#06B6D4',
    accentHover: '#0891B2',
    accentBg: 'rgba(6, 182, 212, 0.15)',
    accentGlow: 'rgba(6, 182, 212, 0.35)',
    textPrimary: '#EDEEF0',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
  },
};

export function getThemeConfig(themeId: string): ThemeConfig {
  if (THEME_CONFIGS[themeId]) return THEME_CONFIGS[themeId]!;
  try {
    const customJson = localStorage.getItem(`eazzio_custom_theme_${themeId}`);
    if (customJson) {
      const parsed = JSON.parse(customJson);
      if (parsed.bgMain && parsed.accent) return parsed;
    }
  } catch (_) {}
  return THEME_CONFIGS['eazzio-teal']!;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeFolderId = 'fld-inbox',
  activeLabelId,
  onSelectFolder,
  onSelectLabel,
  onOpenCompose,
  onOpenSettings,
  onCreateLabel,
  onSearch,
  availableThreads = [],
  customFolders = defaultFolders,
  customLabels = defaultLabels,
  density: propDensity,
  onDensityChange,
  readingPane: propReadingPane,
  onReadingPaneChange,
}) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isRightRailOpen, setIsRightRailOpen] = useState<boolean>(true);
  const [activeRightTab, setActiveRightTab] = useState<'calendar' | 'tasks' | 'notes'>('calendar');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [internalDensity, setInternalDensity] = useState<'default' | 'comfortable' | 'compact'>('default');
  const activeDensity = propDensity || internalDensity;
  const [theme, setTheme] = useState<string>('eazzio-teal');
  const [inboxType, setInboxType] = useState<'default' | 'important' | 'unread' | 'starred' | 'priority'>('default');
  const [internalReadingPane, setInternalReadingPane] = useState<'none' | 'right' | 'below'>('none');
  const activeReadingPane = propReadingPane || internalReadingPane;
  const [conversationView, setConversationView] = useState(true);
  const [storageStats, setStorageStats] = useState<{ usedMb: string; quotaMb: string; percentage: number }>({
    usedMb: '0.25 MB',
    quotaMb: '500 MB',
    percentage: 0.1,
  });

  // New Label Modal State
  const [isCreateLabelModalOpen, setIsCreateLabelModalOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3B82F6');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);

  const LABEL_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#F97316', '#F59E0B', '#14B8A6', '#EC4899'];

  const handleFormCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim() || isCreatingLabel) return;
    setIsCreatingLabel(true);
    try {
      if (onCreateLabel) {
        await onCreateLabel(newLabelName.trim(), newLabelColor);
      }
      setNewLabelName('');
      setIsCreateLabelModalOpen(false);
    } catch (err) {
      console.error('Failed to create label:', err);
    } finally {
      setIsCreatingLabel(false);
    }
  };

  // Active theme configuration
  const currentTheme = getThemeConfig(theme);

  // Persist preference updates seamlessly to PostgreSQL and localStorage
  const persistPreference = (updates: {
    theme?: string;
    density?: 'default' | 'comfortable' | 'compact';
    inboxType?: 'default' | 'important' | 'unread' | 'starred' | 'priority';
    readingPane?: 'none' | 'right' | 'below';
    conversationView?: boolean;
  }) => {
    try {
      const auth = AuthStore.getState();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      if (auth.user?.email) headers['x-user-email'] = auth.user.email;

      const payload = {
        theme: updates.theme !== undefined ? updates.theme : theme,
        density: updates.density !== undefined ? updates.density : activeDensity,
        inboxType: updates.inboxType !== undefined ? updates.inboxType : inboxType,
        readingPane: updates.readingPane !== undefined ? updates.readingPane : activeReadingPane,
        conversationView: updates.conversationView !== undefined ? updates.conversationView : conversationView,
      };

      fetch('/api/settings/preferences', {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      }).catch((err) => console.warn('Failed to save preferences to DB:', err));
    } catch (_) {}
  };

  // Handle Reading Pane Change with instant persistence
  const handleReadingPaneChange = (newPane: 'none' | 'right' | 'below') => {
    setInternalReadingPane(newPane);
    if (onReadingPaneChange) onReadingPaneChange(newPane);
    try {
      localStorage.setItem('eazzio_reading_pane', newPane);
    } catch (_) {}
    persistPreference({ readingPane: newPane });
  };

  // Handle Density Change with instant persistence
  const handleDensityChange = (newDensity: 'default' | 'comfortable' | 'compact') => {
    setInternalDensity(newDensity);
    if (onDensityChange) onDensityChange(newDensity);
    try {
      localStorage.setItem('eazzio_density', newDensity);
    } catch (_) {}
    persistPreference({ density: newDensity });
  };

  // Handle Theme Change with direct DB persistence
  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    try {
      localStorage.setItem('eazzio_theme', newTheme);
    } catch (_) {}
    persistPreference({ theme: newTheme });
  };

  // Handle Inbox Type Change with direct DB persistence (Default, Important first, Unread first, etc.)
  const handleInboxTypeChange = (newType: 'default' | 'important' | 'unread' | 'starred' | 'priority') => {
    setInboxType(newType);
    try {
      localStorage.setItem('eazzio_inbox_type', newType);
    } catch (_) {}
    persistPreference({ inboxType: newType });
  };

  // Handle Conversation View Toggle with direct DB persistence
  const handleConversationViewToggle = (enabled: boolean) => {
    setConversationView(enabled);
    try {
      localStorage.setItem('eazzio_conversation_view', String(enabled));
    } catch (_) {}
    persistPreference({ conversationView: enabled });
  };

  const primaryFolders = customFolders.filter(f => ['inbox', 'starred', 'snoozed', 'sent', 'drafts'].includes(f.slug.toLowerCase()));
  const secondaryFolders = customFolders.filter(f => !['inbox', 'starred', 'snoozed', 'sent', 'drafts'].includes(f.slug.toLowerCase()));
  const isSecondaryActive = secondaryFolders.some(f => f.id === activeFolderId || f.slug.toLowerCase() === activeFolderId.replace('fld-', '').toLowerCase());
  const [isMoreFoldersOpen, setIsMoreFoldersOpen] = useState(isSecondaryActive);

  useEffect(() => {
    if (isSecondaryActive) {
      setIsMoreFoldersOpen(true);
    }
  }, [isSecondaryActive]);

  useEffect(() => {
    AuthStore.initFromStorage();
    const user = AuthStore.getState().user;
    const token = AuthStore.getState().token;
    setCurrentUser(user);
    if (token) realtimeClient.setToken(token);
    realtimeClient.connect();

    // 1. Immediately apply saved theme and options on client mount
    try {
      const savedTheme = localStorage.getItem('eazzio_theme');
      if (savedTheme && (THEME_CONFIGS[savedTheme] || savedTheme.startsWith('custom-'))) {
        setTheme(savedTheme);
      }
      const savedDensity = localStorage.getItem('eazzio_density') as 'default' | 'comfortable' | 'compact';
      if (savedDensity && ['default', 'comfortable', 'compact'].includes(savedDensity)) {
        setInternalDensity(savedDensity);
        if (onDensityChange) onDensityChange(savedDensity);
      }
      const savedPane = localStorage.getItem('eazzio_reading_pane') as 'none' | 'right' | 'below';
      if (savedPane && ['none', 'right', 'below'].includes(savedPane)) {
        setInternalReadingPane(savedPane);
        if (onReadingPaneChange) onReadingPaneChange(savedPane);
      }
      const savedInboxType = localStorage.getItem('eazzio_inbox_type') as 'default' | 'important' | 'unread' | 'starred' | 'priority';
      if (savedInboxType && ['default', 'important', 'unread', 'starred', 'priority'].includes(savedInboxType)) {
        setInboxType(savedInboxType);
      }
      const savedConvView = localStorage.getItem('eazzio_conversation_view');
      if (savedConvView !== null) {
        setConversationView(savedConvView === 'true');
      }
    } catch (_) {}

    // 2. Query user preferences directly from PostgreSQL Database in parallel
    try {
      let auth = AuthStore.getState();
      if (!auth.token || !auth.user) {
        AuthStore.initFromStorage();
        auth = AuthStore.getState();
      }
      let storedEmail = auth.user?.email;
      let storedToken = auth.token;
      if (!storedEmail) {
        try {
          const userStr = localStorage.getItem('eazzio_user');
          if (userStr) storedEmail = JSON.parse(userStr).email;
          if (!storedToken) storedToken = localStorage.getItem('eazzio_token');
        } catch (_) {}
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      if (storedEmail) headers['x-user-email'] = storedEmail;

      fetch('/api/settings/preferences', { headers })
        .then((res) => res.json())
        .then((json) => {
          if (json.data?.theme && (THEME_CONFIGS[json.data.theme] || json.data.theme.startsWith('custom-'))) {
            setTheme(json.data.theme);
            localStorage.setItem('eazzio_theme', json.data.theme);
          }

      // Fetch dynamic real storage usage
      fetch('/api/storage/quota', { headers })
        .then((r) => r.json())
        .then((q) => {
          if (q.data) {
            setStorageStats({
              usedMb: q.data.usedMb,
              quotaMb: q.data.quotaMb,
              percentage: q.data.percentage,
            });
          }
        })
        .catch(() => {});

          if (json.data?.density && ['default', 'comfortable', 'compact'].includes(json.data.density)) {
            setInternalDensity(json.data.density);
            if (onDensityChange) onDensityChange(json.data.density);
            localStorage.setItem('eazzio_density', json.data.density);
          }
          if (json.data?.readingPane && ['none', 'right', 'below'].includes(json.data.readingPane)) {
            setInternalReadingPane(json.data.readingPane);
            if (onReadingPaneChange) onReadingPaneChange(json.data.readingPane);
            localStorage.setItem('eazzio_reading_pane', json.data.readingPane);
          }
          if (json.data?.inboxType && ['default', 'important', 'unread', 'starred', 'priority'].includes(json.data.inboxType)) {
            setInboxType(json.data.inboxType);
            localStorage.setItem('eazzio_inbox_type', json.data.inboxType);
          }
          if (json.data?.conversationView !== undefined) {
            setConversationView(Boolean(json.data.conversationView));
            localStorage.setItem('eazzio_conversation_view', String(Boolean(json.data.conversationView)));
          }
        })
        .catch(() => {});
    } catch (_) {}

    const unsubscribeAuth = AuthStore.subscribe((state) => {
      setCurrentUser(state.user);
      if (state.token) realtimeClient.setToken(state.token);
    });
    const unsubscribeWs = realtimeClient.onStatusChange((status) => setConnectionStatus(status));

    return () => {
      unsubscribeAuth();
      unsubscribeWs();
    };
  }, []);

  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  useEffect(() => {
    let pendingPrefix = '';
    let prefixTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ignore shortcuts if user is typing in an input, textarea, or contentEditable element
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'textbox');

      if (e.key === 'Escape') {
        if (isShortcutsModalOpen) setIsShortcutsModalOpen(false);
        if (isMobileDrawerOpen) setIsMobileDrawerOpen(false);
        if (isQuickSettingsOpen) setIsQuickSettingsOpen(false);
        if (isAdvancedSearchOpen) setIsAdvancedSearchOpen(false);
        return;
      }

      if (isInput) return;

      // 2. Global Shortcuts
      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
        return;
      }

      if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (onOpenCompose) onOpenCompose();
        return;
      }

      // 3. Two-key Navigation Chords (e.g., G then I, G then S)
      if (e.key.toLowerCase() === 'g' && !pendingPrefix) {
        pendingPrefix = 'g';
        if (prefixTimeout) clearTimeout(prefixTimeout);
        prefixTimeout = setTimeout(() => {
          pendingPrefix = '';
        }, 1200);
        return;
      }

      if (pendingPrefix === 'g') {
        const nextKey = e.key.toLowerCase();
        pendingPrefix = '';
        if (prefixTimeout) clearTimeout(prefixTimeout);

        if (nextKey === 'i' && onSelectFolder) {
          e.preventDefault();
          onSelectFolder('fld-inbox');
        } else if (nextKey === 's' && onSelectFolder) {
          e.preventDefault();
          onSelectFolder('fld-starred');
        } else if (nextKey === 't' && onSelectFolder) {
          e.preventDefault();
          onSelectFolder('fld-sent');
        } else if (nextKey === 'd' && onSelectFolder) {
          e.preventDefault();
          onSelectFolder('fld-drafts');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (prefixTimeout) clearTimeout(prefixTimeout);
    };
  }, [
    isMobileDrawerOpen,
    isShortcutsModalOpen,
    isQuickSettingsOpen,
    isAdvancedSearchOpen,
    onOpenCompose,
    onSelectFolder,
  ]);

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
    if (typeof window !== 'undefined') window.location.href = '/login';
  };

  const getFolderIcon = (slug: string) => {
    switch (slug.toLowerCase()) {
      case 'inbox': return <Inbox className="w-[18px] h-[18px]" />;
      case 'starred': return <Star className="w-[18px] h-[18px]" />;
      case 'snoozed': return <Clock className="w-[18px] h-[18px]" />;
      case 'scheduled': return <Clock className="w-[18px] h-[18px]" />;
      case 'sent': return <Send className="w-[18px] h-[18px]" />;
      case 'drafts': return <FileText className="w-[18px] h-[18px]" />;
      case 'spam': return <AlertOctagon className="w-[18px] h-[18px]" />;
      case 'trash': return <Trash2 className="w-[18px] h-[18px]" />;
      case 'archive': return <Archive className="w-[18px] h-[18px]" />;
      default: return <Mail className="w-[18px] h-[18px]" />;
    }
  };

  const renderSidebarContent = () => (
    <div 
      style={{
        backgroundColor: currentTheme.bgSidebar,
        borderColor: currentTheme.border,
        color: currentTheme.isDark ? '#E2E8F0' : '#475569',
      }}
      className="flex flex-col h-full border-r transition-all duration-300 ease-in-out w-64 overflow-hidden"
    >
      {/* Brand */}
      <div 
        style={{ borderColor: currentTheme.border }}
        className="h-16 px-5 flex items-center gap-2.5 border-b shrink-0 cursor-pointer transition-colors"
      >
        <div 
          style={{ background: `linear-gradient(135deg, ${currentTheme.accent}, #0E172A)` }}
          className="w-8 h-8 rounded-[10px] flex items-center justify-center font-bold text-white shadow-sm shrink-0 text-sm"
        >
          E
        </div>
        <div className="flex items-center gap-1.5">
          <span 
            style={{ color: currentTheme.isDark ? '#F8FAFC' : '#0F172A' }}
            className="font-bold tracking-tight text-lg"
          >
            Eazzio
          </span>
          <span 
            style={{ 
              color: currentTheme.accent, 
              backgroundColor: currentTheme.accentBg, 
              borderColor: currentTheme.border 
            }}
            className="font-semibold text-xs px-2 py-0.5 rounded-full border"
          >
            Mail
          </span>
        </div>
      </div>

      {/* Compose */}
      <div className="p-3.5">
        <button 
          onClick={() => { setIsMobileDrawerOpen(false); onOpenCompose?.(); }} 
          style={{ backgroundColor: currentTheme.accent }}
          className="w-full flex items-center justify-center gap-2.5 hover:brightness-105 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-sm transition-all active:scale-[0.99]"
        >
          <Edit3 className="w-4 h-4" />
          <span>Compose</span>
        </button>
      </div>

      {/* Folders */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5 custom-scrollbar">
        {primaryFolders.map(folder => {
          const isActive = activeFolderId === folder.id;
          return (
            <button 
              key={folder.id} 
              onClick={() => handleFolderSelect(folder.id)} 
              style={isActive ? {
                backgroundColor: currentTheme.accentBg,
                color: currentTheme.accent,
              } : undefined}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors duration-150 group ${
                isActive 
                  ? 'font-bold shadow-xs' 
                  : currentTheme.isDark 
                    ? 'text-slate-300 hover:bg-white/5 hover:text-white font-medium' 
                    : 'text-[#1E293B] hover:bg-[#F1F5F9] hover:text-[#0F172A] font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <span style={isActive ? { color: currentTheme.accent } : undefined} className={isActive ? '' : currentTheme.isDark ? 'text-slate-400 group-hover:text-white' : 'text-[#475569] group-hover:text-[#1E293B]'}>
                  {getFolderIcon(folder.slug)}
                </span>
                <span>{folder.name}</span>
              </div>
              {folder.unreadCount > 0 && (
                <span 
                  style={isActive ? {
                    backgroundColor: currentTheme.accentBg,
                    color: currentTheme.accent,
                  } : undefined}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isActive ? '' : currentTheme.isDark ? 'bg-white/10 text-slate-300' : 'bg-[#E2E8F0] text-[#334155]'
                  }`}
                >
                  {folder.unreadCount}
                </span>
              )}
            </button>
          );
        })}

        {secondaryFolders.length > 0 && (
          <div style={{ borderColor: currentTheme.border }} className="mt-2 pt-2 border-t">
            <button 
              onClick={() => setIsMoreFoldersOpen(!isMoreFoldersOpen)} 
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                currentTheme.isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
              }`}
            >
              <span>{isMoreFoldersOpen ? 'Less' : 'More'}</span>
              {isMoreFoldersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {isMoreFoldersOpen && (
              <div className="mt-1 space-y-0.5">
                {secondaryFolders.map(folder => {
                  const isActive = activeFolderId === folder.id;
                  return (
                    <button 
                      key={folder.id} 
                      onClick={() => handleFolderSelect(folder.id)} 
                      style={isActive ? {
                        backgroundColor: currentTheme.accentBg,
                        color: currentTheme.accent,
                      } : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors duration-150 group ${
                        isActive 
                          ? 'font-bold' 
                          : currentTheme.isDark 
                            ? 'text-slate-300 hover:bg-white/5 hover:text-white font-medium' 
                            : 'text-[#1E293B] hover:bg-[#F1F5F9] hover:text-[#0F172A] font-semibold'
                      }`}
                    >
                      <span style={isActive ? { color: currentTheme.accent } : undefined} className={isActive ? '' : currentTheme.isDark ? 'text-slate-400 group-hover:text-white' : 'text-[#475569] group-hover:text-[#1E293B]'}>
                        {getFolderIcon(folder.slug)}
                      </span>
                      <span>{folder.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div style={{ borderColor: currentTheme.border }} className="mt-4 pt-2 border-t">
          <div className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center justify-between ${currentTheme.isDark ? 'text-slate-400' : 'text-[#475569]'}`}>
            <span>Labels</span>
            <button
              type="button"
              onClick={() => setIsCreateLabelModalOpen(true)}
              style={{ color: currentTheme.accent }}
              className="p-1 rounded-md hover:bg-white/10 transition-colors"
              title="Create new label"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-1 space-y-0.5">
            {customLabels.map(label => {
              const isActive = activeLabelId === label.id;
              return (
                <button 
                  key={label.id} 
                  onClick={() => handleLabelSelect(label.id)} 
                  style={isActive ? {
                    backgroundColor: currentTheme.accentBg,
                    color: currentTheme.accent,
                  } : undefined}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-sm transition-colors group ${
                    isActive ? 'font-bold' : currentTheme.isDark ? 'text-slate-300 hover:bg-white/5 hover:text-white font-medium' : 'text-[#1E293B] hover:bg-[#F1F5F9] hover:text-[#0F172A] font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: label.color }}></span>
                    <span className="truncate">{label.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contacts Link */}
        <div style={{ borderColor: currentTheme.border }} className="mt-4 pt-2 border-t">
          <button
            type="button"
            onClick={() => { window.location.href = '/contacts'; }}
            style={activeFolderId === 'contacts' ? {
              backgroundColor: currentTheme.accentBg,
              color: currentTheme.accent,
            } : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors group ${
              activeFolderId === 'contacts'
                ? 'font-bold'
                : currentTheme.isDark
                  ? 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'
                  : 'text-[#1E293B] hover:bg-[#F1F5F9] hover:text-[#0F172A] font-semibold'
            }`}
          >
            <span style={activeFolderId === 'contacts' ? { color: currentTheme.accent } : undefined} className={activeFolderId === 'contacts' ? '' : currentTheme.isDark ? 'text-slate-400 group-hover:text-white' : 'text-[#475569] group-hover:text-[#1E293B]'}>
              <Users className="w-4 h-4" />
            </span>
            <span>Contacts</span>
          </button>
        </div>
      </div>

      {/* Storage Gauge (Real Dynamic 500 MB Free Tier) */}
      <div 
        style={{
          borderColor: currentTheme.border,
          backgroundColor: currentTheme.bgSidebar,
        }}
        className="p-4 border-t"
      >
        <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
          <span style={{ color: currentTheme.isDark ? '#94A3B8' : '#475569' }}>Storage</span>
          <span style={{ color: currentTheme.isDark ? '#F8FAFC' : '#0F172A' }} className="font-bold">
            {storageStats.usedMb} / {storageStats.quotaMb}
          </span>
        </div>
        <div style={{ backgroundColor: currentTheme.isDark ? '#1E293B' : '#E2E8F0' }} className="h-1.5 w-full rounded-full overflow-hidden">
          <div 
            style={{ width: `${Math.max(storageStats.percentage, 2)}%`, backgroundColor: currentTheme.accent }}
            className="h-full rounded-full transition-all duration-500" 
          ></div>
        </div>
      </div>
    </div>
  );

  return (
    <div 
      suppressHydrationWarning
      style={{
        backgroundColor: currentTheme.bgMain,
        color: currentTheme.isDark ? '#F8FAFC' : '#0F172A',
        ['--theme-bg-main' as any]: currentTheme.bgMain,
        ['--theme-bg-sidebar' as any]: currentTheme.bgSidebar,
        ['--theme-bg-header' as any]: currentTheme.bgHeader,
        ['--theme-bg-card' as any]: currentTheme.bgCard,
        ['--theme-bg-hover' as any]: currentTheme.bgHover,
        ['--theme-border' as any]: currentTheme.border,
        ['--theme-accent' as any]: currentTheme.accent,
        ['--theme-accent-hover' as any]: currentTheme.accentHover,
        ['--theme-accent-bg' as any]: currentTheme.accentBg,
        ['--theme-accent-glow' as any]: currentTheme.accentGlow,
        ['--theme-text-primary' as any]: currentTheme.isDark ? '#F8FAFC' : '#0F172A',
        ['--theme-text-secondary' as any]: currentTheme.isDark ? '#CBD5E1' : '#475569',
        ['--theme-text-muted' as any]: currentTheme.isDark ? '#94A3B8' : '#64748B',
      }}
      className={`flex h-screen w-screen overflow-hidden relative font-sans transition-colors duration-300 ${currentTheme.isDark ? 'dark' : ''}`}
    >
      
      {/* Desktop Left Sidebar */}
      <div 
        suppressHydrationWarning
        style={{ borderColor: currentTheme.border }}
        className="hidden md:flex h-full z-10 border-r"
      >
        {renderSidebarContent()}
      </div>

      {/* Mobile Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileDrawerOpen(false)} />
          <div className="relative w-64 h-full shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-300">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main App Area */}
      <div 
        style={{ backgroundColor: currentTheme.bgMain }}
        className="flex-1 flex flex-col min-w-0 overflow-hidden relative"
      >
        
        {/* Header */}
        <header 
          style={{
            backgroundColor: currentTheme.bgHeader,
            borderColor: currentTheme.border,
            color: currentTheme.isDark ? '#F8FAFC' : '#0F172A',
          }}
          className="h-16 px-4 md:px-6 border-b flex items-center justify-between gap-4 z-20 transition-colors duration-300"
        >
          <div className="flex items-center gap-3 md:gap-4 flex-1">
            <button 
              onClick={() => setIsMobileDrawerOpen(true)} 
              className={`md:hidden p-2 -ml-2 rounded-lg transition-colors ${currentTheme.isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Search Bar & Advanced Filter Popover */}
            <div className="max-w-2xl w-full flex-1 relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search style={{ color: currentTheme.isDark ? '#64748B' : '#94A3B8' }} className="w-4 h-4" />
              </div>
              <input 
                id="global-search"
                type="text" 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); onSearch?.(e.target.value); }}
                placeholder="Search mail, people, or settings..." 
                style={{
                  backgroundColor: currentTheme.isDark ? currentTheme.bgCard : '#F8FAFC',
                  borderColor: currentTheme.border,
                  color: currentTheme.isDark ? '#F8FAFC' : '#0F172A',
                }}
                className="w-full border text-sm rounded-xl pl-10 pr-20 py-2.5 outline-none focus:ring-2 focus:ring-[#14B8A6]/20 transition-all placeholder:text-[#64748B] shadow-sm"
              />
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
                  style={isAdvancedSearchOpen ? {
                    backgroundColor: currentTheme.accentBg,
                    color: currentTheme.accent,
                  } : undefined}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isAdvancedSearchOpen
                      ? ''
                      : currentTheme.isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                  }`}
                  title="Show search options"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
                <div 
                  style={{
                    backgroundColor: currentTheme.isDark ? currentTheme.bgMain : '#F1F5F9',
                    borderColor: currentTheme.border,
                  }}
                  className="hidden sm:flex items-center gap-0.5 text-[10px] font-bold opacity-60 px-1.5 py-0.5 rounded border shadow-sm pointer-events-none"
                >
                  <Command className="w-3 h-3" />
                  <span>K</span>
                </div>
              </div>

              {/* Advanced Search Modal Popover */}
              <AdvancedSearchModal
                isOpen={isAdvancedSearchOpen}
                onClose={() => setIsAdvancedSearchOpen(false)}
                onSearch={(q) => {
                  setSearchQuery(q);
                  onSearch?.(q);
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {/* AI Action Pill */}
            <button 
              style={{
                backgroundColor: currentTheme.accentBg,
                borderColor: currentTheme.border,
                color: currentTheme.accent,
              }}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border hover:opacity-90 transition-all text-xs font-semibold shadow-sm"
            >
              <Sparkles style={{ color: currentTheme.accent }} className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>

            {/* Keyboard Shortcuts Trigger */}
            <button
              type="button"
              onClick={() => setIsShortcutsModalOpen(true)}
              className={`p-2 rounded-xl transition-colors relative ${
                currentTheme.isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
              }`}
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
            >
              <Keyboard className="w-5 h-5" />
            </button>

            {/* Quick Settings Button */}
            <button
              type="button"
              onClick={() => setIsQuickSettingsOpen(true)}
              className={`p-2 rounded-xl transition-colors relative ${
                currentTheme.isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
              }`}
              title="Settings"
              aria-label="Quick Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative ml-1">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)} 
                style={{ background: `linear-gradient(135deg, ${currentTheme.accent}, #0E172A)` }}
                className="w-9 h-9 rounded-full p-[2px] transition-transform hover:scale-105 active:scale-95 shadow-sm"
              >
                <div 
                  style={{ backgroundColor: currentTheme.bgSidebar }}
                  className="w-full h-full rounded-full flex items-center justify-center"
                >
                  <span style={{ color: currentTheme.accent }} className="text-xs font-bold">{currentUser?.displayName?.slice(0, 2).toUpperCase() || 'RK'}</span>
                </div>
              </button>
              {isProfileOpen && (
                <div 
                  style={{
                    backgroundColor: currentTheme.bgCard,
                    borderColor: currentTheme.border,
                    color: currentTheme.isDark ? '#F8FAFC' : '#0F172A',
                  }}
                  className="absolute right-0 mt-3 w-64 rounded-2xl border shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 origin-top-right"
                >
                  <div style={{ borderColor: currentTheme.border }} className="px-4 py-3 border-b flex flex-col">
                    <span className="text-sm font-bold truncate">{currentUser?.displayName || 'Rahul Kumar'}</span>
                    <span className="text-xs opacity-60 truncate">{currentUser?.email || 'rahul@eazzio.com'}</span>
                  </div>
                  <div className="p-2">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors">
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <main 
          style={{ backgroundColor: currentTheme.bgMain }}
          className="flex-1 flex overflow-hidden relative"
        >
          {/* Main Children (Thread List / Mail View) */}
          <div 
            style={{ backgroundColor: currentTheme.bgMain }}
            className="flex-1 flex min-w-0 overflow-hidden relative"
          >
            {children}
          </div>
        </main>
      </div>

      {/* Quick Settings Slide-Over Panel */}
      <QuickSettingsPanel
        isOpen={isQuickSettingsOpen}
        onClose={() => setIsQuickSettingsOpen(false)}
        onOpenFullSettings={() => {
          if (onOpenSettings) onOpenSettings();
        }}
        density={activeDensity}
        onChangeDensity={handleDensityChange}
        theme={theme}
        onChangeTheme={handleThemeChange}
        inboxType={inboxType}
        onChangeInboxType={handleInboxTypeChange}
        readingPane={activeReadingPane}
        onChangeReadingPane={handleReadingPaneChange}
        conversationView={conversationView}
        onToggleConversationView={handleConversationViewToggle}
      />

      {/* Create New Label Modal */}
      {isCreateLabelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div 
            className="w-full max-w-md rounded-2xl bg-white border border-[#E2E8F0] shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172A]">New label</h3>
              <button 
                type="button" 
                onClick={() => setIsCreateLabelModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormCreateLabel} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1.5">
                  Please enter a new label name:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="e.g. Invoices, Projects, Urgent"
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-sm text-[#0F172A] rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6] transition-all placeholder:text-[#64748B]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-2">
                  Label color:
                </label>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {LABEL_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewLabelColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                        newLabelColor === c ? 'scale-110 ring-2 ring-[#0F172A] ring-offset-2 ring-offset-white' : 'hover:scale-105'
                      }`}
                    >
                      {newLabelColor === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateLabelModalOpen(false);
                    setNewLabelName('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newLabelName.trim() || isCreatingLabel}
                  className="px-5 py-2 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] disabled:opacity-50 text-xs font-semibold text-white transition-all shadow-sm"
                >
                  {isCreatingLabel ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 1119: Discoverable Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
};
