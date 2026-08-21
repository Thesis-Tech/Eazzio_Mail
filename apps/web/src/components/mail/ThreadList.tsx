'use client';

import React, { useState } from 'react';
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
  Sparkles,
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
  onRefresh?: () => void;
  folderName?: string;
  totalThreadsCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (newPage: number) => void;
}

export const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  selectedThreadId,
  onSelectThread,
  onToggleStar,
  onBulkDelete,
  onBulkArchive,
  onBulkMarkRead,
  onRefresh,
  folderName = 'Inbox',
  totalThreadsCount = 0,
  currentPage = 1,
  pageSize = 25,
  onPageChange,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isAllSelected = threads.length > 0 && selectedIds.size === threads.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < threads.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(threads.map((t) => t.id)));
    }
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
  const startIdx = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIdx = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex flex-col h-full bg-[#0F1115] border-r border-[#2A2E37] select-none" data-testid="thread-list">
      {/* Top Action & Bulk Toolbar */}
      <div className="h-14 px-4 border-b border-[#2A2E37] flex items-center justify-between gap-3 shrink-0 bg-[#16181D]">
        <div className="flex items-center gap-2">
          {/* Select All Checkbox */}
          <button
            onClick={handleSelectAll}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1C1F26] transition-colors"
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

          {/* Bulk Action Buttons (visible when items are selected) */}
          {selectedIds.size > 0 ? (
            <div className="flex items-center gap-1 animate-in fade-in" data-testid="bulk-actions-toolbar">
              <span className="text-xs font-semibold text-slate-300 px-1.5">
                {selectedIds.size} selected
              </span>
              <button
                onClick={() => handleBulkAction('read')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1C1F26] transition-colors"
                title="Mark as read"
                data-testid="bulk-read-btn"
              >
                <MailOpen className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleBulkAction('unread')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1C1F26] transition-colors"
                title="Mark as unread"
                data-testid="bulk-unread-btn"
              >
                <Mail className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1C1F26] transition-colors"
                title="Archive"
                data-testid="bulk-archive-btn"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                title="Delete"
                data-testid="bulk-delete-btn"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white tracking-tight capitalize">
                {folderName}
              </h2>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1C1F26] transition-colors"
                  title="Refresh"
                  data-testid="refresh-threads-btn"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>
            {startIdx}-{endIdx} of {totalCount}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 rounded-lg hover:bg-[#1C1F26] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous Page"
              data-testid="prev-page-btn"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              disabled={endIdx >= totalCount}
              className="p-1 rounded-lg hover:bg-[#1C1F26] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next Page"
              data-testid="next-page-btn"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Threads Scrollable List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#2A2E37]/60 custom-scrollbar">
        {threads.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center" data-testid="empty-threads-view">
            <div className="w-12 h-12 rounded-2xl bg-[#16181D] border border-[#2A2E37] flex items-center justify-center text-slate-500 mb-3">
              <Mail className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No conversations in {folderName}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Your inbox is clean and up to date.
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
                className={`group px-4 py-3 cursor-pointer transition-all flex items-start gap-3 relative ${
                  isSelected
                    ? 'bg-[#2D5BFF]/10 border-l-2 border-l-[#2D5BFF]'
                    : thread.isUnread
                    ? 'bg-[#16181D]/80 hover:bg-[#1C1F26]'
                    : 'bg-[#0F1115] hover:bg-[#16181D]'
                }`}
                data-testid={`thread-item-${thread.id}`}
              >
                {/* Checkbox and Star */}
                <div className="flex items-center gap-1.5 pt-0.5 shrink-0">
                  <button
                    onClick={(e) => handleToggleSelectOne(thread.id, e)}
                    className="p-1 rounded text-slate-500 hover:text-slate-200 transition-colors"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-[#2D5BFF]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleStar) onToggleStar(thread.id);
                    }}
                    className={`p-1 rounded transition-colors ${
                      thread.isStarred
                        ? 'text-amber-400'
                        : 'text-slate-600 hover:text-slate-400 group-hover:opacity-100 opacity-40 sm:opacity-100'
                    }`}
                    data-testid={`star-btn-${thread.id}`}
                  >
                    <Star className={`w-4 h-4 ${thread.isStarred ? 'fill-amber-400' : ''}`} />
                  </button>
                </div>

                {/* Main Thread Content */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`text-sm truncate ${
                          thread.isUnread ? 'font-bold text-white' : 'font-medium text-slate-300'
                        }`}
                      >
                        {thread.sender.name || thread.sender.email}
                      </span>
                      {thread.messageCount > 1 && (
                        <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-[#2A2E37] text-slate-400 font-semibold">
                          {thread.messageCount}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{thread.lastMessageAt}</span>
                  </div>

                  <p
                    className={`text-xs truncate ${
                      thread.isUnread ? 'font-semibold text-slate-200' : 'text-slate-400'
                    }`}
                  >
                    {thread.subject || '(No Subject)'}
                  </p>

                  <p className="text-xs text-slate-500 truncate">{thread.snippet}</p>

                  {/* Labels and Attachment Indicators */}
                  <div className="flex items-center gap-2 pt-1">
                    {thread.hasAttachments && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-[#1C1F26] border border-[#2A2E37] px-1.5 py-0.5 rounded">
                        <Paperclip className="w-3 h-3 text-slate-400" />
                        Attachment
                      </span>
                    )}

                    {thread.labels &&
                      thread.labels.map((label) => (
                        <span
                          key={label}
                          className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#2D5BFF]/15 text-[#2D5BFF]"
                        >
                          {label}
                        </span>
                      ))}
                  </div>
                </div>

                {/* Unread indicator dot */}
                {thread.isUnread && (
                  <span className="w-2 h-2 rounded-full bg-[#2D5BFF] shrink-0 mt-1.5" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
