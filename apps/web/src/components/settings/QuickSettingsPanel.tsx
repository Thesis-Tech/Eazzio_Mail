'use client';

import React from 'react';
import { X, Check, Sliders, Moon, Sun, Sparkles, Layout, SplitSquareVertical, SplitSquareHorizontal, Rows } from 'lucide-react';

export interface QuickSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullSettings: () => void;
  density: 'default' | 'comfortable' | 'compact';
  onChangeDensity: (density: 'default' | 'comfortable' | 'compact') => void;
  theme: string;
  onChangeTheme: (theme: string) => void;
  inboxType: 'default' | 'important' | 'unread' | 'starred' | 'priority';
  onChangeInboxType: (type: 'default' | 'important' | 'unread' | 'starred' | 'priority') => void;
  readingPane: 'none' | 'right' | 'below';
  onChangeReadingPane: (pane: 'none' | 'right' | 'below') => void;
  conversationView: boolean;
  onToggleConversationView: (val: boolean) => void;
}

const THEMES = [
  { id: 'dark-oled', name: 'Default Dark', bg: '#0A0C10', accent: '#2D5BFF', border: '#1E232B' },
  { id: 'midnight', name: 'Midnight', bg: '#0F172A', accent: '#38BDF8', border: '#1E293B' },
  { id: 'emerald', name: 'Cyber Emerald', bg: '#061A14', accent: '#10B981', border: '#064E3B' },
  { id: 'purple', name: 'Deep Amethyst', bg: '#130B24', accent: '#A855F7', border: '#3B0764' },
  { id: 'graphite', name: 'Graphite Slate', bg: '#18181B', accent: '#14B8A6', border: '#27272A' },
  { id: 'sunset', name: 'Crimson Dusk', bg: '#1A0B0E', accent: '#F43F5E', border: '#4C0519' },
];

export const QuickSettingsPanel: React.FC<QuickSettingsProps> = ({
  isOpen,
  onClose,
  onOpenFullSettings,
  density,
  onChangeDensity,
  theme,
  onChangeTheme,
  inboxType,
  onChangeInboxType,
  readingPane,
  onChangeReadingPane,
  conversationView,
  onToggleConversationView,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over Container */}
      <aside className="relative w-full max-w-sm h-full bg-[#111317] border-l border-[#22262E] shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="h-16 px-5 border-b border-[#22262E] flex items-center justify-between shrink-0 bg-[#16181D]">
          <h2 className="text-base font-semibold text-white tracking-tight">Quick settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#22262E] transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Settings Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar text-slate-300">
          
          {/* See All Settings Button */}
          <div>
            <button
              onClick={() => {
                onClose();
                onOpenFullSettings();
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-[#2D5BFF]/30 bg-[#2D5BFF]/10 hover:bg-[#2D5BFF]/20 text-[#2D5BFF] font-semibold text-sm transition-all duration-200 shadow-sm flex items-center justify-center gap-2"
            >
              <Sliders className="w-4 h-4" />
              <span>See all settings</span>
            </button>
          </div>

          <hr className="border-[#22262E]" />

          {/* Display Density */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Density</h3>
            <div className="space-y-2">
              
              {/* Default */}
              <label
                onClick={() => onChangeDensity('default')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  density === 'default'
                    ? 'border-[#2D5BFF] bg-[#2D5BFF]/10 text-white'
                    : 'border-[#22262E] bg-[#16181D] hover:bg-[#1A1D24] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${density === 'default' ? 'border-[#2D5BFF]' : 'border-slate-500'}`}>
                    {density === 'default' && <div className="w-2 h-2 rounded-full bg-[#2D5BFF]" />}
                  </div>
                  <span className="text-sm font-medium">Default</span>
                </div>
                {/* Visual Representation */}
                <div className="w-16 h-8 rounded-lg bg-[#0C0E12] border border-[#2A2E37] p-1 flex flex-col justify-between">
                  <div className="h-1.5 w-full bg-slate-600 rounded-sm" />
                  <div className="h-2 w-7 bg-[#2D5BFF]/60 rounded-sm" />
                </div>
              </label>

              {/* Comfortable */}
              <label
                onClick={() => onChangeDensity('comfortable')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  density === 'comfortable'
                    ? 'border-[#2D5BFF] bg-[#2D5BFF]/10 text-white'
                    : 'border-[#22262E] bg-[#16181D] hover:bg-[#1A1D24] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${density === 'comfortable' ? 'border-[#2D5BFF]' : 'border-slate-500'}`}>
                    {density === 'comfortable' && <div className="w-2 h-2 rounded-full bg-[#2D5BFF]" />}
                  </div>
                  <span className="text-sm font-medium">Comfortable</span>
                </div>
                {/* Visual Representation */}
                <div className="w-16 h-8 rounded-lg bg-[#0C0E12] border border-[#2A2E37] p-1.5 flex flex-col justify-between">
                  <div className="h-1 w-full bg-slate-600 rounded-sm" />
                  <div className="h-1 w-4/5 bg-slate-700 rounded-sm" />
                </div>
              </label>

              {/* Compact */}
              <label
                onClick={() => onChangeDensity('compact')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  density === 'compact'
                    ? 'border-[#2D5BFF] bg-[#2D5BFF]/10 text-white'
                    : 'border-[#22262E] bg-[#16181D] hover:bg-[#1A1D24] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${density === 'compact' ? 'border-[#2D5BFF]' : 'border-slate-500'}`}>
                    {density === 'compact' && <div className="w-2 h-2 rounded-full bg-[#2D5BFF]" />}
                  </div>
                  <span className="text-sm font-medium">Compact</span>
                </div>
                {/* Visual Representation */}
                <div className="w-16 h-8 rounded-lg bg-[#0C0E12] border border-[#2A2E37] p-1 flex flex-col justify-between">
                  <div className="h-0.5 w-full bg-slate-600 rounded-xs" />
                  <div className="h-0.5 w-full bg-slate-600 rounded-xs" />
                  <div className="h-0.5 w-full bg-slate-600 rounded-xs" />
                </div>
              </label>

            </div>
          </div>

          <hr className="border-[#22262E]" />

          {/* Theme Palette */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Theme</h3>
              <span className="text-xs text-[#2D5BFF] cursor-pointer hover:underline">View all</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {THEMES.map((th) => {
                const isSelected = theme === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => onChangeTheme(th.id)}
                    className={`h-16 rounded-xl border p-2 flex flex-col justify-between transition-all duration-200 relative overflow-hidden group ${
                      isSelected ? 'ring-2 ring-[#2D5BFF] border-transparent shadow-lg' : 'border-[#2A2E37] hover:border-slate-500'
                    }`}
                    style={{ backgroundColor: th.bg }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: th.accent }} />
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-[10px] font-medium text-slate-300 truncate w-full text-left">{th.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-[#22262E]" />

          {/* Inbox Type */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inbox Type</h3>
            <div className="space-y-2">
              
              {/* Default */}
              <label
                onClick={() => onChangeInboxType('default')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  inboxType === 'default'
                    ? 'border-[#2D5BFF] bg-[#2D5BFF]/10 text-white'
                    : 'border-[#22262E] bg-[#16181D] hover:bg-[#1A1D24] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${inboxType === 'default' ? 'border-[#2D5BFF]' : 'border-slate-500'}`}>
                    {inboxType === 'default' && <div className="w-2 h-2 rounded-full bg-[#2D5BFF]" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Default</p>
                    <p className="text-[11px] text-slate-500">Categories tabs enabled</p>
                  </div>
                </div>
                <div className="w-12 h-7 rounded bg-[#0C0E12] border border-[#2A2E37] p-1 flex flex-col justify-between">
                  <div className="flex gap-0.5">
                    <div className="w-2 h-1 bg-[#2D5BFF] rounded-xs" />
                    <div className="w-2 h-1 bg-slate-700 rounded-xs" />
                  </div>
                  <div className="h-1 w-full bg-slate-600 rounded-xs" />
                </div>
              </label>

              {/* Important First */}
              <label
                onClick={() => onChangeInboxType('important')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  inboxType === 'important'
                    ? 'border-[#2D5BFF] bg-[#2D5BFF]/10 text-white'
                    : 'border-[#22262E] bg-[#16181D] hover:bg-[#1A1D24] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${inboxType === 'important' ? 'border-[#2D5BFF]' : 'border-slate-500'}`}>
                    {inboxType === 'important' && <div className="w-2 h-2 rounded-full bg-[#2D5BFF]" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Important first</p>
                    <p className="text-[11px] text-slate-500">Prioritize flagged emails</p>
                  </div>
                </div>
                <div className="w-12 h-7 rounded bg-[#0C0E12] border border-[#2A2E37] p-1 flex flex-col justify-between">
                  <div className="h-1.5 w-full bg-amber-500/60 rounded-xs" />
                  <div className="h-1 w-full bg-slate-700 rounded-xs" />
                </div>
              </label>

              {/* Unread First */}
              <label
                onClick={() => onChangeInboxType('unread')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  inboxType === 'unread'
                    ? 'border-[#2D5BFF] bg-[#2D5BFF]/10 text-white'
                    : 'border-[#22262E] bg-[#16181D] hover:bg-[#1A1D24] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${inboxType === 'unread' ? 'border-[#2D5BFF]' : 'border-slate-500'}`}>
                    {inboxType === 'unread' && <div className="w-2 h-2 rounded-full bg-[#2D5BFF]" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Unread first</p>
                    <p className="text-[11px] text-slate-500">Unread mail at the top</p>
                  </div>
                </div>
                <div className="w-12 h-7 rounded bg-[#0C0E12] border border-[#2A2E37] p-1 flex flex-col justify-between">
                  <div className="h-1.5 w-full bg-[#2D5BFF]/80 rounded-xs" />
                  <div className="h-1 w-full bg-slate-700 rounded-xs" />
                </div>
              </label>

            </div>
          </div>

          <hr className="border-[#22262E]" />

          {/* Reading Pane */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reading Pane</h3>
            <div className="space-y-2">
              
              {/* No split */}
              <label
                onClick={() => onChangeReadingPane('none')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  readingPane === 'none'
                    ? 'border-[#2D5BFF] bg-[#2D5BFF]/10 text-white'
                    : 'border-[#22262E] bg-[#16181D] hover:bg-[#1A1D24] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${readingPane === 'none' ? 'border-[#2D5BFF]' : 'border-slate-500'}`}>
                    {readingPane === 'none' && <div className="w-2 h-2 rounded-full bg-[#2D5BFF]" />}
                  </div>
                  <span className="text-sm font-medium">No split</span>
                </div>
                <div className="w-12 h-7 rounded bg-[#0C0E12] border border-[#2A2E37] p-1 flex flex-col justify-center gap-0.5">
                  <div className="h-1 w-full bg-slate-600 rounded-xs" />
                  <div className="h-1 w-full bg-slate-600 rounded-xs" />
                </div>
              </label>

              {/* Right of inbox */}
              <label
                onClick={() => onChangeReadingPane('right')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  readingPane === 'right'
                    ? 'border-[#2D5BFF] bg-[#2D5BFF]/10 text-white'
                    : 'border-[#22262E] bg-[#16181D] hover:bg-[#1A1D24] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${readingPane === 'right' ? 'border-[#2D5BFF]' : 'border-slate-500'}`}>
                    {readingPane === 'right' && <div className="w-2 h-2 rounded-full bg-[#2D5BFF]" />}
                  </div>
                  <span className="text-sm font-medium">Right of inbox</span>
                </div>
                <div className="w-12 h-7 rounded bg-[#0C0E12] border border-[#2A2E37] p-1 flex gap-1">
                  <div className="w-1/2 h-full bg-slate-600 rounded-xs" />
                  <div className="w-1/2 h-full bg-[#2D5BFF]/40 rounded-xs" />
                </div>
              </label>

            </div>
          </div>

          <hr className="border-[#22262E]" />

          {/* Email Threading */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Threading</h3>
            <label className="flex items-center justify-between p-3 rounded-xl border border-[#22262E] bg-[#16181D] cursor-pointer hover:bg-[#1A1D24] transition-colors">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={conversationView}
                  onChange={(e) => onToggleConversationView(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#0C0E12] border-[#2A2E37] text-[#2D5BFF] focus:ring-0 cursor-pointer"
                />
                <span className="text-sm font-medium text-white">Conversation view</span>
              </div>
              <span className="text-[11px] text-slate-500">Group by thread</span>
            </label>
          </div>

        </div>
      </aside>
    </div>
  );
};
