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
  SlidersHorizontal,
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
  folders,
  labels,
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
    switch (slug) {
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

  const standardFolders = [
    { id: 'fld-inbox', name: 'Inbox', slug: 'inbox', count: 441 },
    { id: 'fld-starred', name: 'Starred', slug: 'starred', count: 0 },
    { id: 'fld-snoozed', name: 'Snoozed', slug: 'snoozed', count: 0 },
    { id: 'fld-sent', name: 'Sent', slug: 'sent', count: 0 },
    { id: 'fld-drafts', name: 'Drafts', slug: 'drafts', count: 3 },
    { id: 'fld-purchases', name: 'Purchases', slug: 'purchases', count: 102 },
  ];

  const extendedFolders = [
    { id: 'fld-important', name: 'Important', slug: 'important', count: 0 },
    { id: 'fld-scheduled', name: 'Scheduled', slug: 'scheduled', count: 0 },
    { id: 'fld-all', name: 'All Mail', slug: 'all-mail', count: 516 },
    { id: 'fld-spam', name: 'Spam', slug: 'spam', count: 2 },
    { id: 'fld-trash', name: 'Trash', slug: 'trash', count: 0 },
  ];

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
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#EA4335] via-[#FBBC05] to-[#4285F4] flex items-center justify-center font-black text-white shadow-md shadow-red-500/20 shrink-0 text-sm">
            E
          </div>
          {!isCollapsed && (
            <div className="truncate flex items-center gap-1.5">
              <span className="font-semibold text-white tracking-tight text-base">Eazzio</span>
              <span className="font-medium text-[#EA4335] text-xs px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">Mail</span>
            </div>
          )}
        </div>
      </div>

      {/* Gmail-Style Floating Compose Button */}
      <div className="p-3">
        <button
          onClick={onOpenCompose}
          className={`flex items-center gap-3 bg-[#C2E7FF] hover:bg-[#B3DDF2] active:scale-[0.98] text-[#001D35] font-semibold py-3 px-5 rounded-2xl shadow-lg transition-all ${
            isCollapsed ? 'w-11 h-11 px-0 justify-center' : 'w-auto'
          }`}
          data-testid="compose-button"
          title="Compose New Message (C)"
        >
          <Edit3 className="w-5 h-5 text-[#001D35] shrink-0" />
          {!isCollapsed && <span className="text-sm font-semibold tracking-wide">Compose</span>}
        </button>
      </div>

      {/* Folder Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 custom-scrollbar">
        {standardFolders.map((folder) => {
          const isActive = activeFolderId === folder.id || (activeFolderId === 'fld-inbox' && folder.slug === 'inbox');
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
              {!isCollapsed && folder.count > 0 && (
                <span
                  className={`text-[11px] font-bold ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {folder.count}
                </span>
              )}
            </button>
          );
        })}

        {/* Accordion Toggle (More / Less) */}
        <button
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className="w-full flex items-center justify-between px-4 py-2 rounded-full text-xs font-medium text-slate-400 hover:bg-[#16181D] hover:text-white transition-colors"
        >
          <div className="flex items-center gap-3.5">
            {isMoreOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {!isCollapsed && <span>{isMoreOpen ? 'Less' : 'More'}</span>}
          </div>
        </button>

        {/* Extended Folders when open */}
        {isMoreOpen &&
          extendedFolders.map((folder) => {
            const isActive = activeFolderId === folder.id;
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
                {!isCollapsed && folder.count > 0 && (
                  <span className="text-[11px] font-bold text-slate-400">{folder.count}</span>
                )}
              </button>
            );
          })}

        {/* Labels Section */}
        <div className="pt-4 border-t border-[#22262E]/70 mt-2">
          <div className="px-4 py-1 text-xs font-semibold text-slate-400 flex items-center justify-between">
            {!isCollapsed && <span>Labels</span>}
            {!isCollapsed && <Plus className="w-3.5 h-3.5 text-slate-400 hover:text-white cursor-pointer" />}
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
