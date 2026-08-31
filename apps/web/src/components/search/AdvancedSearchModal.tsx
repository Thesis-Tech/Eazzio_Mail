'use client';

import React, { useState } from 'react';
import { X, Search, Filter, Calendar, Paperclip, ChevronDown, Check } from 'lucide-react';

export interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  onCreateFilter?: (rule: any) => void;
}

export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
  isOpen,
  onClose,
  onSearch,
  onCreateFilter,
}) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [hasWords, setHasWords] = useState('');
  const [doesntHave, setDoesntHave] = useState('');
  const [sizeOperator, setSizeOperator] = useState<'greater_than' | 'less_than'>('greater_than');
  const [sizeVal, setSizeVal] = useState('');
  const [sizeUnit, setSizeUnit] = useState<'MB' | 'KB' | 'Bytes'>('MB');
  const [dateWithin, setDateWithin] = useState('1d');
  const [hasAttachment, setHasAttachment] = useState(false);
  const [dontIncludeChats, setDontIncludeChats] = useState(true);

  if (!isOpen) return null;

  const buildQuery = () => {
    const parts: string[] = [];
    if (from.trim()) parts.push(`from:${from.trim()}`);
    if (to.trim()) parts.push(`to:${to.trim()}`);
    if (subject.trim()) parts.push(`subject:${subject.trim()}`);
    if (hasWords.trim()) parts.push(hasWords.trim());
    if (doesntHave.trim()) parts.push(`-${doesntHave.trim()}`);
    if (hasAttachment) parts.push('has:attachment');
    if (sizeVal.trim()) {
      parts.push(`size:${sizeVal.trim()}${sizeUnit.toLowerCase()}`);
    }
    return parts.join(' ');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = buildQuery();
    onSearch(q);
    onClose();
  };

  return (
    <div className="absolute top-14 left-0 right-0 max-w-2xl mx-auto z-50 bg-[#16181D] border border-[#2A2E37] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      <form onSubmit={handleSearchSubmit} className="p-5 space-y-4 text-xs">
        
        {/* From */}
        <div className="grid grid-cols-4 items-center gap-3">
          <label className="text-slate-400 font-medium">From</label>
          <input
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="e.g. sender@example.com"
            className="col-span-3 bg-[#0F1115] border border-[#2A2E37] rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-[#2D5BFF]"
          />
        </div>

        {/* To */}
        <div className="grid grid-cols-4 items-center gap-3">
          <label className="text-slate-400 font-medium">To</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="e.g. recipient@example.com"
            className="col-span-3 bg-[#0F1115] border border-[#2A2E37] rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-[#2D5BFF]"
          />
        </div>

        {/* Subject */}
        <div className="grid grid-cols-4 items-center gap-3">
          <label className="text-slate-400 font-medium">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Monthly Report"
            className="col-span-3 bg-[#0F1115] border border-[#2A2E37] rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-[#2D5BFF]"
          />
        </div>

        {/* Has the words */}
        <div className="grid grid-cols-4 items-center gap-3">
          <label className="text-slate-400 font-medium">Has the words</label>
          <input
            type="text"
            value={hasWords}
            onChange={(e) => setHasWords(e.target.value)}
            placeholder="e.g. invoice urgent"
            className="col-span-3 bg-[#0F1115] border border-[#2A2E37] rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-[#2D5BFF]"
          />
        </div>

        {/* Doesn't have */}
        <div className="grid grid-cols-4 items-center gap-3">
          <label className="text-slate-400 font-medium">Doesn't have</label>
          <input
            type="text"
            value={doesntHave}
            onChange={(e) => setDoesntHave(e.target.value)}
            placeholder="e.g. newsletter unsubscribe"
            className="col-span-3 bg-[#0F1115] border border-[#2A2E37] rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-[#2D5BFF]"
          />
        </div>

        {/* Size */}
        <div className="grid grid-cols-4 items-center gap-3">
          <label className="text-slate-400 font-medium">Size</label>
          <div className="col-span-3 flex items-center gap-2">
            <select
              value={sizeOperator}
              onChange={(e) => setSizeOperator(e.target.value as any)}
              className="bg-[#0F1115] border border-[#2A2E37] rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-[#2D5BFF]"
            >
              <option value="greater_than">greater than</option>
              <option value="less_than">less than</option>
            </select>
            <input
              type="number"
              value={sizeVal}
              onChange={(e) => setSizeVal(e.target.value)}
              placeholder="10"
              className="w-20 bg-[#0F1115] border border-[#2A2E37] rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-[#2D5BFF]"
            />
            <select
              value={sizeUnit}
              onChange={(e) => setSizeUnit(e.target.value as any)}
              className="bg-[#0F1115] border border-[#2A2E37] rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-[#2D5BFF]"
            >
              <option value="MB">MB</option>
              <option value="KB">KB</option>
              <option value="Bytes">Bytes</option>
            </select>
          </div>
        </div>

        {/* Options */}
        <div className="pt-2 border-t border-[#2A2E37] flex items-center gap-6 text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasAttachment}
              onChange={(e) => setHasAttachment(e.target.checked)}
              className="w-4 h-4 rounded bg-[#0F1115] border-[#2A2E37] text-[#2D5BFF] focus:ring-0"
            />
            <span>Has attachment</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontIncludeChats}
              onChange={(e) => setDontIncludeChats(e.target.checked)}
              className="w-4 h-4 rounded bg-[#0F1115] border-[#2A2E37] text-[#2D5BFF] focus:ring-0"
            />
            <span>Don't include chats</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#2A2E37] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (onCreateFilter) {
                onCreateFilter({ from, to, subject, hasWords });
              }
              onClose();
            }}
            className="text-slate-400 hover:text-white font-medium hover:underline py-1.5 px-3 rounded-lg"
          >
            Create filter
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-[#2A2E37] text-slate-400 hover:text-white hover:bg-[#1E232B] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 rounded-lg bg-[#2D5BFF] hover:bg-[#2448D6] text-white font-semibold flex items-center gap-1.5 shadow-lg shadow-[#2D5BFF]/20 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};
