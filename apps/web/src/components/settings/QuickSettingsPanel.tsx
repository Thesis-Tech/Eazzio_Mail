'use client';

import React from 'react';
import { X, Check, Sliders, Moon, Sun, Sparkles, Layout, SplitSquareVertical, SplitSquareHorizontal, Rows, Palette } from 'lucide-react';

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
  { id: 'midnight', name: 'Midnight Blue', bg: '#070D18', accent: '#38BDF8', border: '#1E3B68' },
  { id: 'emerald', name: 'Cyber Emerald', bg: '#030E0B', accent: '#10B981', border: '#103F31' },
  { id: 'purple', name: 'Deep Amethyst', bg: '#0D0716', accent: '#A855F7', border: '#3D1C63' },
  { id: 'graphite', name: 'Graphite Slate', bg: '#111113', accent: '#14B8A6', border: '#2E2E38' },
  { id: 'sunset', name: 'Crimson Dusk', bg: '#120609', accent: '#F43F5E', border: '#4D1627' },
  { id: 'cyberpunk', name: 'Cyberpunk Gold', bg: '#0B0B08', accent: '#EAB308', border: '#4A4214' },
  { id: 'ocean', name: 'Deep Ocean', bg: '#040C12', accent: '#06B6D4', border: '#13476E' },
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over Container */}
      <aside 
        style={{ 
          backgroundColor: 'var(--theme-bg-sidebar, #090A0D)', 
          borderColor: 'var(--theme-border, #1E232B)',
          color: '#E2E8F0'
        }}
        className="relative w-full max-w-sm h-full border-l shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div 
          style={{ 
            backgroundColor: 'var(--theme-bg-header, #0A0C10)', 
            borderColor: 'var(--theme-border, #1E232B)' 
          }}
          className="h-16 px-5 border-b flex items-center justify-between shrink-0"
        >
          <h2 className="text-base font-semibold text-white tracking-tight">Quick settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
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
              style={{
                borderColor: 'var(--theme-accent, #2D5BFF)',
                backgroundColor: 'var(--theme-accent-bg, rgba(45,91,255,0.12))',
                color: 'var(--theme-accent, #2D5BFF)'
              }}
              className="w-full py-2.5 px-4 rounded-xl border font-semibold text-sm transition-all duration-200 shadow-sm flex items-center justify-center gap-2 hover:brightness-125"
            >
              <Sliders className="w-4 h-4" />
              <span>See all settings</span>
            </button>
          </div>

          <hr style={{ borderColor: 'var(--theme-border, #1E232B)' }} />

          {/* Display Density */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Density</h3>
            <div className="space-y-2">
              
              {/* Default */}
              <label
                onClick={() => onChangeDensity('default')}
                style={{
                  borderColor: density === 'default' ? 'var(--theme-accent, #2D5BFF)' : 'var(--theme-border, #1E232B)',
                  backgroundColor: density === 'default' ? 'var(--theme-accent-bg, rgba(45,91,255,0.12))' : 'var(--theme-bg-card, #12141A)',
                }}
                className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:brightness-110"
              >
                <div className="flex items-center gap-3">
                  <div 
                    style={{ borderColor: density === 'default' ? 'var(--theme-accent, #2D5BFF)' : '#64748B' }}
                    className="w-4 h-4 rounded-full border flex items-center justify-center"
                  >
                    {density === 'default' && (
                      <div 
                        style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }}
                        className="w-2 h-2 rounded-full" 
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium text-white">Default</span>
                </div>
                {/* Visual Representation */}
                <div 
                  style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)', borderColor: 'var(--theme-border, #1E232B)' }}
                  className="w-16 h-8 rounded-lg border p-1 flex flex-col justify-between"
                >
                  <div className="h-1.5 w-full bg-slate-500 rounded-sm" />
                  <div style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }} className="h-2 w-7 rounded-sm opacity-80" />
                </div>
              </label>

              {/* Comfortable */}
              <label
                onClick={() => onChangeDensity('comfortable')}
                style={{
                  borderColor: density === 'comfortable' ? 'var(--theme-accent, #2D5BFF)' : 'var(--theme-border, #1E232B)',
                  backgroundColor: density === 'comfortable' ? 'var(--theme-accent-bg, rgba(45,91,255,0.12))' : 'var(--theme-bg-card, #12141A)',
                }}
                className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:brightness-110"
              >
                <div className="flex items-center gap-3">
                  <div 
                    style={{ borderColor: density === 'comfortable' ? 'var(--theme-accent, #2D5BFF)' : '#64748B' }}
                    className="w-4 h-4 rounded-full border flex items-center justify-center"
                  >
                    {density === 'comfortable' && (
                      <div 
                        style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }}
                        className="w-2 h-2 rounded-full" 
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium text-white">Comfortable</span>
                </div>
                {/* Visual Representation */}
                <div 
                  style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)', borderColor: 'var(--theme-border, #1E232B)' }}
                  className="w-16 h-8 rounded-lg border p-1.5 flex flex-col justify-between"
                >
                  <div className="h-1 w-full bg-slate-500 rounded-sm" />
                  <div className="h-1 w-4/5 bg-slate-600 rounded-sm" />
                </div>
              </label>

              {/* Compact */}
              <label
                onClick={() => onChangeDensity('compact')}
                style={{
                  borderColor: density === 'compact' ? 'var(--theme-accent, #2D5BFF)' : 'var(--theme-border, #1E232B)',
                  backgroundColor: density === 'compact' ? 'var(--theme-accent-bg, rgba(45,91,255,0.12))' : 'var(--theme-bg-card, #12141A)',
                }}
                className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:brightness-110"
              >
                <div className="flex items-center gap-3">
                  <div 
                    style={{ borderColor: density === 'compact' ? 'var(--theme-accent, #2D5BFF)' : '#64748B' }}
                    className="w-4 h-4 rounded-full border flex items-center justify-center"
                  >
                    {density === 'compact' && (
                      <div 
                        style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }}
                        className="w-2 h-2 rounded-full" 
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium text-white">Compact</span>
                </div>
                {/* Visual Representation */}
                <div 
                  style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)', borderColor: 'var(--theme-border, #1E232B)' }}
                  className="w-16 h-8 rounded-lg border p-1 flex flex-col justify-between"
                >
                  <div className="h-0.5 w-full bg-slate-500 rounded-xs" />
                  <div className="h-0.5 w-full bg-slate-500 rounded-xs" />
                  <div className="h-0.5 w-full bg-slate-500 rounded-xs" />
                </div>
              </label>

            </div>
          </div>

          <hr style={{ borderColor: 'var(--theme-border, #1E232B)' }} />

          {/* Theme Palette */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Theme</h3>
              <button 
                onClick={() => {
                  onClose();
                  onOpenFullSettings();
                }}
                style={{ color: 'var(--theme-accent, #2D5BFF)' }}
                className="text-xs font-semibold hover:underline flex items-center gap-1"
              >
                <Palette className="w-3 h-3" />
                <span>View all / Custom</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {THEMES.map((th) => {
                const isSelected = theme === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => onChangeTheme(th.id)}
                    className={`h-16 rounded-xl border p-2.5 flex flex-col justify-between transition-all duration-200 relative overflow-hidden group ${
                      isSelected ? 'ring-2 border-transparent shadow-lg scale-[1.02]' : 'hover:scale-[1.01]'
                    }`}
                    style={{ 
                      backgroundColor: th.bg,
                      borderColor: th.border,
                      boxShadow: isSelected ? `0 0 0 2px ${th.accent}` : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="w-3.5 h-3.5 rounded-full shadow-md" style={{ backgroundColor: th.accent }} />
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center bg-white/20 text-white">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-white truncate w-full text-left">{th.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <hr style={{ borderColor: 'var(--theme-border, #1E232B)' }} />

          {/* Inbox Type */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inbox Type</h3>
            <div className="space-y-2">
              
              {/* Default */}
              <label
                onClick={() => onChangeInboxType('default')}
                style={{
                  borderColor: inboxType === 'default' ? 'var(--theme-accent, #2D5BFF)' : 'var(--theme-border, #1E232B)',
                  backgroundColor: inboxType === 'default' ? 'var(--theme-accent-bg, rgba(45,91,255,0.12))' : 'var(--theme-bg-card, #12141A)',
                }}
                className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:brightness-110"
              >
                <div className="flex items-center gap-3">
                  <div 
                    style={{ borderColor: inboxType === 'default' ? 'var(--theme-accent, #2D5BFF)' : '#64748B' }}
                    className="w-4 h-4 rounded-full border flex items-center justify-center"
                  >
                    {inboxType === 'default' && (
                      <div style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }} className="w-2 h-2 rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Default</p>
                    <p className="text-[11px] text-slate-400">Categories tabs enabled</p>
                  </div>
                </div>
                <div 
                  style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)', borderColor: 'var(--theme-border, #1E232B)' }}
                  className="w-12 h-7 rounded border p-1 flex flex-col justify-between"
                >
                  <div className="flex gap-0.5">
                    <div style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }} className="w-2 h-1 rounded-xs" />
                    <div className="w-2 h-1 bg-slate-600 rounded-xs" />
                  </div>
                  <div className="h-1 w-full bg-slate-500 rounded-xs" />
                </div>
              </label>

              {/* Important First */}
              <label
                onClick={() => onChangeInboxType('important')}
                style={{
                  borderColor: inboxType === 'important' ? 'var(--theme-accent, #2D5BFF)' : 'var(--theme-border, #1E232B)',
                  backgroundColor: inboxType === 'important' ? 'var(--theme-accent-bg, rgba(45,91,255,0.12))' : 'var(--theme-bg-card, #12141A)',
                }}
                className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:brightness-110"
              >
                <div className="flex items-center gap-3">
                  <div 
                    style={{ borderColor: inboxType === 'important' ? 'var(--theme-accent, #2D5BFF)' : '#64748B' }}
                    className="w-4 h-4 rounded-full border flex items-center justify-center"
                  >
                    {inboxType === 'important' && (
                      <div style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }} className="w-2 h-2 rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Important first</p>
                    <p className="text-[11px] text-slate-400">Prioritize flagged emails</p>
                  </div>
                </div>
                <div 
                  style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)', borderColor: 'var(--theme-border, #1E232B)' }}
                  className="w-12 h-7 rounded border p-1 flex flex-col justify-between"
                >
                  <div className="h-1.5 w-full bg-amber-500/80 rounded-xs" />
                  <div className="h-1 w-full bg-slate-500 rounded-xs" />
                </div>
              </label>

              {/* Unread First */}
              <label
                onClick={() => onChangeInboxType('unread')}
                style={{
                  borderColor: inboxType === 'unread' ? 'var(--theme-accent, #2D5BFF)' : 'var(--theme-border, #1E232B)',
                  backgroundColor: inboxType === 'unread' ? 'var(--theme-accent-bg, rgba(45,91,255,0.12))' : 'var(--theme-bg-card, #12141A)',
                }}
                className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:brightness-110"
              >
                <div className="flex items-center gap-3">
                  <div 
                    style={{ borderColor: inboxType === 'unread' ? 'var(--theme-accent, #2D5BFF)' : '#64748B' }}
                    className="w-4 h-4 rounded-full border flex items-center justify-center"
                  >
                    {inboxType === 'unread' && (
                      <div style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }} className="w-2 h-2 rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Unread first</p>
                    <p className="text-[11px] text-slate-400">Unread mail at the top</p>
                  </div>
                </div>
                <div 
                  style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)', borderColor: 'var(--theme-border, #1E232B)' }}
                  className="w-12 h-7 rounded border p-1 flex flex-col justify-between"
                >
                  <div style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }} className="h-1.5 w-full rounded-xs opacity-90" />
                  <div className="h-1 w-full bg-slate-500 rounded-xs" />
                </div>
              </label>

            </div>
          </div>

          <hr style={{ borderColor: 'var(--theme-border, #1E232B)' }} />

          {/* Reading Pane */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reading Pane</h3>
            <div className="space-y-2">
              
              {/* No split */}
              <label
                onClick={() => onChangeReadingPane('none')}
                style={{
                  borderColor: readingPane === 'none' ? 'var(--theme-accent, #2D5BFF)' : 'var(--theme-border, #1E232B)',
                  backgroundColor: readingPane === 'none' ? 'var(--theme-accent-bg, rgba(45,91,255,0.12))' : 'var(--theme-bg-card, #12141A)',
                }}
                className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:brightness-110"
              >
                <div className="flex items-center gap-3">
                  <div 
                    style={{ borderColor: readingPane === 'none' ? 'var(--theme-accent, #2D5BFF)' : '#64748B' }}
                    className="w-4 h-4 rounded-full border flex items-center justify-center"
                  >
                    {readingPane === 'none' && (
                      <div style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }} className="w-2 h-2 rounded-full" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-white">No split</span>
                </div>
                <div 
                  style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)', borderColor: 'var(--theme-border, #1E232B)' }}
                  className="w-12 h-7 rounded border p-1 flex flex-col justify-center gap-0.5"
                >
                  <div className="h-1 w-full bg-slate-500 rounded-xs" />
                  <div className="h-1 w-full bg-slate-500 rounded-xs" />
                </div>
              </label>

              {/* Right of inbox */}
              <label
                onClick={() => onChangeReadingPane('right')}
                style={{
                  borderColor: readingPane === 'right' ? 'var(--theme-accent, #2D5BFF)' : 'var(--theme-border, #1E232B)',
                  backgroundColor: readingPane === 'right' ? 'var(--theme-accent-bg, rgba(45,91,255,0.12))' : 'var(--theme-bg-card, #12141A)',
                }}
                className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:brightness-110"
              >
                <div className="flex items-center gap-3">
                  <div 
                    style={{ borderColor: readingPane === 'right' ? 'var(--theme-accent, #2D5BFF)' : '#64748B' }}
                    className="w-4 h-4 rounded-full border flex items-center justify-center"
                  >
                    {readingPane === 'right' && (
                      <div style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }} className="w-2 h-2 rounded-full" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-white">Right of inbox</span>
                </div>
                <div 
                  style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)', borderColor: 'var(--theme-border, #1E232B)' }}
                  className="w-12 h-7 rounded border p-1 flex gap-1"
                >
                  <div className="w-1/2 h-full bg-slate-500 rounded-xs" />
                  <div style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }} className="w-1/2 h-full rounded-xs opacity-80" />
                </div>
              </label>

            </div>
          </div>

          <hr style={{ borderColor: 'var(--theme-border, #1E232B)' }} />

          {/* Email Threading */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Threading</h3>
            <label 
              style={{
                backgroundColor: 'var(--theme-bg-card, #12141A)',
                borderColor: 'var(--theme-border, #1E232B)',
              }}
              className="flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:brightness-110 transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={conversationView}
                  onChange={(e) => onToggleConversationView(e.target.checked)}
                  style={{ accentColor: 'var(--theme-accent, #2D5BFF)' }}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <span className="text-sm font-medium text-white">Conversation view</span>
              </div>
              <span className="text-[11px] text-slate-400">Group by thread</span>
            </label>
          </div>

        </div>
      </aside>
    </div>
  );
};
