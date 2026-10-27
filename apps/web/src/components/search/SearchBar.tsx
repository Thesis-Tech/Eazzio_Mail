'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Clock,
  Tag,
  Paperclip,
  User,
  FileText,
  Star,
  Mail,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { ThreadSummary } from '../../types/mail';

export interface SearchBarProps {
  onSearch: (query: string) => void;
  onSelectSuggestion?: (suggestion: string) => void;
  availableThreads?: ThreadSummary[];
  placeholder?: string;
}

export const filterSyntaxHelpers = [
  { label: 'from:', desc: 'Search by sender (e.g. from:security@eazzio.com)', icon: User },
  { label: 'subject:', desc: 'Search in subject line (e.g. subject:audit)', icon: FileText },
  { label: 'has:attachment', desc: 'Emails with attached files', icon: Paperclip },
  { label: 'is:unread', desc: 'Unread emails only', icon: Mail },
  { label: 'is:starred', desc: 'Starred emails only', icon: Star },
  { label: 'label:', desc: 'Search by tag (e.g. label:Security)', icon: Tag },
];

export const parseSearchQuery = (query: string) => {
  const filters: {
    from?: string;
    subject?: string;
    hasAttachment?: boolean;
    isUnread?: boolean;
    isStarred?: boolean;
    label?: string;
    textTerms: string[];
  } = {
    textTerms: [],
  };

  const tokens = query.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (token.startsWith('from:')) {
      filters.from = token.slice(5).toLowerCase();
    } else if (token.startsWith('subject:')) {
      filters.subject = token.slice(8).toLowerCase();
    } else if (token === 'has:attachment') {
      filters.hasAttachment = true;
    } else if (token === 'is:unread') {
      filters.isUnread = true;
    } else if (token === 'is:starred') {
      filters.isStarred = true;
    } else if (token.startsWith('label:')) {
      filters.label = token.slice(6).toLowerCase();
    } else {
      filters.textTerms.push(token.toLowerCase());
    }
  }

  return filters;
};

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onSelectSuggestion,
  availableThreads = [],
  placeholder = 'Search messages, senders, syntax filters (⌘K)',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'from:security@eazzio.com',
    'has:attachment',
    'Valkey Cache',
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener: Cmd+K / Ctrl+K / '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const handleApplyFilterHelper = (helperLabel: string) => {
    let nextQuery = query ? `${query.trim()} ${helperLabel}` : helperLabel;
    if (helperLabel.endsWith(':')) {
      nextQuery += '';
    }
    setQuery(nextQuery);
    inputRef.current?.focus();
  };

  const handleSelectRecent = (term: string) => {
    setQuery(term);
    onSearch(term);
    setIsOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !recentSearches.includes(query.trim())) {
      setRecentSearches([query.trim(), ...recentSearches.slice(0, 4)]);
    }
    onSearch(query.trim());
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  // Instant dynamic match suggestions from threads
  const matchingSuggestions = query.trim()
    ? availableThreads
        .filter(
          (t) =>
            t.subject.toLowerCase().includes(query.toLowerCase()) ||
            t.sender.name.toLowerCase().includes(query.toLowerCase()) ||
            t.sender.email.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 4)
    : [];

  return (
    <div ref={containerRef} className="relative flex-1 max-w-2xl" data-testid="search-bar-container">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 rounded-xl pl-10 pr-20 py-2 text-sm text-[#0F172A] placeholder-[#94A3B8] outline-none transition-all"
          data-testid="search-input"
        />

        <div className="absolute right-3 flex items-center gap-1.5">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
              title="Clear search"
              data-testid="search-clear-btn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            title="Show search options"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[#64748B] bg-[#F1F5F9] border border-[#CBD5E1] rounded">
            ⌘K
          </kbd>
        </div>
      </form>

      {/* Autocomplete & Typeahead Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 mt-2 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 text-xs"
          data-testid="search-typeahead-dropdown"
        >
          {/* Quick Filter Syntax Helpers */}
          <div className="p-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-[#14B8A6]" />
              Quick Syntax Filters
            </p>
            <div className="flex flex-wrap gap-1.5">
              {filterSyntaxHelpers.map((helper) => {
                const Icon = helper.icon;
                return (
                  <button
                    key={helper.label}
                    type="button"
                    onClick={() => handleApplyFilterHelper(helper.label)}
                    className="px-2.5 py-1 rounded-lg bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#0F766E] border border-[#CCFBF1] transition-all flex items-center gap-1.5 font-medium"
                    title={helper.desc}
                    data-testid={`filter-chip-${helper.label}`}
                  >
                    <Icon className="w-3 h-3 text-[#14B8A6]" />
                    <span>{helper.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Thread Matches (when typing) */}
          {matchingSuggestions.length > 0 && (
            <div className="p-2 border-b border-[#E2E8F0]">
              <p className="px-3 py-1 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Matching Conversations
              </p>
              {matchingSuggestions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setQuery(`subject:${t.subject}`);
                    onSearch(`subject:${t.subject}`);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-[#F8FAFC] text-left flex items-center justify-between gap-3 text-[#334155] hover:text-[#0F172A] transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-[#14B8A6] shrink-0" />
                    <span className="font-medium truncate">{t.subject}</span>
                    <span className="text-[#64748B] truncate text-[11px]">
                      ({t.sender.name || t.sender.email})
                    </span>
                  </div>
                  <span className="text-[11px] text-[#64748B] shrink-0">{t.lastMessageAt}</span>
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="p-2">
              <p className="px-3 py-1 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Recent Searches
              </p>
              {recentSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => handleSelectRecent(term)}
                  className="w-full px-3 py-2 rounded-xl hover:bg-[#F8FAFC] text-left flex items-center justify-between gap-3 text-[#334155] hover:text-[#0F172A] transition-colors"
                  data-testid="recent-search-item"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Clock className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                    <span className="truncate">{term}</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-[#94A3B8]" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
