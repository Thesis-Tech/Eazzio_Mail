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
  const [isRightRailOpen, setIsRightRailOpen] = useState<boolean>(true);
  const [activeRightTab, setActiveRightTab] = useState<'calendar' | 'tasks' | 'notes'>('calendar');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
    <div className="flex flex-col h-full bg-[#090A0D] border-r border-[#1E232B] text-slate-300 transition-all duration-300 ease-in-out w-64 overflow-hidden">
      {/* Brand */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-[#1E232B] shrink-0 group cursor-pointer hover:bg-[#121419] transition-colors">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2D5BFF] to-[#14B8A6] flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-[#2D5BFF]/20 group-hover:scale-105 transition-transform">E</div>
        <div className="flex flex-col">
          <span className="font-bold text-white text-base tracking-tight leading-none">Eazzio</span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#14B8A6]">Mail</span>
        </div>
      </div>

      {/* Compose */}
      <div className="p-4">
        <button onClick={() => { setIsMobileDrawerOpen(false); onOpenCompose?.(); }} className="w-full relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2D5BFF] to-[#14B8A6] rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-300"></div>
          <div className="relative flex items-center gap-3 bg-[#111318] hover:bg-[#15181F] text-white py-3 px-5 rounded-xl border border-white/10 transition-colors shadow-xl">
            <Edit3 className="w-5 h-5 text-[#14B8A6]" />
            <span className="font-semibold text-sm">Compose</span>
          </div>
        </button>
      </div>

      {/* Folders */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1 custom-scrollbar">
        {primaryFolders.map(folder => {
          const isActive = activeFolderId === folder.id;
          return (
            <button key={folder.id} onClick={() => handleFolderSelect(folder.id)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive ? 'bg-[#2D5BFF]/10 text-[#2D5BFF]' : 'hover:bg-[#15181F] hover:text-white'}`}>
              <div className="flex items-center gap-3">
                <span className={`${isActive ? 'text-[#2D5BFF]' : 'text-slate-500 group-hover:text-slate-300'}`}>{getFolderIcon(folder.slug)}</span>
                <span>{folder.name}</span>
              </div>
              {folder.unreadCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${isActive ? 'bg-[#2D5BFF] text-white' : 'bg-[#1E232B] text-slate-300 group-hover:bg-[#2A313C]'}`}>{folder.unreadCount}</span>
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
                    <button key={folder.id} onClick={() => handleFolderSelect(folder.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive ? 'bg-[#2D5BFF]/10 text-[#2D5BFF]' : 'hover:bg-[#15181F] hover:text-white'}`}>
                      <span className={`${isActive ? 'text-[#2D5BFF]' : 'text-slate-500 group-hover:text-slate-300'}`}>{getFolderIcon(folder.slug)}</span>
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
                <button key={label.id} onClick={() => handleLabelSelect(label.id)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive ? 'bg-white/5 text-white' : 'hover:bg-[#15181F] hover:text-white'}`}>
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
      <div className="p-4 border-t border-[#1E232B] bg-[#0C0E12]">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <span className="text-slate-400">Storage</span>
          <span className="text-white">4.2 GB / 15 GB</span>
        </div>
        <div className="h-1.5 w-full bg-[#1E232B] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#2D5BFF] to-[#14B8A6] rounded-full" style={{ width: '28%' }}></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0C10] text-[#EDEEF0] relative font-sans selection:bg-[#2D5BFF]/30">
      
      {/* Desktop Left Sidebar */}
      <div className="hidden md:flex h-full z-10 shadow-2xl">
        {renderSidebarContent()}
      </div>

      {/* Mobile Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileDrawerOpen(false)} />
          <div className="relative w-64 h-full bg-[#090A0D] shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-300">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main App Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Header */}
        <header className="h-16 px-4 md:px-6 bg-[#0A0C10]/90 backdrop-blur-md border-b border-[#1E232B] flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3 md:gap-4 flex-1">
            <button onClick={() => setIsMobileDrawerOpen(true)} className="md:hidden p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E232B]">
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Search Bar */}
            <div className="max-w-2xl w-full flex-1 relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-500 group-focus-within:text-[#2D5BFF] transition-colors" />
              </div>
              <input 
                id="global-search"
                type="text" 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); onSearch?.(e.target.value); }}
                placeholder="Search mail, people, or settings..." 
                className="w-full bg-[#12141A] border border-[#1E232B] text-sm text-white rounded-xl pl-10 pr-12 py-2.5 outline-none focus:border-[#2D5BFF]/50 focus:bg-[#151821] focus:ring-4 focus:ring-[#2D5BFF]/10 transition-all placeholder:text-slate-500 shadow-inner"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <div className="flex items-center gap-0.5 text-[10px] font-bold text-slate-500 bg-[#1E232B] px-1.5 py-0.5 rounded border border-slate-700/50 shadow-sm">
                  <Command className="w-3 h-3" />
                  <span>K</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {/* AI Action Pill */}
            <button className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 text-purple-400 hover:from-purple-500/20 hover:to-blue-500/20 transition-all text-xs font-bold shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>

            <button onClick={onOpenSettings} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1E232B] transition-colors relative">
              <Settings className="w-5 h-5" />
            </button>

            <button onClick={() => setIsRightRailOpen(!isRightRailOpen)} className="p-2 rounded-xl text-slate-400 hover:text-[#14B8A6] hover:bg-[#14B8A6]/10 transition-colors hidden lg:block">
              {isRightRailOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
            </button>

            {/* Profile Dropdown */}
            <div className="relative ml-1">
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2D5BFF] to-[#14B8A6] p-[2px] transition-transform hover:scale-105 active:scale-95 shadow-md">
                <div className="w-full h-full rounded-full bg-[#12141A] flex items-center justify-center border border-black/50">
                  <span className="text-white text-xs font-bold">{currentUser?.displayName?.slice(0, 2).toUpperCase() || 'RK'}</span>
                </div>
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-[#12141A]/95 backdrop-blur-xl border border-[#1E232B] shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                  <div className="px-4 py-3 border-b border-[#1E232B] flex flex-col">
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

        {/* Content Area */}
        <main className="flex-1 flex overflow-hidden bg-[#0A0C10] relative z-0">
          <div className="flex-1 flex flex-col min-w-0 bg-white/[0.02] rounded-tl-xl border-t border-l border-white/[0.05] overflow-hidden m-0 md:m-2 md:mb-0 md:mr-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            {children}
          </div>

          {/* Right Rail */}
          {isRightRailOpen && (
            <div className="hidden lg:flex flex-col w-[320px] bg-[#0A0C10] border-l border-[#1E232B] animate-in slide-in-from-right duration-300">
              <div className="h-14 flex items-center justify-around border-b border-[#1E232B] px-2 shrink-0">
                <button onClick={() => setActiveRightTab('calendar')} className={`p-2 rounded-xl flex flex-col items-center gap-1 w-16 transition-colors ${activeRightTab === 'calendar' ? 'text-[#2D5BFF] bg-[#2D5BFF]/10' : 'text-slate-500 hover:text-white hover:bg-[#1E232B]'}`}>
                  <CalendarDays className="w-5 h-5" />
                </button>
                <button onClick={() => setActiveRightTab('tasks')} className={`p-2 rounded-xl flex flex-col items-center gap-1 w-16 transition-colors ${activeRightTab === 'tasks' ? 'text-[#2D5BFF] bg-[#2D5BFF]/10' : 'text-slate-500 hover:text-white hover:bg-[#1E232B]'}`}>
                  <CheckSquare className="w-5 h-5" />
                </button>
                <button onClick={() => setActiveRightTab('notes')} className={`p-2 rounded-xl flex flex-col items-center gap-1 w-16 transition-colors ${activeRightTab === 'notes' ? 'text-[#2D5BFF] bg-[#2D5BFF]/10' : 'text-slate-500 hover:text-white hover:bg-[#1E232B]'}`}>
                  <LayoutList className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
                {activeRightTab === 'calendar' && (
                  <div className="space-y-4 animate-in fade-in">
                    <h3 className="text-sm font-bold text-white mb-4">Upcoming Schedule</h3>
                    <div className="p-4 rounded-2xl bg-[#12141A] border border-[#1E232B] hover:border-[#2D5BFF]/30 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#2D5BFF] mb-1">
                        <Clock className="w-3.5 h-3.5" /> 10:00 AM - 11:30 AM
                      </div>
                      <div className="text-sm font-semibold text-white mb-2">Team Sync & Review</div>
                      <div className="flex -space-x-2">
                        <div className="w-6 h-6 rounded-full bg-rose-500 border-2 border-[#12141A] flex items-center justify-center text-[10px] font-bold">JD</div>
                        <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#12141A] flex items-center justify-center text-[10px] font-bold">AS</div>
                        <div className="w-6 h-6 rounded-full bg-slate-700 border-2 border-[#12141A] flex items-center justify-center text-[10px] font-bold">+3</div>
                      </div>
                    </div>
                  </div>
                )}
                {activeRightTab === 'tasks' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-white">Tasks</h3>
                      <button className="p-1 rounded bg-[#1E232B] hover:bg-white/10 text-white"><Plus className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#12141A] transition-colors cursor-pointer">
                      <div className="w-4 h-4 rounded border border-slate-500 mt-0.5"></div>
                      <div>
                        <div className="text-sm font-medium text-white">Review Q3 Marketing Plan</div>
                        <div className="text-xs text-rose-400 font-medium mt-1">Due Today</div>
                      </div>
                    </div>
                  </div>
                )}
                {activeRightTab === 'notes' && (
                  <div className="space-y-4 animate-in fade-in">
                    <h3 className="text-sm font-bold text-white mb-4">Keep / Notes</h3>
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500/90 text-sm">
                      <div className="font-bold mb-1">Ideas for redesign</div>
                      <ul className="list-disc pl-4 space-y-1 text-xs">
                        <li>More gradient glow</li>
                        <li>Subtle inner shadows</li>
                        <li>Bento box layouts</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
