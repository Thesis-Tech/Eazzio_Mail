'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Star, Paperclip, CheckSquare, Square, MinusSquare, Trash2, Archive, 
  Mail, MailOpen, AlertOctagon, ChevronLeft, ChevronRight, RefreshCw, 
  Tag, Clock, MoreVertical, ChevronDown, Bookmark, VolumeX, SlidersHorizontal, 
  ShieldCheck, Inbox, Users, Tag as TagIcon, Bell, Info, Undo2
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
  onToggleMute?: (threadId: string) => void;
  onBulkSpam?: (threadIds: string[], isSpam: boolean) => void;
  onCancelScheduled?: (threadIds: string[]) => void;
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
  onToggleMute,
  onBulkSpam,
  onCancelScheduled,
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
  const isScheduledFolder = folderName.toLowerCase().includes('scheduled');

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
      style={{ backgroundColor: 'var(--theme-bg-main, #F8FAFC)' }}
      className="flex flex-col h-full select-none min-w-0 font-sans relative"
    >
      {/* Gmail Action Toolbar */}
      <div 
        style={{
          backgroundColor: 'var(--theme-bg-header, #FFFFFF)',
          borderColor: 'var(--theme-border, #E2E8F0)',
        }}
        className="h-12 px-3 sm:px-4 border-b flex items-center justify-between gap-3 shrink-0 sticky top-0 z-10 select-none"
      >
        <div className="flex items-center gap-1 min-w-0">
          <div className="relative flex items-center shrink-0 mr-1" ref={selectMenuRef}>
            <div className="flex items-center rounded-lg p-0.5">
              <button 
                type="button"
                onClick={handleSelectAll} 
                className="p-1.5 rounded hover:opacity-80 transition-colors"
                title="Select all"
              >
                {isAllSelected ? (
                  <CheckSquare style={{ color: 'var(--theme-accent, #14B8A6)' }} className="w-4 h-4" />
                ) : isPartiallySelected ? (
                  <MinusSquare style={{ color: 'var(--theme-accent, #14B8A6)' }} className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4 opacity-40" />
                )}
              </button>
              <button 
                type="button"
                onClick={() => setIsSelectMenuOpen(!isSelectMenuOpen)} 
                className="p-1 rounded opacity-60 hover:opacity-100 transition-colors"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            
            {isSelectMenuOpen && (
              <div 
                style={{
                  backgroundColor: 'var(--theme-bg-card, #FFFFFF)',
                  borderColor: 'var(--theme-border, #E2E8F0)',
                }}
                className="absolute left-0 top-full mt-1 w-36 rounded-xl border shadow-xl py-1 z-30 animate-in fade-in zoom-in-95"
              >
                <button type="button" onClick={() => { handleSelectAll(); setIsSelectMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between">
                  <span>All</span>
                </button>
                <button type="button" onClick={() => { setSelectedIds(new Set(threads.filter(t => t.isUnread).map(t => t.id))); setIsSelectMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between">
                  <span>Unread</span>
                </button>
                <button type="button" onClick={() => { setSelectedIds(new Set(threads.filter(t => !t.isUnread).map(t => t.id))); setIsSelectMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between">
                  <span>Read</span>
                </button>
                <button type="button" onClick={() => { setSelectedIds(new Set(threads.filter(t => t.isStarred).map(t => t.id))); setIsSelectMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between">
                  <span>Starred</span>
                </button>
              </div>
            )}
          </div>

          {selectedIds.size > 0 ? (
            <div className="flex items-center gap-1 animate-in fade-in">
              {isScheduledFolder && (
                <button
                  type="button"
                  onClick={() => {
                    onCancelScheduled?.(Array.from(selectedIds));
                    setSelectedIds(new Set());
                  }}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors border shadow-xs"
                  style={{
                    backgroundColor: 'var(--theme-accent-bg, rgba(20, 184, 166, 0.1))',
                    borderColor: 'var(--theme-accent, #14B8A6)',
                    color: 'var(--theme-accent, #0F766E)',
                  }}
                  title="Cancel scheduled send and revert to drafts"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Cancel send</span>
                </button>
              )}
              {isArchiveFolder ? (
                <button 
                  type="button" 
                  onClick={() => handleBulkAction('unarchive')} 
                  className="p-2 rounded-full opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" 
                  title="Move to Inbox (Unarchive)"
                >
                  <Mail className="w-4 h-4" />
                </button>
              ) : !isScheduledFolder && (
                <button 
                  type="button" 
                  onClick={() => handleBulkAction('archive')} 
                  className="p-2 rounded-full opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" 
                  title="Archive"
                >
                  <Archive className="w-4 h-4" />
                </button>
              )}
              {!isScheduledFolder && (
                <button type="button" onClick={() => onBulkSpam?.(Array.from(selectedIds), true)} className="p-2 rounded-full opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Report spam">
                  <AlertOctagon className="w-4 h-4" />
                </button>
              )}
              <button type="button" onClick={() => handleBulkAction('delete')} className="p-2 rounded-full opacity-60 hover:text-rose-500 hover:bg-rose-500/10 transition-colors" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => handleBulkAction('read')} className="p-2 rounded-full opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Mark as read">
                <MailOpen className="w-4 h-4" />
              </button>
              {!isScheduledFolder && (
                <button type="button" onClick={() => onSnooze?.(Array.from(selectedIds))} className="p-2 rounded-full opacity-60 hover:text-amber-500 hover:bg-amber-500/10 transition-colors" title="Snooze">
                  <Clock className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button type="button" onClick={onRefresh} className="p-2 rounded-full opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs opacity-60 font-normal tracking-wider hidden sm:inline-block">
            {startIdx}–{endIdx} <span className="opacity-50">of</span> {totalCount}
          </span>
          <div className="flex items-center">
            <button type="button" onClick={() => onPageChange?.(currentPage - 1)} disabled={currentPage <= 1} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 opacity-60 hover:opacity-100 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => onPageChange?.(currentPage + 1)} disabled={endIdx >= totalCount} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 opacity-60 hover:opacity-100 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Gmail-style Tabs (Inbox only) */}
      {folderName.toLowerCase() === 'inbox' && (
        <div 
          style={{
            backgroundColor: 'var(--theme-bg-header, #FFFFFF)',
            borderColor: 'var(--theme-border, #E2E8F0)',
          }}
          className="flex items-center px-2 border-b overflow-x-auto custom-scrollbar no-scrollbar relative shrink-0"
        >
          {CATEGORIES.map(cat => {
            const isCatActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                style={isCatActive ? {
                  color: 'var(--theme-accent, #0F766E)',
                  backgroundColor: 'var(--theme-accent-bg, rgba(20, 184, 166, 0.1))',
                } : undefined}
                className={`flex items-center gap-2.5 px-6 py-3 text-xs font-semibold transition-all relative whitespace-nowrap ${
                  isCatActive 
                    ? '' 
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <cat.icon className="w-4 h-4" style={{ color: isCatActive ? 'var(--theme-accent, #0F766E)' : undefined }} />
                <span>{cat.label}</span>
                {cat.badge && (
                  <span 
                    style={{
                      backgroundColor: 'var(--theme-accent-bg, #CCFBF1)',
                      color: 'var(--theme-accent, #0F766E)',
                    }}
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  >
                    {cat.badge}
                  </span>
                )}
                {isCatActive && (
                  <div 
                    style={{ backgroundColor: 'var(--theme-accent, #14B8A6)' }}
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
        style={{ backgroundColor: 'var(--theme-bg-main, #F8FAFC)' }}
        className="flex-1 overflow-y-auto custom-scrollbar"
      >
        {threads.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
            <div 
              style={{
                backgroundColor: 'var(--theme-accent-bg, #F0FDFA)',
                borderColor: 'var(--theme-accent, #CCFBF1)',
                color: 'var(--theme-accent, #0F766E)',
              }}
              className="w-16 h-16 rounded-3xl border flex items-center justify-center mb-4 shadow-sm"
            >
              <Mail className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-lg font-bold mb-1 tracking-tight">Your inbox is empty</p>
            <p className="text-sm opacity-60 max-w-xs">Messages you receive will appear here.</p>
          </div>
        ) : (
          <div 
            style={{ borderColor: 'var(--theme-border, #E2E8F0)' }}
            className="divide-y border-b"
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
                    contentVisibility: 'auto',
                    containIntrinsicSize: '0 44px',
                    backgroundColor: isSelected 
                      ? 'var(--theme-accent-bg, #F0FDFA)' 
                      : isChecked 
                      ? 'var(--theme-bg-hover, #F1F5F9)' 
                      : unread 
                      ? 'var(--theme-bg-card, #FFFFFF)' 
                      : 'var(--theme-bg-main, #FCFDFE)',
                    borderTopColor: 'var(--theme-border, #E2E8F0)',
                    borderRightColor: 'var(--theme-border, #E2E8F0)',
                    borderBottomColor: 'var(--theme-border, #E2E8F0)',
                    borderLeftColor: isSelected ? 'var(--theme-accent, #14B8A6)' : 'transparent',
                  }}
                  className="group relative flex items-center min-h-[44px] py-2.5 px-3 sm:px-4 transition-all cursor-pointer border-l-[3px] hover:opacity-95"
                >
                  {/* Left Controls: Checkbox, Star, Importance Chevron */}
                  <div className="flex items-center gap-2 mr-3 shrink-0">
                    <button 
                      type="button"
                      onClick={(e) => handleToggleSelectOne(thread.id, e)} 
                      className="opacity-50 hover:opacity-100 transition-colors"
                    >
                      {isChecked ? (
                        <CheckSquare style={{ color: 'var(--theme-accent, #14B8A6)' }} className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4 opacity-40 group-hover:opacity-80" />
                      )}
                    </button>

                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onToggleStar?.(thread.id); }} 
                      className={`transition-colors ${thread.isStarred ? 'text-amber-400' : 'opacity-40 hover:text-amber-400 group-hover:opacity-80'}`}
                    >
                      <Star className={`w-4 h-4 ${thread.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    {/* Importance Chevron */}
                    <span 
                      onClick={(e) => e.stopPropagation()} 
                      className="text-amber-500/80 hover:text-amber-600 font-bold text-sm select-none cursor-pointer leading-none px-0.5"
                    >
                      ›
                    </span>
                  </div>

                  {/* Sender Column */}
                  <div className={`w-36 sm:w-48 shrink-0 truncate mr-3 text-xs ${unread ? 'font-bold' : 'font-medium opacity-80'}`}>
                    <span>{thread.sender.name || thread.sender.email}</span>
                    {thread.messageCount && thread.messageCount > 1 && (
                      <span className="text-[10px] opacity-60 ml-1.5 font-mono">
                        {thread.messageCount}
                      </span>
                    )}
                  </div>

                  {/* Subject & Snippet (Gmail Single Line Format) */}
                  <div className="flex-1 min-w-0 flex items-center gap-1.5 text-xs pr-4">
                    {thread.labels && thread.labels.map(lbl => (
                      <span 
                        key={lbl} 
                        style={{
                          backgroundColor: 'var(--theme-accent-bg, #F0FDFA)',
                          borderColor: 'var(--theme-border, #CCFBF1)',
                          color: 'var(--theme-accent, #0F766E)',
                        }}
                        className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap border"
                      >
                        {lbl}
                      </span>
                    ))}
                    {thread.isMuted && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-[10px] text-slate-600 dark:text-slate-300 font-semibold" title="Conversation muted">
                        <VolumeX className="w-3 h-3" />
                        <span>Muted</span>
                      </span>
                    )}
                    <span className={`truncate ${unread ? 'font-bold' : 'font-medium opacity-90'}`}>
                      {thread.subject || '(No Subject)'}
                    </span>
                    <span className="opacity-40 shrink-0">-</span>
                    <span className="truncate opacity-60 font-normal">
                      {thread.snippet}
                    </span>
                  </div>

                  {/* Right Meta & Floating Hover Actions */}
                  <div className="flex items-center justify-end shrink-0 w-28 relative select-none">
                    {/* Default Timestamp / Paperclip */}
                    <div className="flex items-center gap-1.5 transition-opacity duration-150 group-hover:opacity-0">
                      {thread.isMuted && <VolumeX className="w-3.5 h-3.5 opacity-50 text-slate-500" />}
                      {thread.hasAttachments && <Paperclip className="w-3.5 h-3.5 text-[#94A3B8]" />}
                      <span className={`text-[11px] font-medium ${unread ? 'font-bold text-[#0F172A]' : 'text-[#64748B]'}`}>
                        {thread.lastMessageAt}
                      </span>
                    </div>
                    
                    {/* Hover Actions Bar */}
                    <div 
                      style={{
                        backgroundColor: 'var(--theme-bg-card, #FFFFFF)',
                        borderColor: 'var(--theme-border, #E2E8F0)',
                      }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-0.5 p-1 rounded-full border shadow-md opacity-0 group-hover:opacity-100 transition-all duration-150 z-10"
                    >
                      {isScheduledFolder && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onCancelScheduled?.([thread.id]); }}
                          className="p-1.5 rounded-full text-teal-600 hover:text-teal-700 hover:bg-teal-500/15 transition-colors"
                          title="Cancel send (revert to draft)"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isArchiveFolder ? (
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onBulkUnarchive?.([thread.id]); }} 
                          className="p-1.5 rounded-full opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors" 
                          title="Move to Inbox (Unarchive)"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                      ) : !isScheduledFolder && (
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onBulkArchive?.([thread.id]); }} 
                          className="p-1.5 rounded-full text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors" 
                          title="Archive"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onBulkDelete?.([thread.id]); }} 
                        className="p-1.5 rounded-full opacity-70 hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 transition-colors" 
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onBulkMarkRead?.([thread.id], !thread.isUnread); }} 
                        className="p-1.5 rounded-full opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors" 
                        title={thread.isUnread ? 'Mark Read' : 'Mark Unread'}
                      >
                        {thread.isUnread ? <MailOpen className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onSnooze?.([thread.id]); }} 
                        className="p-1.5 rounded-full opacity-70 hover:opacity-100 hover:text-amber-500 hover:bg-amber-500/10 transition-colors" 
                        title="Snooze"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleMute?.(thread.id); }} 
                        className={`p-1.5 rounded-full transition-colors ${thread.isMuted ? 'text-indigo-500 bg-indigo-500/15' : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10'}`} 
                        title={thread.isMuted ? 'Unmute conversation' : 'Mute conversation'}
                      >
                        <VolumeX className="w-3.5 h-3.5" />
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
