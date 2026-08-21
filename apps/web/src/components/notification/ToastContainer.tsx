'use client';

import React from 'react';
import { Mail, X, Bell } from 'lucide-react';

export interface ToastNotification {
  id: string;
  title: string;
  senderName?: string;
  senderEmail?: string;
  message: string;
  threadId?: string;
  timestamp: string;
}

export interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
  onClickToast?: (threadId: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  onClickToast,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      data-testid="toast-container"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => {
            if (toast.threadId && onClickToast) {
              onClickToast(toast.threadId);
              onDismiss(toast.id);
            }
          }}
          className="pointer-events-auto p-4 rounded-2xl bg-[#16181D]/95 border border-[#2A2E37] shadow-2xl backdrop-blur-md hover:border-[#2D5BFF]/50 transition-all cursor-pointer flex items-start gap-3 animate-in slide-in-from-bottom-5 fade-in duration-200 group"
          data-testid={`toast-item-${toast.id}`}
        >
          {/* Icon Badge */}
          <div className="w-9 h-9 rounded-xl bg-[#2D5BFF]/20 border border-[#2D5BFF]/30 text-[#2D5BFF] flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="w-4 h-4" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white truncate">
                {toast.senderName || 'New Email'}
              </span>
              <span className="text-[10px] text-slate-400 shrink-0">{toast.timestamp}</span>
            </div>

            <p className="text-xs font-medium text-slate-200 truncate mt-0.5">{typeof toast.title === 'string' ? toast.title : JSON.stringify(toast.title)}</p>
            <p className="text-xs text-slate-400 truncate mt-0.5">{typeof toast.message === 'string' ? toast.message : JSON.stringify(toast.message)}</p>
          </div>

          {/* Dismiss Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(toast.id);
            }}
            className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-[#2A2E37] transition-colors shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
