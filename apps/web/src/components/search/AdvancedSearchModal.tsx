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
    <div className="absolute top-14 left-0 right-0 max-w-2xl mx-auto z-50 bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      <form onSubmit={handleSearchSubmit} className="p-5 space-y-4 text-xs">
        
        {/* From */}
        <div className="grid grid-cols-4 items-center gap-3">
          <label className="text-[#475569] font-medium">From</label>
          <input
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="e.g. sender@example.com"
            className="col-span-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 transition-all"
          />
        </div>

        {/* To */}
        <div className="grid grid-cols-4 items-center gap-3">
          <label className="text-[#475569] font-medium">To</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="e.g. recipient@example.com"
            className="col-span-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 transition-all"
          />
        </div>

        {/* Subject */}
        <div className="grid grid-cols-4 items-center gap-3">
          <label className="text-[#475569] font-medium">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Monthly Report"
            className="col-span-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 transition-all"
          />
        </div>

        {/* Has the words */}
        <div className="grid grid-cols-4 items-center gap-3">
          <label className="text-[#475569] font-medium">Has the words</label>
          <input
            type="text"
            value={hasWords}
            onChange={(e) => setHasWords(e.target.value)}
            placeholder="e.g. invoice urgent"
            className="col-span-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 transition-all"
          />
        </div>

        {/* Doesn't have */}
        <div className="grid grid-cols-4 items-center gap-3">
          <label className="text-[#475569] font-medium">Doesn't have</label>
          <input
            type="text"
            value={doesntHave}
            onChange={(e) => setDoesntHave(e.target.value)}
            placeholder="e.g. newsletter unsubscribe"
            className="col-span-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 transition-all"
          />
        </div>

        {/* Size */}
        <div className="grid grid-cols-4 items-center gap-3">
          <label className="text-[#475569] font-medium">Size</label>
          <div className="col-span-3 flex items-center gap-2">
            <select
              value={sizeOperator}
              onChange={(e) => setSizeOperator(e.target.value as any)}
              className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-[#0F172A] focus:outline-none focus:border-[#14B8A6]"
            >
              <option value="greater_than">greater than</option>
              <option value="less_than">less than</option>
            </select>
            <input
              type="number"
              value={sizeVal}
              onChange={(e) => setSizeVal(e.target.value)}
              placeholder="10"
              className="w-20 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#14B8A6]"
            />
            <select
              value={sizeUnit}
              onChange={(e) => setSizeUnit(e.target.value as any)}
              className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-[#0F172A] focus:outline-none focus:border-[#14B8A6]"
            >
              <option value="MB">MB</option>
              <option value="KB">KB</option>
              <option value="Bytes">Bytes</option>
            </select>
          </div>
        </div>

        {/* Options */}
        <div className="pt-2 border-t border-[#E2E8F0] flex items-center gap-6 text-[#334155]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasAttachment}
              onChange={(e) => setHasAttachment(e.target.checked)}
              className="w-4 h-4 rounded border-[#CBD5E1] text-[#14B8A6] focus:ring-0"
            />
            <span>Has attachment</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontIncludeChats}
              onChange={(e) => setDontIncludeChats(e.target.checked)}
              className="w-4 h-4 rounded border-[#CBD5E1] text-[#14B8A6] focus:ring-0"
            />
            <span>Don't include chats</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (onCreateFilter) {
                onCreateFilter({ from, to, subject, hasWords });
              }
              onClose();
            }}
            className="text-[#0F766E] hover:text-[#0D9488] font-semibold hover:underline py-1.5 px-3 rounded-lg transition-colors"
          >
            Create filter
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white font-semibold flex items-center gap-1.5 shadow-sm transition-all"
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
