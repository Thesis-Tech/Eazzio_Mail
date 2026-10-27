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
  { id: 'eazzio-teal', name: 'Eazzio Light (Default)', bg: '#F8FAFC', accent: '#14B8A6', border: '#CBD5E1', isLight: true },
  { id: 'dark-oled', name: 'Royal Dark', bg: '#0A0C10', accent: '#2D5BFF', border: '#1E232B' },
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

  const activeThemeId = theme || 'eazzio-teal';

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      {/* Slide-over Container */}
      <aside 
        style={{
          backgroundColor: 'var(--theme-bg-sidebar, #FFFFFF)',
          borderColor: 'var(--theme-border, #E2E8F0)',
        }}
        className="relative w-full max-w-sm h-full border-l shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 font-sans"
      >
        {/* Header */}
        <div 
          style={{
            backgroundColor: 'var(--theme-bg-header, #F8FAFC)',
            borderColor: 'var(--theme-border, #E2E8F0)',
          }}
          className="h-16 px-5 border-b flex items-center justify-between shrink-0"
        >
          <h2 className="text-base font-bold tracking-tight">Quick settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Settings Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          
          {/* See All Settings Button */}
          <div>
            <button
              onClick={() => {
                onClose();
                onOpenFullSettings();
              }}
              style={{
                borderColor: 'var(--theme-accent, #14B8A6)',
                backgroundColor: 'var(--theme-accent-bg, #F0FDFA)',
                color: 'var(--theme-accent, #0F766E)',
              }}
              className="w-full py-2.5 px-4 rounded-xl border font-semibold text-sm transition-all duration-200 shadow-sm flex items-center justify-center gap-2 hover:brightness-95"
            >
              <Sliders className="w-4 h-4" />
              <span>See all settings</span>
            </button>
          </div>

          <hr style={{ borderColor: 'var(--theme-border, #E2E8F0)' }} />

          {/* Display Density */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold opacity-60 uppercase tracking-wider">Density</h3>
            <div className="space-y-2">
              
              {/* Default */}
              <label
                onClick={() => onChangeDensity('default')}
                style={{
                  backgroundColor: density === 'default' ? 'var(--theme-accent-bg, #F0FDFA)' : 'var(--theme-bg-card, #FFFFFF)',
                  borderColor: density === 'default' ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #E2E8F0)',
                }}
                className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:opacity-95"
              >
                <div className="flex items-center gap-3">
                  <div 
                    style={{
                      borderColor: density === 'default' ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #94A3B8)',
                    }}
                    className="w-4 h-4 rounded-full border flex items-center justify-center"
                  >
                    {density === 'default' && (
                      <div style={{ backgroundColor: 'var(--theme-accent, #14B8A6)' }} className="w-2 h-2 rounded-full" />
                    )}
                  </div>
                  <span className="text-sm font-semibold">Default</span>
                </div>
                {/* Visual Representation */}
                <div 
                  style={{
                    backgroundColor: 'var(--theme-bg-main, #F8FAFC)',
                    borderColor: 'var(--theme-border, #E2E8F0)',
                  }}
                  className="w-16 h-8 rounded-lg border p-1 flex flex-col justify-between"
                >
                  <div className="h-1.5 w-full bg-slate-400/40 rounded-sm" />
                  <div style={{ backgroundColor: 'var(--theme-accent, #14B8A6)' }} className="h-2 w-7 rounded-sm" />
                </div>
              </label>

              {/* Comfortable */}
              <label
                onClick={() => onChangeDensity('comfortable')}
                style={{
                  backgroundColor: density === 'comfortable' ? 'var(--theme-accent-bg, #F0FDFA)' : 'var(--theme-bg-card, #FFFFFF)',
                  borderColor: density === 'comfortable' ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #E2E8F0)',
                }}
                className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:opacity-95"
              >
                <div className="flex items-center gap-3">
                  <div 
                    style={{
                      borderColor: density === 'comfortable' ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #94A3B8)',
                    }}
                    className="w-4 h-4 rounded-full border flex items-center justify-center"
                  >
                    {density === 'comfortable' && (
                      <div style={{ backgroundColor: 'var(--theme-accent, #14B8A6)' }} className="w-2 h-2 rounded-full" />
                    )}
                  </div>
                  <span className="text-sm font-semibold">Comfortable</span>
                </div>
                {/* Visual Representation */}
                <div 
                  style={{
                    backgroundColor: 'var(--theme-bg-main, #F8FAFC)',
                    borderColor: 'var(--theme-border, #E2E8F0)',
                  }}
                  className="w-16 h-8 rounded-lg border p-1.5 flex flex-col justify-between"
                >
                  <div className="h-1 w-full bg-slate-400/40 rounded-sm" />
                  <div className="h-1 w-4/5 bg-slate-400/60 rounded-sm" />
                </div>
              </label>

              {/* Compact */}
              <label
                onClick={() => onChangeDensity('compact')}
                style={{
                  backgroundColor: density === 'compact' ? 'var(--theme-accent-bg, #F0FDFA)' : 'var(--theme-bg-card, #FFFFFF)',
                  borderColor: density === 'compact' ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #E2E8F0)',
                }}
                className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:opacity-95"
              >
                <div className="flex items-center gap-3">
                  <div 
                    style={{
                      borderColor: density === 'compact' ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #94A3B8)',
                    }}
                    className="w-4 h-4 rounded-full border flex items-center justify-center"
                  >
                    {density === 'compact' && (
                      <div style={{ backgroundColor: 'var(--theme-accent, #14B8A6)' }} className="w-2 h-2 rounded-full" />
                    )}
                  </div>
                  <span className="text-sm font-semibold">Compact</span>
                </div>
                {/* Visual Representation */}
                <div 
                  style={{
                    backgroundColor: 'var(--theme-bg-main, #F8FAFC)',
                    borderColor: 'var(--theme-border, #E2E8F0)',
                  }}
                  className="w-16 h-8 rounded-lg border p-1 flex flex-col justify-between"
                >
                  <div className="h-0.5 w-full bg-slate-400/40 rounded-xs" />
                  <div className="h-0.5 w-full bg-slate-400/40 rounded-xs" />
                  <div className="h-0.5 w-full bg-slate-400/40 rounded-xs" />
                </div>
              </label>

            </div>
          </div>

          <hr style={{ borderColor: 'var(--theme-border, #E2E8F0)' }} />

          {/* Theme Palette */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold opacity-60 uppercase tracking-wider">Theme</h3>
              <button 
                onClick={() => {
                  onClose();
                  onOpenFullSettings();
                }}
                style={{ color: 'var(--theme-accent, #0F766E)' }}
                className="text-xs font-bold hover:underline flex items-center gap-1"
              >
                <Palette className="w-3 h-3" />
                <span>View all / Custom</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {THEMES.map((th) => {
                const isSelected = activeThemeId === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => onChangeTheme(th.id)}
                    className={`h-16 rounded-xl border p-2.5 flex flex-col justify-between transition-all duration-200 relative overflow-hidden group ${
                      isSelected ? 'ring-2 border-transparent shadow-md scale-[1.02]' : 'hover:scale-[1.01]'
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
                        <div 
                          style={{ backgroundColor: th.accent }}
                          className="w-4 h-4 rounded-full flex items-center justify-center text-white"
                        >
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <span className={`text-[11px] font-bold truncate w-full text-left ${th.isLight ? 'text-[#0F172A]' : 'text-white'}`}>
                      {th.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <hr style={{ borderColor: 'var(--theme-border, #E2E8F0)' }} />

          {/* Inbox Type */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold opacity-60 uppercase tracking-wider">Inbox Type</h3>
            <div className="space-y-2">
              
              {/* Default */}
              <label
                onClick={() => onChangeInboxType('default')}
                style={{
                  backgroundColor: inboxType === 'default' ? 'var(--theme-accent-bg, #F0FDFA)' : 'var(--theme-bg-card, #FFFFFF)',
                  borderColor: inboxType === 'default' ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #E2E8F0)',
                }}
                className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:opacity-95"
              >
                <div className="flex items-center gap-3">
                  <div 
                    style={{
                      borderColor: inboxType === 'default' ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #94A3B8)',
                    }}
                    className="w-4 h-4 rounded-full border flex items-center justify-center"
                  >
                    {inboxType === 'default' && (
                      <div style={{ backgroundColor: 'var(--theme-accent, #14B8A6)' }} className="w-2 h-2 rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Default</p>
                    <p className="text-[11px] opacity-60">Categories tabs enabled</p>
                  </div>
                </div>
                <div 
                  style={{
                    backgroundColor: 'var(--theme-bg-main, #F8FAFC)',
                    borderColor: 'var(--theme-border, #E2E8F0)',
                  }}
                  className="w-12 h-7 rounded border p-1 flex flex-col justify-between"
                >
                  <div className="flex gap-0.5">
                    <div style={{ backgroundColor: 'var(--theme-accent, #14B8A6)' }} className="w-2 h-1 rounded-xs" />
                    <div className="w-2 h-1 bg-slate-400/40 rounded-xs" />
                  </div>
                  <div className="h-1 w-full bg-slate-400/40 rounded-xs" />
                </div>
              </label>

              {/* Important First */}
              <label
                onClick={() => onChangeInboxType('important')}
                style={{
                  backgroundColor: inboxType === 'important' ? 'var(--theme-accent-bg, #F0FDFA)' : 'var(--theme-bg-card, #FFFFFF)',
                  borderColor: inboxType === 'important' ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #E2E8F0)',
                }}
                className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:opacity-95"
              >
                <div className="flex items-center gap-3">
                  <div 
                    style={{
                      borderColor: inboxType === 'important' ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #94A3B8)',
                    }}
                    className="w-4 h-4 rounded-full border flex items-center justify-center"
                  >
                    {inboxType === 'important' && (
                      <div style={{ backgroundColor: 'var(--theme-accent, #14B8A6)' }} className="w-2 h-2 rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Important first</p>
                    <p className="text-[11px] opacity-60">Prioritize flagged emails</p>
                  </div>
                </div>
                <div 
                  style={{
                    backgroundColor: 'var(--theme-bg-main, #F8FAFC)',
                    borderColor: 'var(--theme-border, #E2E8F0)',
                  }}
                  className="w-12 h-7 rounded border p-1 flex flex-col justify-between"
                >
                  <div className="h-1.5 w-full bg-amber-500 rounded-xs" />
                  <div className="h-1 w-full bg-slate-400/40 rounded-xs" />
                </div>
              </label>

              {/* Unread First */}
              <label
                onClick={() => onChangeInboxType('unread')}
                style={{
                  backgroundColor: inboxType === 'unread' ? 'var(--theme-accent-bg, #F0FDFA)' : 'var(--theme-bg-card, #FFFFFF)',
                  borderColor: inboxType === 'unread' ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #E2E8F0)',
                }}
                className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:opacity-95"
              >
                <div className="flex items-center gap-3">
                  <div 
                    style={{
                      borderColor: inboxType === 'unread' ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #94A3B8)',
                    }}
                    className="w-4 h-4 rounded-full border flex items-center justify-center"
                  >
                    {inboxType === 'unread' && (
                      <div style={{ backgroundColor: 'var(--theme-accent, #14B8A6)' }} className="w-2 h-2 rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Unread first</p>
                    <p className="text-[11px] opacity-60">Unread mail at the top</p>
                  </div>
                </div>
                <div 
                  style={{
                    backgroundColor: 'var(--theme-bg-main, #F8FAFC)',
                    borderColor: 'var(--theme-border, #E2E8F0)',
                  }}
                  className="w-12 h-7 rounded border p-1 flex flex-col justify-between"
                >
                  <div style={{ backgroundColor: 'var(--theme-accent, #14B8A6)' }} className="h-1.5 w-full rounded-xs" />
                  <div className="h-1 w-full bg-slate-400/40 rounded-xs" />
                </div>
              </label>

            </div>
          </div>

          <hr style={{ borderColor: 'var(--theme-border, #E2E8F0)' }} />

          {/* Reading Pane */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold opacity-60 uppercase tracking-wider">Reading Pane</h3>
            <div className="space-y-2">
              
              {/* No split */}
              <label
                onClick={() => onChangeReadingPane('none')}
                style={{
                  backgroundColor: readingPane === 'none' ? 'var(--theme-accent-bg, #F0FDFA)' : 'var(--theme-bg-card, #FFFFFF)',
                  borderColor: readingPane === 'none' ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #E2E8F0)',
                }}
                className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:opacity-95"
              >
                <div className="flex items-center gap-3">
                  <div 
                    style={{
                      borderColor: readingPane === 'none' ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #94A3B8)',
                    }}
                    className="w-4 h-4 rounded-full border flex items-center justify-center"
                  >
                    {readingPane === 'none' && (
                      <div style={{ backgroundColor: 'var(--theme-accent, #14B8A6)' }} className="w-2 h-2 rounded-full" />
                    )}
                  </div>
                  <span className="text-sm font-semibold">No split</span>
                </div>
                <div 
                  style={{
                    backgroundColor: 'var(--theme-bg-main, #F8FAFC)',
                    borderColor: 'var(--theme-border, #E2E8F0)',
                  }}
                  className="w-12 h-7 rounded border p-1 flex flex-col justify-center gap-0.5"
                >
                  <div className="h-1 w-full bg-slate-400/40 rounded-xs" />
                  <div className="h-1 w-full bg-slate-400/40 rounded-xs" />
                </div>
              </label>

              {/* Right of inbox */}
              <label
                onClick={() => onChangeReadingPane('right')}
                style={{
                  backgroundColor: readingPane === 'right' ? 'var(--theme-accent-bg, #F0FDFA)' : 'var(--theme-bg-card, #FFFFFF)',
                  borderColor: readingPane === 'right' ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #E2E8F0)',
                }}
                className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:opacity-95"
              >
                <div className="flex items-center gap-3">
                  <div 
                    style={{
                      borderColor: readingPane === 'right' ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #94A3B8)',
                    }}
                    className="w-4 h-4 rounded-full border flex items-center justify-center"
                  >
                    {readingPane === 'right' && (
                      <div style={{ backgroundColor: 'var(--theme-accent, #14B8A6)' }} className="w-2 h-2 rounded-full" />
                    )}
                  </div>
                  <span className="text-sm font-semibold">Right of inbox</span>
                </div>
                <div 
                  style={{
                    backgroundColor: 'var(--theme-bg-main, #F8FAFC)',
                    borderColor: 'var(--theme-border, #E2E8F0)',
                  }}
                  className="w-12 h-7 rounded border p-1 flex gap-1"
                >
                  <div className="w-1/2 h-full bg-slate-400/40 rounded-xs" />
                  <div style={{ backgroundColor: 'var(--theme-accent, #14B8A6)' }} className="w-1/2 h-full rounded-xs" />
                </div>
              </label>

            </div>
          </div>

          <hr style={{ borderColor: 'var(--theme-border, #E2E8F0)' }} />

          {/* Email Threading */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold opacity-60 uppercase tracking-wider">Email Threading</h3>
            <label 
              style={{
                backgroundColor: 'var(--theme-bg-card, #FFFFFF)',
                borderColor: 'var(--theme-border, #E2E8F0)',
              }}
              className="flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:opacity-95 transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={conversationView}
                  onChange={(e) => onToggleConversationView(e.target.checked)}
                  style={{ accentColor: 'var(--theme-accent, #14B8A6)' }}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <span className="text-sm font-semibold">Conversation view</span>
              </div>
              <span className="text-xs opacity-60 font-medium">Group by thread</span>
            </label>
          </div>

        </div>
      </aside>
    </div>
  );
};
