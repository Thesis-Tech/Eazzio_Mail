'use client';

import React, { useState } from 'react';
import {
  Inbox,
  Send,
  FileText,
  AlertOctagon,
  Trash2,
  Archive,
  Star,
  Bookmark,
  Plus,
  Tag,
  ShieldCheck,
  Settings,
  Clock,
  ShoppingBag,
  Calendar,
  Mail,
  ChevronDown,
  ChevronUp,
  Edit3,
} from 'lucide-react';
import { FolderItem, LabelItem } from '../../types/mail';

interface NavigationSidebarProps {
  folders: FolderItem[];
  labels: LabelItem[];
  activeFolderId: string;
  activeLabelId?: string;
  onSelectFolder: (folderId: string) => void;
  onSelectLabel: (labelId: string) => void;
  onOpenCompose: () => void;
  onOpenSettings?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  folders = [],
  labels = [],
  activeFolderId,
  activeLabelId,
  onSelectFolder,
  onSelectLabel,
  onOpenCompose,
  onOpenSettings,
  isCollapsed = false,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const getFolderIcon = (slug: string) => {
    switch (slug.toLowerCase()) {
      case 'inbox':
        return <Inbox className="w-4 h-4 text-blue-400" />;
      case 'starred':
        return <Star className="w-4 h-4 text-amber-400 fill-amber-400/20" />;
      case 'snoozed':
        return <Clock className="w-4 h-4 text-orange-400" />;
      case 'sent':
        return <Send className="w-4 h-4 text-sky-400" />;
      case 'drafts':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'purchases':
        return <ShoppingBag className="w-4 h-4 text-pink-400" />;
      case 'important':
        return <Bookmark className="w-4 h-4 text-amber-400" />;
      case 'scheduled':
        return <Calendar className="w-4 h-4 text-cyan-400" />;
      case 'all':
      case 'all-mail':
        return <Mail className="w-4 h-4 text-indigo-400" />;
      case 'spam':
        return <AlertOctagon className="w-4 h-4 text-rose-400" />;
      case 'trash':
        return <Trash2 className="w-4 h-4 text-red-400" />;
      case 'archive':
        return <Archive className="w-4 h-4 text-slate-400" />;
      default:
        return <Inbox className="w-4 h-4 text-slate-400" />;
    }
  };

  // Primary standard folders to show at top
  const primarySlugs = ['inbox', 'starred', 'sent', 'drafts'];
  const standardFolders = folders.filter((f) => primarySlugs.includes(f.slug.toLowerCase()));
  const extendedFolders = folders.filter((f) => !primarySlugs.includes(f.slug.toLowerCase()));

  // Determine display count for each folder
  // - Inbox: display unread count
  // - Drafts: display total drafts
  // - Other folders: display total count if active or > 0
  const getFolderDisplayCount = (folder: FolderItem) => {
    if (folder.slug === 'inbox') {
      return folder.unreadCount > 0 ? folder.unreadCount : null;
    }
    if (folder.slug === 'drafts') {
      return folder.totalCount > 0 ? folder.totalCount : null;
    }
    return folder.totalCount > 0 ? folder.totalCount : null;
  };

  return (
    <aside
      className={`h-full flex flex-col bg-[#111317] border-r border-[#22262E] text-[#E1E4EA] transition-all duration-200 ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
      data-testid="navigation-sidebar"
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#22262E]">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#14B8A6] to-[#0E172A] flex items-center justify-center font-black text-white shadow-md shadow-[#14B8A6]/20 shrink-0 text-sm">
            E
          </div>
          {!isCollapsed && (
            <div className="truncate flex items-center gap-1.5">
              <span className="font-semibold text-white tracking-tight text-base">Eazzio</span>
              <span className="font-medium text-[#14B8A6] text-xs px-1.5 py-0.5 rounded bg-[#134E4A]/30 border border-[#14B8A6]/30">
                Mail
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Compose Button */}
      <div className="p-3">
        <button
          onClick={onOpenCompose}
          className={`flex items-center gap-3 bg-[#14B8A6] hover:bg-[#19B8A4] active:scale-[0.98] text-white font-semibold py-3 px-5 rounded-2xl shadow-lg shadow-[#14B8A6]/20 transition-all ${
            isCollapsed ? 'w-11 h-11 px-0 justify-center' : 'w-auto'
          }`}
          data-testid="compose-button"
          title="Compose New Message (C)"
        >
          <Edit3 className="w-5 h-5 text-white shrink-0" />
          {!isCollapsed && <span className="text-sm font-semibold tracking-wide">Compose</span>}
        </button>
      </div>

      {/* Folder Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 custom-scrollbar">
        {standardFolders.map((folder) => {
          const isActive = activeFolderId === folder.id || (activeFolderId === 'fld-inbox' && folder.slug === 'inbox');
          const displayCount = getFolderDisplayCount(folder);

          return (
            <button
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              className={`w-full flex items-center justify-between px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#1E293B] text-white font-semibold'
                  : 'text-slate-300 hover:bg-[#16181D] hover:text-white'
              }`}
              data-testid={`folder-item-${folder.slug}`}
              title={folder.name}
            >
              <div className="flex items-center gap-3.5 truncate">
                {getFolderIcon(folder.slug)}
                {!isCollapsed && <span className="truncate">{folder.name}</span>}
              </div>
              {!isCollapsed && displayCount !== null && (
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                    folder.slug === 'inbox' && folder.unreadCount > 0
                      ? 'bg-[#14B8A6] text-white'
                      : isActive
                      ? 'text-white'
                      : 'text-slate-400'
                  }`}
                >
                  {displayCount}
                </span>
              )}
            </button>
          );
        })}

        {/* Accordion Toggle (More / Less) if extended folders exist */}
        {extendedFolders.length > 0 && (
          <>
            <button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className="w-full flex items-center justify-between px-4 py-2 rounded-full text-xs font-medium text-slate-400 hover:bg-[#16181D] hover:text-white transition-colors"
            >
              <div className="flex items-center gap-3.5">
                {isMoreOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {!isCollapsed && <span>{isMoreOpen ? 'Less' : 'More'}</span>}
              </div>
            </button>

            {/* Extended Folders (Spam, Trash, Archive, etc.) */}
            {isMoreOpen &&
              extendedFolders.map((folder) => {
                const isActive = activeFolderId === folder.id;
                const displayCount = getFolderDisplayCount(folder);

                return (
                  <button
                    key={folder.id}
                    onClick={() => onSelectFolder(folder.id)}
                    className={`w-full flex items-center justify-between px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#1E293B] text-white font-semibold'
                        : 'text-slate-400 hover:bg-[#16181D] hover:text-white'
                    }`}
                    data-testid={`folder-item-${folder.slug}`}
                    title={folder.name}
                  >
                    <div className="flex items-center gap-3.5 truncate">
                      {getFolderIcon(folder.slug)}
                      {!isCollapsed && <span className="truncate">{folder.name}</span>}
                    </div>
                    {!isCollapsed && displayCount !== null && (
                      <span className="text-[11px] font-bold text-slate-400">{displayCount}</span>
                    )}
                  </button>
                );
              })}
          </>
        )}

        {/* Labels Section */}
        {labels.length > 0 && (
          <div className="pt-4 border-t border-[#22262E]/70 mt-2">
            <div className="px-4 py-1 text-xs font-semibold text-slate-400 flex items-center justify-between">
              {!isCollapsed && <span>Labels</span>}
              {!isCollapsed && onOpenSettings && (
                <button onClick={onOpenSettings} title="Manage Labels">
                  <Plus className="w-3.5 h-3.5 text-slate-400 hover:text-white cursor-pointer" />
                </button>
              )}
            </div>
            {labels.map((label) => {
              const isActive = activeLabelId === label.id;
              return (
                <button
                  key={label.id}
                  onClick={() => onSelectLabel(label.id)}
                  className={`w-full flex items-center justify-between px-4 py-1.5 rounded-full text-xs transition-colors ${
                    isActive
                      ? 'bg-[#1E293B] text-white font-semibold'
                      : 'text-slate-400 hover:bg-[#16181D] hover:text-slate-200'
                  }`}
                  data-testid={`label-item-${label.name}`}
                  title={label.name}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: label.color || '#2D5BFF' }}
                    />
                    {!isCollapsed && <span className="truncate">{label.name}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer / Settings */}
      <div className="p-3 border-t border-[#22262E] flex items-center justify-between">
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full text-slate-400 hover:bg-[#16181D] hover:text-white transition-colors"
          title="Settings"
          data-testid="sidebar-settings-btn"
        >
          <Settings className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <ShieldCheck className="w-4 h-4" />
          {!isCollapsed && <span>Clean & Verified</span>}
        </div>
      </div>
    </aside>
  );
};
