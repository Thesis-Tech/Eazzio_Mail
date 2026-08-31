'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Star, Paperclip, CheckSquare, Square, MinusSquare, Trash2, Archive, 
  Mail, MailOpen, AlertOctagon, ChevronLeft, ChevronRight, RefreshCw, 
  Tag, Clock, MoreVertical, ChevronDown, Bookmark, VolumeX, SlidersHorizontal, 
  ShieldCheck, Inbox, Users, Tag as TagIcon, Bell
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
  onBulkSpam?: (threadIds: string[], isSpam: boolean) => void;
  onEmptyFolder?: (folderSlug: string) => void;
  onRefresh?: () => void;
  folderName?: string;
  totalThreadsCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (newPage: number) => void;
  isSplitView?: boolean;
}

const CATEGORIES = [
  { id: 'primary', label: 'Primary', icon: Inbox, color: '#2D5BFF' },
  { id: 'promotions', label: 'Promotions', icon: TagIcon, color: '#10B981' },
  { id: 'social', label: 'Social', icon: Users, color: '#8B5CF6' },
  { id: 'updates', label: 'Updates', icon: Bell, color: '#F59E0B' },
];

export const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  selectedThreadId,
  onSelectThread,
  onToggleStar,
  onBulkDelete,
  onBulkArchive,
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
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMenuOpen, setIsSelectMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('primary');
  const selectMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-col h-full bg-[#0A0C10] select-none min-w-0 font-sans relative">
      {/* Superhuman Toolbar */}
      <div className="h-14 px-3 sm:px-4 border-b border-[#1E232B] flex items-center justify-between gap-3 shrink-0 bg-[#0A0C10]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-1 min-w-0">
          <div className="relative flex items-center shrink-0 mr-2" ref={selectMenuRef}>
            <div className="flex items-center bg-[#12141A] rounded-lg border border-[#1E232B] p-0.5">
              <button onClick={handleSelectAll} className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#1E232B] transition-colors">
                {isAllSelected ? <CheckSquare className="w-4 h-4 text-[#2D5BFF]" /> : isPartiallySelected ? <MinusSquare className="w-4 h-4 text-[#2D5BFF]" /> : <Square className="w-4 h-4" />}
              </button>
              <div className="w-[1px] h-4 bg-[#1E232B] mx-0.5"></div>
              <button onClick={() => setIsSelectMenuOpen(!isSelectMenuOpen)} className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#1E232B] transition-colors">
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            
            {isSelectMenuOpen && (
              <div className="absolute left-0 top-10 w-36 rounded-xl bg-[#12141A] border border-[#1E232B] shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
                {['all', 'none', 'read', 'unread', 'starred', 'unstarred'].map((mode) => (
                  <button key={mode} className="w-full px-3 py-1.5 text-left text-xs capitalize text-slate-300 hover:bg-[#1E232B] hover:text-white transition-colors">{mode}</button>
                ))}
              </div>
            )}
          </div>

          {onRefresh && (
            <button onClick={onRefresh} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#12141A] border border-transparent hover:border-[#1E232B] transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Bulk Actions with Animation */}
          <div className={`flex items-center gap-1 overflow-hidden transition-all duration-300 ${selectedIds.size > 0 ? 'opacity-100 max-w-[400px] ml-2 pl-2 border-l border-[#1E232B]' : 'opacity-0 max-w-0'}`}>
            <button onClick={() => handleBulkAction('archive')} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#12141A] border border-transparent hover:border-[#1E232B] transition-all tooltip" title="Archive">
              <Archive className="w-4 h-4" />
            </button>
            <button onClick={() => handleBulkAction('delete')} className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all tooltip" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleBulkAction('read')} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#12141A] border border-transparent hover:border-[#1E232B] transition-all tooltip" title="Mark as Read">
              <MailOpen className="w-4 h-4" />
            </button>
            <button onClick={() => { if(onSnooze) onSnooze(Array.from(selectedIds)); }} className="p-2 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 border border-transparent hover:border-orange-500/20 transition-all tooltip" title="Snooze">
              <Clock className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono tracking-wider hidden sm:inline-block">
            {startIdx}–{endIdx} <span className="text-slate-600">of</span> {totalCount}
          </span>
          <div className="flex items-center bg-[#12141A] rounded-lg border border-[#1E232B] p-0.5">
            <button onClick={() => onPageChange?.(currentPage - 1)} disabled={currentPage <= 1} className="p-1.5 rounded-md hover:bg-[#1E232B] text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-[#1E232B] mx-0.5"></div>
            <button onClick={() => onPageChange?.(currentPage + 1)} disabled={endIdx >= totalCount} className="p-1.5 rounded-md hover:bg-[#1E232B] text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Gmail-style Tabs (Inbox only) */}
      {folderName.toLowerCase() === 'inbox' && (
        <div className="flex items-center px-4 bg-[#0A0C10] border-b border-[#1E232B] overflow-x-auto custom-scrollbar no-scrollbar relative shrink-0">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all relative whitespace-nowrap ${
                activeCategory === cat.id ? 'text-[#2D5BFF]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'
              }`}
            >
              <cat.icon className={`w-4 h-4 ${activeCategory === cat.id ? '' : 'opacity-60'}`} style={{ color: activeCategory === cat.id ? cat.color : undefined }} />
              {cat.label}
              {activeCategory === cat.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-[#2D5BFF]" style={{ backgroundColor: cat.color }}></div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0A0C10]">
        {threads.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#1E232B] to-[#12141A] border border-[#2A313C] flex items-center justify-center text-slate-500 mb-4 shadow-xl">
              <Mail className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-lg font-bold text-white mb-1 tracking-tight">You're all caught up!</p>
            <p className="text-sm text-slate-500 max-w-xs">Zero Inbox achieved. Time to relax or tackle your to-do list.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1E232B]/50">
            {threads.map((thread) => {
              const isSelected = selectedThreadId === thread.id;
              const isChecked = selectedIds.has(thread.id);
              const unread = thread.isUnread;

              return (
                <div
                  key={thread.id}
                  onClick={() => onSelectThread(thread.id)}
                  className={`group relative flex items-center px-2 sm:px-4 py-2 sm:py-2.5 transition-all cursor-pointer border-l-[3px]
                    ${isSelected ? 'bg-[#2D5BFF]/10 border-[#2D5BFF]' : 
                      isChecked ? 'bg-[#1E232B]/50 border-transparent' : 
                      unread ? 'bg-[#12141A] border-transparent hover:bg-[#1E232B]/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]' : 
                      'bg-[#0A0C10] border-transparent hover:bg-[#12141A]'
                    }
                  `}
                >
                  {/* Left Controls */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 mr-3">
                    <button onClick={(e) => handleToggleSelectOne(thread.id, e)} className="text-slate-500 hover:text-white transition-colors">
                      {isChecked ? <CheckSquare className="w-4.5 h-4.5 text-[#2D5BFF]" /> : <Square className="w-4.5 h-4.5 opacity-40 group-hover:opacity-100" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onToggleStar?.(thread.id); }} className={`transition-colors ${thread.isStarred ? 'text-amber-400' : 'text-slate-600 hover:text-slate-300 opacity-40 group-hover:opacity-100'}`}>
                      <Star className={`w-4.5 h-4.5 ${thread.isStarred ? 'fill-amber-400' : ''}`} />
                    </button>
                  </div>

                  {/* Sender */}
                  <div className={`w-32 sm:w-48 shrink-0 truncate mr-3 ${unread ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>
                    {thread.sender.name || thread.sender.email}
                    {thread.messageCount && thread.messageCount > 1 && (
                      <span className="text-[10px] text-slate-500 ml-1 font-mono bg-[#1E232B] px-1.5 py-0.5 rounded-full">{thread.messageCount}</span>
                    )}
                  </div>

                  {/* Subject & Snippet */}
                  <div className="flex-1 min-w-0 flex items-center gap-2 text-sm pr-4">
                    {thread.labels && thread.labels.map(lbl => (
                      <span key={lbl} className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-medium whitespace-nowrap border border-slate-700">{lbl}</span>
                    ))}
                    <span className={`truncate max-w-[200px] sm:max-w-md ${unread ? 'font-bold text-white' : 'font-semibold text-slate-200'}`}>
                      {thread.subject || '(No Subject)'}
                    </span>
                    <span className="hidden sm:inline text-slate-600 shrink-0">-</span>
                    <span className="truncate text-slate-400 font-normal">
                      {thread.snippet}
                    </span>
                  </div>

                  {/* Meta / Hover Actions */}
                  <div className="flex items-center justify-end shrink-0 w-24 relative">
                    <div className="flex items-center gap-2 transition-opacity duration-200 group-hover:opacity-0">
                      {thread.hasAttachments && <Paperclip className="w-3.5 h-3.5 text-slate-500" />}
                      <span className={`text-[11px] font-mono ${unread ? 'font-bold text-white' : 'text-slate-400'}`}>
                        {thread.lastMessageAt}
                      </span>
                    </div>
                    
                    {/* Hover Actions Bar */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-[#1E232B] p-1 rounded-lg border border-slate-700/50 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                      <button onClick={(e) => { e.stopPropagation(); onBulkArchive?.([thread.id]); }} className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Archive">
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onBulkDelete?.([thread.id]); }} className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onBulkMarkRead?.([thread.id], !thread.isUnread); }} className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title={thread.isUnread ? 'Mark Read' : 'Mark Unread'}>
                        {thread.isUnread ? <MailOpen className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onSnooze?.([thread.id]); }} className="p-1.5 rounded-md text-slate-400 hover:text-orange-400 hover:bg-orange-500/20 transition-colors" title="Snooze">
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
