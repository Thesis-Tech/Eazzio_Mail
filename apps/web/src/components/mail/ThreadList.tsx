'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Star, Paperclip, CheckSquare, Square, MinusSquare, Trash2, Archive, 
  Mail, MailOpen, AlertOctagon, ChevronLeft, ChevronRight, RefreshCw, 
  Tag, Clock, MoreVertical, ChevronDown, Bookmark, VolumeX, SlidersHorizontal, 
  ShieldCheck, Inbox, Users, Tag as TagIcon, Bell, Info
} from 'lucide-react';
import { ThreadSummary } from '@/types/mail';

export interface ThreadListProps {
  threads: ThreadSummary[];
  selectedThreadId?: string | null;
  onSelectThread: (threadId: string) => void;
  onToggleStar?: (threadId: string) => void;
  onBulkDelete?: (threadIds: string[]) => void;
  onBulkArchive?: (threadIds: string[]) => void;
  onBulkUnarchive?: (threadIds: string[]) => void;
  onBulkMarkRead?: (threadIds: string[], isRead: boolean) => void;
  onSnooze?: (threadIds: string[]) => void;
  onBulkSpam?: (threadIds: string[], isSpam: boolean) => void;
  onEmptyFolder?: (folderSlug: string) => void;
  onRefresh?: () => void;
  folderName?: string;
  totalThreadsCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (newPage: number) => void;
  isSplitView?: boolean;
  density?: 'default' | 'comfortable' | 'compact';
}

const CATEGORIES = [
  { id: 'primary', label: 'Primary', icon: Inbox, color: '#2D5BFF' },
  { id: 'promotions', label: 'Promotions', icon: TagIcon, color: '#10B981' },
  { id: 'social', label: 'Social', icon: Users, color: '#8B5CF6' },
  { id: 'updates', label: 'Updates', icon: Info, color: '#F59E0B', badge: '2 new' },
];

export const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  selectedThreadId,
  onSelectThread,
  onToggleStar,
  onBulkDelete,
  onBulkArchive,
  onBulkUnarchive,
  onBulkMarkRead,
  onSnooze,
  onBulkSpam,
  onEmptyFolder,
  onRefresh,
  folderName = 'Inbox',
  totalThreadsCount = 0,
  currentPage = 1,
  pageSize = 50,
  onPageChange,
  isSplitView = true,
  density = 'default',
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMenuOpen, setIsSelectMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('primary');
  const selectMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const isArchiveFolder = folderName.toLowerCase().includes('archive');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectMenuRef.current && !selectMenuRef.current.contains(e.target as Node)) setIsSelectMenuOpen(false);
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setIsMoreMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAllSelected = threads.length > 0 && selectedIds.size === threads.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < threads.length;

  const handleSelectAll = () => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(threads.map((t) => t.id)));
  };

  const handleToggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkAction = (action: 'read' | 'unread' | 'delete' | 'archive' | 'unarchive') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (action === 'delete' && onBulkDelete) onBulkDelete(ids);
    if (action === 'archive' && onBulkArchive) onBulkArchive(ids);
    if (action === 'unarchive' && onBulkUnarchive) onBulkUnarchive(ids);
    if (action === 'read' && onBulkMarkRead) onBulkMarkRead(ids, true);
    if (action === 'unread' && onBulkMarkRead) onBulkMarkRead(ids, false);
    setSelectedIds(new Set());
  };

  const totalCount = totalThreadsCount || threads.length;
  const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalCount);

  return (
    <div 
      style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)' }}
      className="flex flex-col h-full select-none min-w-0 font-sans relative"
    >
      {/* Gmail Action Toolbar */}
      <div 
        style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)', borderColor: 'var(--theme-border, #1E232B)' }}
        className="h-12 px-3 sm:px-4 border-b flex items-center justify-between gap-3 shrink-0 sticky top-0 z-10 select-none"
      >
        <div className="flex items-center gap-1 min-w-0">
          <div className="relative flex items-center shrink-0 mr-1" ref={selectMenuRef}>
            <div className="flex items-center rounded-lg p-0.5">
              <button 
                type="button"
                onClick={handleSelectAll} 
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Select all"
              >
                {isAllSelected ? (
                  <CheckSquare style={{ color: 'var(--theme-accent, #2D5BFF)' }} className="w-4 h-4" />
                ) : isPartiallySelected ? (
                  <MinusSquare style={{ color: 'var(--theme-accent, #2D5BFF)' }} className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
              <button 
                type="button"
                onClick={() => setIsSelectMenuOpen(!isSelectMenuOpen)} 
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            
            {isSelectMenuOpen && (
              <div 
                style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                className="absolute left-0 top-full mt-1 w-36 rounded-xl border shadow-2xl py-1 z-30 animate-in fade-in zoom-in-95"
              >
                <button type="button" onClick={() => { handleSelectAll(); setIsSelectMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 flex items-center justify-between">
                  <span>All</span>
                </button>
                <button type="button" onClick={() => { setSelectedIds(new Set(threads.filter(t => t.isUnread).map(t => t.id))); setIsSelectMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 flex items-center justify-between">
                  <span>Unread</span>
                </button>
                <button type="button" onClick={() => { setSelectedIds(new Set(threads.filter(t => !t.isUnread).map(t => t.id))); setIsSelectMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 flex items-center justify-between">
                  <span>Read</span>
                </button>
                <button type="button" onClick={() => { setSelectedIds(new Set(threads.filter(t => t.isStarred).map(t => t.id))); setIsSelectMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 flex items-center justify-between">
                  <span>Starred</span>
                </button>
              </div>
            )}
          </div>

          {selectedIds.size > 0 ? (
            <div className="flex items-center gap-1 animate-in fade-in">
              {isArchiveFolder ? (
                <button 
                  type="button" 
                  onClick={() => handleBulkAction('unarchive')} 
                  className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors" 
                  title="Move to Inbox (Unarchive)"
                >
                  <Mail className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={() => handleBulkAction('archive')} 
                  className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors" 
                  title="Archive"
                >
                  <Archive className="w-4 h-4" />
                </button>
              )}
              <button type="button" onClick={() => onBulkSpam?.(Array.from(selectedIds), true)} className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Report spam">
                <AlertOctagon className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => handleBulkAction('delete')} className="p-2 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => handleBulkAction('read')} className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Mark as read">
                <MailOpen className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => onSnooze?.(Array.from(selectedIds))} className="p-2 rounded-full text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors" title="Snooze">
                <Clock className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={onRefresh} className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-normal tracking-wider hidden sm:inline-block">
            {startIdx}–{endIdx} <span className="text-slate-500">of</span> {totalCount}
          </span>
          <div className="flex items-center">
            <button type="button" onClick={() => onPageChange?.(currentPage - 1)} disabled={currentPage <= 1} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => onPageChange?.(currentPage + 1)} disabled={endIdx >= totalCount} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Gmail-style Tabs (Inbox only) */}
      {folderName.toLowerCase() === 'inbox' && (
        <div 
          style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)', borderColor: 'var(--theme-border, #1E232B)' }}
          className="flex items-center px-2 border-b overflow-x-auto custom-scrollbar no-scrollbar relative shrink-0"
        >
          {CATEGORIES.map(cat => {
            const isCatActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2.5 px-6 py-3.5 text-xs font-semibold transition-all relative whitespace-nowrap ${
                  isCatActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                }`}
              >
                <cat.icon className={`w-4 h-4 ${isCatActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
                {cat.badge && (
                  <span className="text-[10px] bg-white/15 px-1.5 py-0.5 rounded-full font-bold text-slate-300">
                    {cat.badge}
                  </span>
                )}
                {isCatActive && (
                  <div 
                    style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }}
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  ></div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Threads List */}
      <div 
        style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)' }}
        className="flex-1 overflow-y-auto custom-scrollbar"
      >
        {threads.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
            <div 
              style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
              className="w-16 h-16 rounded-3xl border flex items-center justify-center text-slate-500 mb-4 shadow-xl"
            >
              <Mail className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-lg font-bold text-white mb-1 tracking-tight">Your inbox is empty</p>
            <p className="text-sm text-slate-500 max-w-xs">Messages you receive will appear here.</p>
          </div>
        ) : (
          <div 
            style={{ borderColor: 'var(--theme-border, #1E232B)' }}
            className="divide-y divide-white/5"
          >
            {threads.map((thread) => {
              const isSelected = selectedThreadId === thread.id;
              const isChecked = selectedIds.has(thread.id);
              const unread = thread.isUnread;

              return (
                <div
                  key={thread.id}
                  onClick={() => onSelectThread(thread.id)}
                  style={{
                    backgroundColor: isSelected 
                      ? 'rgba(45, 91, 255, 0.12)' 
                      : isChecked 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : unread 
                      ? 'rgba(255, 255, 255, 0.03)' 
                      : 'transparent',
                    borderLeftColor: isSelected ? 'var(--theme-accent, #2D5BFF)' : 'transparent',
                  }}
                  className="group relative flex items-center py-2.5 px-3 sm:px-4 transition-all cursor-pointer border-l-[3px] hover:bg-white/[0.04]"
                >
                  {/* Left Controls: Drag Handle, Checkbox, Star, Importance Chevron */}
                  <div className="flex items-center gap-2 mr-3 shrink-0">
                    <button 
                      type="button"
                      onClick={(e) => handleToggleSelectOne(thread.id, e)} 
                      className="text-slate-500 hover:text-white transition-colors"
                    >
                      {isChecked ? (
                        <CheckSquare style={{ color: 'var(--theme-accent, #2D5BFF)' }} className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                      )}
                    </button>

                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onToggleStar?.(thread.id); }} 
                      className={`transition-colors ${thread.isStarred ? 'text-amber-400' : 'text-slate-600 hover:text-slate-300 opacity-40 group-hover:opacity-100'}`}
                    >
                      <Star className={`w-4 h-4 ${thread.isStarred ? 'fill-amber-400' : ''}`} />
                    </button>

                    {/* Gmail Yellow Importance Chevron */}
                    <span 
                      onClick={(e) => e.stopPropagation()} 
                      className="text-amber-500/80 hover:text-amber-400 font-bold text-sm select-none cursor-pointer leading-none px-0.5"
                    >
                      ›
                    </span>
                  </div>

                  {/* Sender Column */}
                  <div className={`w-36 sm:w-48 shrink-0 truncate mr-3 text-xs ${unread ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>
                    <span>{thread.sender.name || thread.sender.email}</span>
                    {thread.messageCount && thread.messageCount > 1 && (
                      <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                        {thread.messageCount}
                      </span>
                    )}
                  </div>

                  {/* Subject & Snippet (Gmail Single Line Format) */}
                  <div className="flex-1 min-w-0 flex items-center gap-1.5 text-xs pr-4">
                    {thread.labels && thread.labels.map(lbl => (
                      <span key={lbl} className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[10px] font-medium whitespace-nowrap border border-blue-500/20">
                        {lbl}
                      </span>
                    ))}
                    <span className={`truncate ${unread ? 'font-bold text-white' : 'font-medium text-slate-200'}`}>
                      {thread.subject || '(No Subject)'}
                    </span>
                    <span className="text-slate-600 shrink-0">-</span>
                    <span className="truncate text-slate-400 font-normal">
                      {thread.snippet}
                    </span>
                  </div>

                  {/* Right Meta & Floating Hover Actions */}
                  <div className="flex items-center justify-end shrink-0 w-24 relative select-none">
                    {/* Default Timestamp / Paperclip */}
                    <div className="flex items-center gap-1.5 transition-opacity duration-150 group-hover:opacity-0">
                      {thread.hasAttachments && <Paperclip className="w-3.5 h-3.5 text-slate-500" />}
                      <span className={`text-[11px] font-medium ${unread ? 'font-bold text-white' : 'text-slate-400'}`}>
                        {thread.lastMessageAt}
                      </span>
                    </div>
                    
                    {/* Hover Actions Bar (Gmail Icons) */}
                    <div 
                      style={{ backgroundColor: 'var(--theme-bg-sidebar, #090A0D)', borderColor: 'var(--theme-border, #2A313C)' }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-0.5 p-1 rounded-full border shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-150"
                    >
                      {isArchiveFolder ? (
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onBulkUnarchive?.([thread.id]); }} 
                          className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors" 
                          title="Move to Inbox (Unarchive)"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onBulkArchive?.([thread.id]); }} 
                          className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors" 
                          title="Archive"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onBulkDelete?.([thread.id]); }} 
                        className="p-1.5 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors" 
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onBulkMarkRead?.([thread.id], !thread.isUnread); }} 
                        className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors" 
                        title={thread.isUnread ? 'Mark Read' : 'Mark Unread'}
                      >
                        {thread.isUnread ? <MailOpen className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onSnooze?.([thread.id]); }} 
                        className="p-1.5 rounded-full text-slate-400 hover:text-amber-400 hover:bg-amber-500/20 transition-colors" 
                        title="Snooze"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadList;
