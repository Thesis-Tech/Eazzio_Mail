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
  PanelRightClose, PanelRightOpen, HardDrive, 
} from 'lucide-react';
import { PrivacyModeBadge } from '../PrivacyModeBadge';

import { QuickSettingsPanel } from '../settings/QuickSettingsPanel';
import { AdvancedSearchModal } from '../search/AdvancedSearchModal';
import { SlidersHorizontal } from 'lucide-react';

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
  density?: 'default' | 'comfortable' | 'compact';
  onDensityChange?: (density: 'default' | 'comfortable' | 'compact') => void;
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
  bgMain: string;
  bgSidebar: string;
  bgHeader: string;
  bgCard: string;
  bgHover: string;
  border: string;
  accent: string;
  accentHover: string;
  accentBg: string;
  accentGlow: string;
}

export const THEME_CONFIGS: Record<string, ThemeConfig> = {
  'dark-oled': {
    id: 'dark-oled',
    name: 'Default Dark',
    bgMain: '#0A0C10',
    bgSidebar: '#090A0D',
    bgHeader: '#0A0C10',
    bgCard: '#12141A',
    bgHover: '#15181F',
    border: '#1E232B',
    accent: '#2D5BFF',
    accentHover: '#1E48E0',
    accentBg: 'rgba(45, 91, 255, 0.12)',
    accentGlow: 'rgba(45, 91, 255, 0.3)',
  },
  'emerald': {
    id: 'emerald',
    name: 'Cyber Emerald',
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
  },
  'midnight': {
    id: 'midnight',
    name: 'Midnight Blue',
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
  },
  'purple': {
    id: 'purple',
    name: 'Deep Amethyst',
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
  },
  'graphite': {
    id: 'graphite',
    name: 'Graphite Slate',
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
  },
  'sunset': {
    id: 'sunset',
    name: 'Crimson Dusk',
    bgMain: '#120609',
    bgSidebar: '#0B0305',
    bgHeader: '#120609',
    bgCard: '#240B13',
    bgHover: '#33101C',
    border: '#4D1627',
    accent: '#F43F5E',
    accentHover: '#E11D48',
    accentBg: 'rgba(244, 63, 94, 0.15)',
    accentGlow: 'rgba(244, 63, 94, 0.35)',
  },
};

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
  density: propDensity,
  onDensityChange,
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
  const [theme, setTheme] = useState('dark-oled');
  const [inboxType, setInboxType] = useState<'default' | 'important' | 'unread' | 'starred' | 'priority'>('default');
  const [readingPane, setReadingPane] = useState<'none' | 'right' | 'below'>('right');
  const [conversationView, setConversationView] = useState(true);

  // Active theme configuration
  const currentTheme = THEME_CONFIGS[theme] || THEME_CONFIGS['dark-oled']!;

  // Handle Density Change with instant persistence
  const handleDensityChange = (newDensity: 'default' | 'comfortable' | 'compact') => {
    setInternalDensity(newDensity);
    if (onDensityChange) onDensityChange(newDensity);
    try {
      localStorage.setItem('eazzio_density', newDensity);
      fetch('/api/settings/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ density: newDensity, theme, inboxType, readingPane, conversationView }),
      }).catch(() => {});
    } catch (_) {}
  };

  // Handle Theme Change with instant persistence
  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    try {
      localStorage.setItem('eazzio_theme', newTheme);
      fetch('/api/settings/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme, density: activeDensity, inboxType, readingPane, conversationView }),
      }).catch(() => {});
    } catch (_) {}
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

    // Restore saved theme and density from local storage or backend
    try {
      const savedTheme = localStorage.getItem('eazzio_theme');
      if (savedTheme && THEME_CONFIGS[savedTheme]) {
        setTheme(savedTheme);
      }
      const savedDensity = localStorage.getItem('eazzio_density') as 'default' | 'comfortable' | 'compact';
      if (savedDensity && ['default', 'comfortable', 'compact'].includes(savedDensity)) {
        setInternalDensity(savedDensity);
        if (onDensityChange) onDensityChange(savedDensity);
      }

      fetch('/api/settings/preferences')
        .then((res) => res.json())
        .then((json) => {
          if (json.data?.theme && THEME_CONFIGS[json.data.theme]) {
            setTheme(json.data.theme);
            localStorage.setItem('eazzio_theme', json.data.theme);
          }
          if (json.data?.density && ['default', 'comfortable', 'compact'].includes(json.data.density)) {
            setInternalDensity(json.data.density);
            if (onDensityChange) onDensityChange(json.data.density);
            localStorage.setItem('eazzio_density', json.data.density);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileDrawerOpen) setIsMobileDrawerOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
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
    if (typeof window !== 'undefined') window.location.href = '/login';
  };

  const getFolderIcon = (slug: string) => {
    switch (slug.toLowerCase()) {
      case 'inbox': return <Inbox className="w-[18px] h-[18px]" />;
      case 'starred': return <Star className="w-[18px] h-[18px]" />;
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
      style={{ backgroundColor: currentTheme.bgSidebar, borderColor: currentTheme.border }}
      className="flex flex-col h-full border-r text-slate-300 transition-all duration-300 ease-in-out w-64 overflow-hidden"
    >
      {/* Brand */}
      <div 
        style={{ borderColor: currentTheme.border }}
        className="h-16 px-5 flex items-center gap-3 border-b shrink-0 group cursor-pointer hover:bg-white/5 transition-colors"
      >
        <div 
          style={{ background: `linear-gradient(135deg, ${currentTheme.accent}, #14B8A6)` }}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-105 transition-transform"
        >
          E
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-white text-base tracking-tight leading-none">Eazzio</span>
          <span style={{ color: currentTheme.accent }} className="text-[10px] uppercase font-bold tracking-widest">Mail</span>
        </div>
      </div>

      {/* Compose */}
      <div className="p-4">
        <button onClick={() => { setIsMobileDrawerOpen(false); onOpenCompose?.(); }} className="w-full relative group">
          <div 
            style={{ background: `linear-gradient(135deg, ${currentTheme.accent}, #14B8A6)` }}
            className="absolute -inset-0.5 rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-300"
          ></div>
          <div 
            style={{ backgroundColor: currentTheme.bgCard, borderColor: currentTheme.border }}
            className="relative flex items-center gap-3 hover:brightness-110 text-white py-3 px-5 rounded-xl border transition-colors shadow-xl"
          >
            <Edit3 style={{ color: currentTheme.accent }} className="w-5 h-5" />
            <span className="font-semibold text-sm">Compose</span>
          </div>
        </button>
      </div>

      {/* Folders */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1 custom-scrollbar">
        {primaryFolders.map(folder => {
          const isActive = activeFolderId === folder.id;
          return (
            <button 
              key={folder.id} 
              onClick={() => handleFolderSelect(folder.id)} 
              style={isActive ? { backgroundColor: currentTheme.accentBg, color: currentTheme.accent } : undefined}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive ? 'font-semibold' : 'hover:bg-white/5 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <span style={isActive ? { color: currentTheme.accent } : undefined} className={isActive ? '' : 'text-slate-500 group-hover:text-slate-300'}>
                  {getFolderIcon(folder.slug)}
                </span>
                <span>{folder.name}</span>
              </div>
              {folder.unreadCount > 0 && (
                <span 
                  style={isActive ? { backgroundColor: currentTheme.accent, color: '#fff' } : { borderColor: currentTheme.border }}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${isActive ? '' : 'bg-white/10 text-slate-300 group-hover:bg-white/20'}`}
                >
                  {folder.unreadCount}
                </span>
              )}
            </button>
          );
        })}

        {secondaryFolders.length > 0 && (
          <div className="mt-4">
            <button onClick={() => setIsMoreFoldersOpen(!isMoreFoldersOpen)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors">
              <span>{isMoreFoldersOpen ? 'Less' : 'More'}</span>
              {isMoreFoldersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {isMoreFoldersOpen && (
              <div className="mt-1 space-y-1">
                {secondaryFolders.map(folder => {
                  const isActive = activeFolderId === folder.id;
                  return (
                    <button 
                      key={folder.id} 
                      onClick={() => handleFolderSelect(folder.id)} 
                      style={isActive ? { backgroundColor: currentTheme.accentBg, color: currentTheme.accent } : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive ? 'font-semibold' : 'hover:bg-white/5 hover:text-white'}`}
                    >
                      <span style={isActive ? { color: currentTheme.accent } : undefined} className={isActive ? '' : 'text-slate-500 group-hover:text-slate-300'}>
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

        <div className="mt-6">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Labels</span>
            <Plus className="w-4 h-4 cursor-pointer hover:text-white" />
          </div>
          <div className="mt-1 space-y-1">
            {customLabels.map(label => {
              const isActive = activeLabelId === label.id;
              return (
                <button key={label.id} onClick={() => handleLabelSelect(label.id)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: label.color }}></span>
                    <span>{label.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Storage Gauge */}
      <div style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bgSidebar }} className="p-4 border-t">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <span className="text-slate-400">Storage</span>
          <span className="text-white">4.2 GB / 15 GB</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            style={{ width: '28%', background: `linear-gradient(90deg, ${currentTheme.accent}, #14B8A6)` }}
            className="h-full rounded-full" 
          ></div>
        </div>
      </div>
    </div>
  );

  return (
    <div 
      style={{
        backgroundColor: currentTheme.bgMain,
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
      }}
      className="flex h-screen w-screen overflow-hidden text-[#EDEEF0] relative font-sans transition-colors duration-300"
    >
      
      {/* Desktop Left Sidebar */}
      <div className="hidden md:flex h-full z-10 shadow-2xl">
        {renderSidebarContent()}
      </div>

      {/* Mobile Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileDrawerOpen(false)} />
          <div className="relative w-64 h-full shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-300">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main App Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative" style={{ backgroundColor: currentTheme.bgMain }}>
        
        {/* Header */}
        <header 
          style={{ backgroundColor: currentTheme.bgHeader, borderColor: currentTheme.border }}
          className="h-16 px-4 md:px-6 backdrop-blur-md border-b flex items-center justify-between gap-4 z-20 transition-colors duration-300"
        >
          <div className="flex items-center gap-3 md:gap-4 flex-1">
            <button onClick={() => setIsMobileDrawerOpen(true)} className="md:hidden p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Search Bar & Advanced Filter Popover */}
            <div className="max-w-2xl w-full flex-1 relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search style={{ color: currentTheme.accent }} className="w-4 h-4 opacity-70 group-focus-within:opacity-100 transition-opacity" />
              </div>
              <input 
                id="global-search"
                type="text" 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); onSearch?.(e.target.value); }}
                placeholder="Search mail, people, or settings..." 
                style={{ backgroundColor: currentTheme.bgCard, borderColor: currentTheme.border }}
                className="w-full border text-sm text-white rounded-xl pl-10 pr-20 py-2.5 outline-none focus:ring-2 focus:ring-white/20 transition-all placeholder:text-slate-500 shadow-inner"
              />
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
                  style={isAdvancedSearchOpen ? { backgroundColor: currentTheme.accentBg, color: currentTheme.accent } : undefined}
                  className={`p-1 rounded-lg transition-colors ${
                    isAdvancedSearchOpen
                      ? ''
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                  title="Show search options"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
                <div className="hidden sm:flex items-center gap-0.5 text-[10px] font-bold text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 shadow-sm pointer-events-none">
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
            <button className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 text-purple-400 hover:from-purple-500/20 hover:to-blue-500/20 transition-all text-xs font-bold shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>

            {/* Quick Settings Button */}
            <button
              onClick={() => setIsQuickSettingsOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors relative"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative ml-1">
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-9 h-9 rounded-full p-[2px] transition-transform hover:scale-105 active:scale-95 shadow-md" style={{ background: `linear-gradient(135deg, ${currentTheme.accent}, #14B8A6)` }}>
                <div className="w-full h-full rounded-full bg-[#12141A] flex items-center justify-center border border-black/50">
                  <span className="text-white text-xs font-bold">{currentUser?.displayName?.slice(0, 2).toUpperCase() || 'RK'}</span>
                </div>
              </button>
              {isProfileOpen && (
                <div style={{ backgroundColor: currentTheme.bgCard, borderColor: currentTheme.border }} className="absolute right-0 mt-3 w-64 rounded-2xl backdrop-blur-xl border shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                  <div style={{ borderColor: currentTheme.border }} className="px-4 py-3 border-b flex flex-col">
                    <span className="text-sm font-bold text-white truncate">{currentUser?.displayName || 'Rahul Kumar'}</span>
                    <span className="text-xs text-slate-400 truncate">{currentUser?.email || 'rahul@eazzio.com'}</span>
                  </div>
                  <div className="p-2">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors">
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
        <main className="flex-1 flex overflow-hidden relative" style={{ backgroundColor: currentTheme.bgMain }}>
          {/* Main Children (Thread List / Mail View) */}
          <div className="flex-1 flex min-w-0 overflow-hidden relative" style={{ backgroundColor: currentTheme.bgMain }}>
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
        onChangeInboxType={setInboxType}
        readingPane={readingPane}
        onChangeReadingPane={setReadingPane}
        conversationView={conversationView}
        onToggleConversationView={setConversationView}
      />
    </div>
  );
};
