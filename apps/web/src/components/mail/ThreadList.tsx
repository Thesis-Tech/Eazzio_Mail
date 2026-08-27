'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Star,
  Paperclip,
  CheckSquare,
  Square,
  MinusSquare,
  Trash2,
  Archive,
  Mail,
  MailOpen,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Tag,
  Clock,
  MoreVertical,
  ChevronDown,
  Bookmark,
  VolumeX,
  SlidersHorizontal,
} from 'lucide-react';
import { ThreadSummary } from '../../types/mail';

export interface ThreadListProps {
  threads: ThreadSummary[];
  selectedThreadId?: string | null;
  onSelectThread: (threadId: string) => void;
  onToggleStar?: (threadId: string) => void;
  onBulkDelete?: (threadIds: string[]) => void;
  onBulkArchive?: (threadIds: string[]) => void;
  onBulkMarkRead?: (threadIds: string[], isRead: boolean) => void;
  onSnooze?: (threadIds: string[]) => void;
  onRefresh?: () => void;
  folderName?: string;
  totalThreadsCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (newPage: number) => void;
  isSplitView?: boolean;
}

export const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  selectedThreadId,
  onSelectThread,
  onToggleStar,
  onBulkDelete,
  onBulkArchive,
  onBulkMarkRead,
  onSnooze,
  onRefresh,
  folderName = 'Inbox',
  totalThreadsCount = 0,
  currentPage = 1,
  pageSize = 50,
  onPageChange,
  isSplitView = true,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMenuOpen, setIsSelectMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const selectMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectMenuRef.current && !selectMenuRef.current.contains(e.target as Node)) {
        setIsSelectMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAllSelected = threads.length > 0 && selectedIds.size === threads.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < threads.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(threads.map((t) => t.id)));
    }
  };

  const handleSelectFilter = (type: 'all' | 'none' | 'read' | 'unread' | 'starred' | 'unstarred') => {
    setIsSelectMenuOpen(false);
    if (type === 'all') setSelectedIds(new Set(threads.map((t) => t.id)));
    if (type === 'none') setSelectedIds(new Set());
    if (type === 'read') setSelectedIds(new Set(threads.filter((t) => !t.isUnread).map((t) => t.id)));
    if (type === 'unread') setSelectedIds(new Set(threads.filter((t) => t.isUnread).map((t) => t.id)));
    if (type === 'starred') setSelectedIds(new Set(threads.filter((t) => t.isStarred).map((t) => t.id)));
    if (type === 'unstarred') setSelectedIds(new Set(threads.filter((t) => !t.isStarred).map((t) => t.id)));
  };

  const handleToggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkAction = (action: 'read' | 'unread' | 'delete' | 'archive') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (action === 'delete' && onBulkDelete) onBulkDelete(ids);
    if (action === 'archive' && onBulkArchive) onBulkArchive(ids);
    if (action === 'read' && onBulkMarkRead) onBulkMarkRead(ids, true);
    if (action === 'unread' && onBulkMarkRead) onBulkMarkRead(ids, false);

    setSelectedIds(new Set());
  };

  const totalCount = totalThreadsCount || threads.length;
  const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex flex-col h-full bg-[#111317] select-none min-w-0" data-testid="thread-list">
      {/* Top Action & Bulk Toolbar */}
      <div className="h-12 px-3 border-b border-[#22262E] flex items-center justify-between gap-2 shrink-0 bg-[#16181D]">
        <div className="flex items-center gap-1 min-w-0">
          {/* Select All Checkbox + Dropdown Arrow */}
          <div className="relative flex items-center shrink-0" ref={selectMenuRef}>
            <button
              onClick={handleSelectAll}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#22262E] transition-colors"
              title={isAllSelected ? 'Deselect all' : 'Select all'}
              data-testid="select-all-button"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-[#2D5BFF]" />
              ) : isPartiallySelected ? (
                <MinusSquare className="w-4 h-4 text-[#2D5BFF]" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setIsSelectMenuOpen(!isSelectMenuOpen)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#22262E] transition-colors"
            >
              <ChevronDown className="w-3 h-3" />
            </button>

            {isSelectMenuOpen && (
              <div className="absolute left-0 top-8 w-36 rounded-lg bg-[#16181D] border border-[#2A2E37] shadow-2xl py-1 z-50 animate-in fade-in">
                {(['all', 'none', 'read', 'unread', 'starred', 'unstarred'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleSelectFilter(mode)}
                    className="w-full px-3 py-1.5 text-left text-xs capitalize text-slate-300 hover:bg-[#22262E] hover:text-white transition-colors"
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#22262E] transition-colors shrink-0"
              title="Refresh"
              data-testid="refresh-threads-btn"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Bulk Action Buttons (visible when items selected) */}
          {selectedIds.size > 0 ? (
            <div className="flex items-center gap-0.5 animate-in fade-in pl-1 border-l border-[#22262E] shrink-0">
              <button
                onClick={() => handleBulkAction('archive')}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#22262E] transition-colors"
                title="Archive"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-[#22262E] transition-colors"
                title="Report spam / Delete"
              >
                <AlertOctagon className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-[#22262E] transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleBulkAction('read')}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#22262E] transition-colors"
                title="Mark as read"
              >
                <MailOpen className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleBulkAction('unread')}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#22262E] transition-colors"
                title="Mark as unread"
              >
                <Mail className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (onSnooze) onSnooze(Array.from(selectedIds));
                }}
                className="p-1.5 rounded text-slate-400 hover:text-orange-400 hover:bg-[#22262E] transition-colors"
                title="Snooze selected"
              >
                <Clock className="w-4 h-4" />
              </button>
            </div>
          ) : null}

          {/* More Options Dropdown Menu */}
          <div className="relative shrink-0" ref={moreMenuRef}>
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#22262E] transition-colors"
              title="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute left-0 top-8 w-52 rounded-xl bg-[#181B22] border border-[#2E3440] shadow-2xl py-1.5 z-50 animate-in fade-in divide-y divide-[#22262E]">
                <div className="py-1">
                  <button
                    onClick={() => {
                      handleBulkAction('unread');
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-1.5 text-left text-xs text-slate-300 hover:bg-[#22262E] hover:text-white flex items-center gap-2.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mark as unread</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      if (onSnooze) onSnooze(selectedIds.size > 0 ? Array.from(selectedIds) : selectedThreadId ? [selectedThreadId] : []);
                    }}
                    className="w-full px-3.5 py-1.5 text-left text-xs text-slate-300 hover:bg-[#22262E] hover:text-white flex items-center gap-2.5"
                  >
                    <Clock className="w-3.5 h-3.5 text-orange-400" />
                    <span>Snooze</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="w-full px-3.5 py-1.5 text-left text-xs text-slate-300 hover:bg-[#22262E] hover:text-white flex items-center gap-2.5"
                  >
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>Label as</span>
                  </button>
                  <button
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="w-full px-3.5 py-1.5 text-left text-xs text-slate-300 hover:bg-[#22262E] hover:text-white flex items-center gap-2.5"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span>Add star</span>
                  </button>
                  <button
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="w-full px-3.5 py-1.5 text-left text-xs text-slate-300 hover:bg-[#22262E] hover:text-white flex items-center gap-2.5"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mark as important</span>
                  </button>
                  <button
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="w-full px-3.5 py-1.5 text-left text-xs text-slate-300 hover:bg-[#22262E] hover:text-white flex items-center gap-2.5"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    <span>Forward as attachment</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="w-full px-3.5 py-1.5 text-left text-xs text-slate-300 hover:bg-[#22262E] hover:text-white flex items-center gap-2.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    <span>Filter messages like these</span>
                  </button>
                  <button
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="w-full px-3.5 py-1.5 text-left text-xs text-slate-300 hover:bg-[#22262E] hover:text-white flex items-center gap-2.5"
                  >
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mute</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
          <span className="font-mono text-[11px]">
            {startIdx}–{endIdx} of {totalCount}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-[#22262E] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              disabled={endIdx >= totalCount}
              className="p-1 rounded hover:bg-[#22262E] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Selected Items Notice Bar */}
      {selectedIds.size > 0 && (
        <div className="px-3 py-1.5 bg-[#1C2028] border-b border-[#22262E] text-xs text-slate-300 flex items-center justify-between animate-in fade-in">
          <span>{selectedIds.size} selected</span>
          <button
            onClick={() => setSelectedIds(new Set(threads.map((t) => t.id)))}
            className="text-[#2D5BFF] hover:underline font-semibold text-[11px]"
          >
            Select all {totalCount} in {folderName}
          </button>
        </div>
      )}

      {/* Threads Scrollable List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#22262E]/60 custom-scrollbar">
        {threads.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center" data-testid="empty-threads-view">
            <div className="w-12 h-12 rounded-2xl bg-[#16181D] border border-[#22262E] flex items-center justify-center text-slate-500 mb-3">
              <Mail className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No conversations in {folderName}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Your mailbox is clean and up to date.
            </p>
          </div>
        ) : (
          threads.map((thread) => {
            const isSelected = selectedThreadId === thread.id;
            const isChecked = selectedIds.has(thread.id);

            return (
              <div
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                className={`group flex flex-col justify-center gap-1 px-3.5 py-2.5 text-xs transition-colors cursor-pointer border-l-4 ${
                  isSelected
                    ? 'bg-[#1C2230] border-[#2D5BFF]'
                    : isChecked
                    ? 'bg-[#1A1E26] border-transparent'
                    : thread.isUnread
                    ? 'bg-[#14161C] border-transparent hover:bg-[#1A1D24]'
                    : 'bg-[#111317] border-transparent hover:bg-[#16181E]'
                }`}
                data-testid={`thread-row-${thread.id}`}
              >
                {/* Row 1: Checkbox, Star, Sender Name, Badges, Date */}
                <div className="flex items-center gap-2 w-full min-w-0">
                  {/* Checkbox */}
                  <button
                    onClick={(e) => handleToggleSelectOne(thread.id, e)}
                    className="text-slate-500 hover:text-slate-200 transition-colors shrink-0"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-[#2D5BFF]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  {/* Star Icon */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleStar) onToggleStar(thread.id);
                    }}
                    className={`shrink-0 transition-colors ${
                      thread.isStarred ? 'text-amber-400 fill-amber-400' : 'text-slate-600 hover:text-slate-300'
                    }`}
                    title={thread.isStarred ? 'Starred' : 'Not starred'}
                  >
                    <Star className={`w-4 h-4 ${thread.isStarred ? 'fill-amber-400' : ''}`} />
                  </button>

                  {/* Sender Name */}
                  <div className="flex-1 min-w-0 truncate">
                    <span className={`truncate ${thread.isUnread ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>
                      {thread.sender.name || thread.sender.email}
                    </span>
                    {thread.messageCount && thread.messageCount > 1 && (
                      <span className="text-[10px] text-slate-500 ml-1 font-mono">
                        ({thread.messageCount})
                      </span>
                    )}
                  </div>

                  {/* Attachment indicator & Date */}
                  <div className="flex items-center gap-1.5 shrink-0 text-right">
                    {thread.hasAttachments && (
                      <Paperclip className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <span className={`text-[11px] font-mono shrink-0 ${thread.isUnread ? 'font-bold text-white' : 'text-slate-400'}`}>
                      {thread.lastMessageAt}
                    </span>
                  </div>
                </div>

                {/* Row 2: Subject & Snippet Preview */}
                <div className="flex items-baseline gap-1.5 min-w-0 pl-6 text-xs">
                  <span className={`truncate shrink-0 max-w-[65%] ${thread.isUnread ? 'font-semibold text-slate-100' : 'text-slate-300 font-normal'}`}>
                    {thread.subject || '(No Subject)'}
                  </span>
                  <span className="text-slate-600 shrink-0">—</span>
                  <span className="text-slate-400 truncate font-normal">
                    {thread.snippet}
                  </span>
                </div>

                {/* Row 3: Label Badges if present */}
                {thread.labels && thread.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5 pl-6">
                    {thread.labels.map((lbl) => (
                      <span
                        key={lbl}
                        className="text-[10px] px-1.5 py-0.2 rounded bg-[#1A202C] text-slate-300 border border-[#2D3748]"
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
