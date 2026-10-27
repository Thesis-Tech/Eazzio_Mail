'use client';

import React, { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

export interface ShortcutGroup {
  category: string;
  shortcuts: Array<{ keys: string[]; description: string }>;
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['G', 'I'], description: 'Go to Inbox' },
      { keys: ['G', 'S'], description: 'Go to Starred' },
      { keys: ['G', 'T'], description: 'Go to Sent' },
      { keys: ['G', 'D'], description: 'Go to Drafts' },
      { keys: ['/'], description: 'Focus search bar' },
      { keys: ['Esc'], description: 'Close modal, drawer, or search' },
    ],
  },
  {
    category: 'Compose & Formatting',
    shortcuts: [
      { keys: ['Ctrl', 'Enter'], description: 'Send email immediately' },
      { keys: ['Ctrl', 'B'], description: 'Bold selection' },
      { keys: ['Ctrl', 'I'], description: 'Italic selection' },
      { keys: ['Ctrl', 'U'], description: 'Underline selection' },
      { keys: ['Ctrl', 'K'], description: 'Insert link' },
      { keys: ['Ctrl', 'Shift', 'C'], description: 'Add / Focus Cc recipients' },
      { keys: ['Ctrl', 'Shift', 'B'], description: 'Add / Focus Bcc recipients' },
      { keys: ['Esc'], description: 'Close / save draft' },
    ],
  },
  {
    category: 'Help',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts cheat sheet' },
    ],
  },
];

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="bg-white dark:bg-[#16181D] border border-[#E2E8F0] dark:border-[#2A2E37] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-[#0F172A] dark:text-[#F8FAFC]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#2A2E37]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F0FDFA] dark:bg-[#14B8A6]/20 text-[#14B8A6] flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <h2 id="shortcuts-title" className="text-base font-bold">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts dialog"
            className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 text-sm">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#14B8A6] mb-3">
                {group.category}
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {group.shortcuts.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-[#1E2129] transition-colors"
                  >
                    <span className="text-xs text-[#475569] dark:text-[#CBD5E1] font-medium">
                      {s.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-0.5 rounded-md border border-[#E2E8F0] dark:border-[#2A2E37] bg-[#F8FAFC] dark:bg-[#1C1C21] font-mono text-[11px] font-bold text-[#0F172A] dark:text-[#F8FAFC] shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#F8FAFC] dark:bg-[#12141A] border-t border-[#E2E8F0] dark:border-[#2A2E37] text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white text-xs font-semibold shadow-sm transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
