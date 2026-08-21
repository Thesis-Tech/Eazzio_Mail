'use client';

import React from 'react';
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
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { FolderItem, LabelItem } from '../../types/mail';
import { PrivacyModeBadge } from '../PrivacyModeBadge';

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
  const getFolderIcon = (slug: string) => {
    switch (slug) {
      case 'inbox':
        return <Inbox className="w-4 h-4 text-blue-500" />;
      case 'starred':
        return <Star className="w-4 h-4 text-amber-400 fill-amber-400/30" />;
      case 'important':
        return <Bookmark className="w-4 h-4 text-amber-500" />;
      case 'sent':
        return <Send className="w-4 h-4 text-blue-400" />;
      case 'drafts':
        return <FileText className="w-4 h-4 text-amber-500" />;
      case 'spam':
        return <AlertOctagon className="w-4 h-4 text-orange-500" />;
      case 'trash':
        return <Trash2 className="w-4 h-4 text-red-400" />;
      case 'archive':
        return <Archive className="w-4 h-4 text-slate-400" />;
      default:
        return <Inbox className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <aside
      className={`h-full flex flex-col bg-[#16181D] border-r border-[#2A2E37] text-[#E1E4EA] transition-all duration-200 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
      data-testid="navigation-sidebar"
    >
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-[#2A2E37]">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-[#2D5BFF] flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 shrink-0">
            E
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <span className="font-semibold text-white tracking-tight">Eazzio</span>
              <span className="font-light text-[#FFA43D] ml-1">Mail</span>
            </div>
          )}
        </div>
      </div>

      {/* Compose Button */}
      <div className="p-3">
        <button
          onClick={onOpenCompose}
          className={`w-full flex items-center justify-center gap-2 bg-[#2D5BFF] hover:bg-[#1E48E0] active:scale-[0.98] text-white font-medium py-2.5 px-4 rounded-xl shadow-md transition-all ${
            isCollapsed ? 'px-0' : ''
          }`}
          data-testid="compose-button"
          title="Compose New Message (C)"
        >
          <Plus className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Compose</span>}
        </button>
      </div>

      {/* Folder Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 custom-scrollbar">
        <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {!isCollapsed && 'Mailboxes'}
        </div>
        {folders.map((folder) => {
          const isActive = activeFolderId === folder.id;
          return (
            <button
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#2D5BFF]/15 text-[#2D5BFF] font-semibold'
                  : 'text-slate-300 hover:bg-[#1C1F26] hover:text-white'
              }`}
              data-testid={`folder-item-${folder.slug}`}
              title={folder.name}
            >
              <div className="flex items-center gap-3 truncate">
                {getFolderIcon(folder.slug)}
                {!isCollapsed && <span className="truncate">{folder.name}</span>}
              </div>
              {!isCollapsed && folder.unreadCount > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-[#2D5BFF] text-white' : 'bg-[#2A2E37] text-slate-300'
                  }`}
                >
                  {folder.unreadCount}
                </span>
              )}
            </button>
          );
        })}

        {/* Labels Section */}
        {labels.length > 0 && (
          <div className="pt-4">
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              {!isCollapsed && <span>Labels</span>}
              {!isCollapsed && <Tag className="w-3.5 h-3.5 text-slate-400" />}
            </div>
            {labels.map((label) => {
              const isActive = activeLabelId === label.id;
              return (
                <button
                  key={label.id}
                  onClick={() => onSelectLabel(label.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-[#1C1F26] text-white font-semibold'
                      : 'text-slate-400 hover:bg-[#1C1F26] hover:text-slate-200'
                  }`}
                  data-testid={`label-item-${label.name}`}
                  title={label.name}
                >
                  <div className="flex items-center gap-2.5 truncate">
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

      {/* Footer / Privacy & Status */}
      <div className="p-3 border-t border-[#2A2E37] space-y-2">
        {!isCollapsed && (
          <div className="flex justify-center">
            <PrivacyModeBadge mode="standard" />
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-[#1C1F26] hover:text-white transition-colors"
            title="Settings"
            data-testid="sidebar-settings-btn"
          >
            <Settings className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            {!isCollapsed && <span className="font-medium">Protected</span>}
          </div>
        </div>
      </div>
    </aside>
  );
};
