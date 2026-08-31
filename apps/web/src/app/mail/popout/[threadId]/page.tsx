'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  Printer, ArrowLeft, Star, Reply, Forward, ShieldCheck, 
  Paperclip, Download, ChevronDown, CheckCircle2, BadgeCheck,
  RefreshCw, Mail, ExternalLink, X
} from 'lucide-react';
import { MessageDetail } from '@/types/mail';
import { AuthStore } from '@/lib/auth-store';
import { TrimmedMessageContent } from '@/components/mail/ConversationViewer';

export default function MailPopoutPage() {
  const params = useParams();
  const threadId = params?.threadId as string;

  const [messages, setMessages] = useState<MessageDetail[]>([]);
  const [subject, setSubject] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDetailsId, setActiveDetailsId] = useState<string | null>(null);

  const currentUser = AuthStore.getState().user;

  useEffect(() => {
    if (!threadId) return;

    const loadThread = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const authState = AuthStore.getState();
        const token = authState.token || '';
        const senderEmail = authState.user?.email || '';

        const res = await fetch(`/api/messages/${threadId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-user-email': senderEmail,
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to load email thread (${res.status})`);
        }

        const data = await res.json();
        const msgList: MessageDetail[] = Array.isArray(data.data) ? data.data : [data.data];
        setMessages(msgList);
        if (msgList.length > 0) {
          setSubject(msgList[0]?.subject || '(No Subject)');
        }
      } catch (err: any) {
        console.error('Failed to load popout thread:', err);
        setError(err.message || 'Failed to load conversation');
      } finally {
        setIsLoading(false);
      }
    };

    loadThread();
  }, [threadId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0C10] text-slate-300 flex flex-col items-center justify-center p-6 space-y-3 font-sans">
        <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading conversation in new window...</p>
      </div>
    );
  }

  if (error || messages.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A0C10] text-slate-300 flex flex-col items-center justify-center p-6 space-y-4 font-sans text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <Mail className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Could not load email</h2>
          <p className="text-xs text-slate-400 max-w-sm">{error || 'Thread not found or permission denied.'}</p>
        </div>
        <button
          type="button"
          onClick={() => window.close()}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
        >
          Close Window
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0C10] text-slate-200 font-sans flex flex-col selection:bg-blue-500/30">
      {/* 1. Gmail Standalone Popout Top Bar */}
      <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4 bg-[#0A0C10] sticky top-0 z-20 print:hidden">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            E
          </div>
          <span className="text-lg font-semibold text-white tracking-tight">Eazzio Mail</span>
        </div>

        {/* Current User Info & Print Action */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-2 transition-all shadow-sm"
            title="Print entire conversation"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <div className="text-right hidden sm:block">
            <span className="text-xs font-semibold text-slate-200 block uppercase tracking-wider">
              {currentUser?.displayName || 'Rahul Kumar'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              &lt;{currentUser?.email || 'kumarrahul0@eazzio.com'}&gt;
            </span>
          </div>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-10 space-y-6">
        {/* Subject Header */}
        <div className="border-b border-white/10 pb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-1">
            {subject}
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            {messages.length} message{messages.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Messages in Conversation */}
        <div className="space-y-8">
          {messages.map((msg, index) => {
            const isDetailsOpen = activeDetailsId === msg.id;

            return (
              <article key={msg.id} className="space-y-4 pb-6 border-b border-white/5 last:border-b-0">
                {/* Sender Header Row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md">
                      {msg.from.name ? msg.from.name.slice(0, 2).toUpperCase() : (msg.from.email?.slice(0, 2).toUpperCase() || 'U')}
                    </div>

                    <div className="min-w-0">
                      {/* Name & Badge & Email */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-sm text-white">{msg.from.name || msg.from.email}</span>
                        <BadgeCheck className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="text-xs text-slate-400 font-normal">&lt;{msg.from.email}&gt;</span>
                      </div>

                      {/* to me Dropdown Toggle */}
                      <div className="relative mt-0.5">
                        <button
                          type="button"
                          onClick={() => setActiveDetailsId(isDetailsOpen ? null : msg.id)}
                          className="text-[12px] text-slate-400 hover:text-white flex items-center gap-1 py-0.5 rounded transition-colors"
                        >
                          <span>to {msg.to.map(t => t.name || t.email).join(', ') || 'me'}</span>
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>

                        {isDetailsOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 top-full mt-2 p-4 rounded-xl bg-[#12141A] border border-slate-800 shadow-2xl z-30 w-84 text-xs space-y-2 animate-in fade-in"
                          >
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">from:</span><span className="text-slate-200 font-semibold">{msg.from.name ? `${msg.from.name} <${msg.from.email}>` : msg.from.email}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">to:</span><span className="text-slate-200">{msg.to.map(t => t.email || t.name).join(', ')}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">date:</span><span className="text-slate-200">{msg.receivedAt}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">subject:</span><span className="text-slate-200 font-medium">{subject}</span></div>
                            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-medium">security:</span>
                              <span className="flex items-center gap-1 text-emerald-400 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Standard encryption (TLS)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Date & Print */}
                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-400 block font-mono">
                      {msg.receivedAt}
                    </span>
                  </div>
                </div>

                {/* Body Content with Trimmed Quoted Text Toggle */}
                <div className="pl-13 sm:pl-13.5 pt-2">
                  <TrimmedMessageContent bodyHtml={msg.bodyHtml} bodyText={msg.bodyText} snippet={msg.snippet} />

                  {/* Attachments if any */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <h4 className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{msg.attachments.length} Attachment{msg.attachments.length > 1 ? 's' : ''}</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {msg.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-between gap-3 transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-white truncate">{att.filename}</p>
                              <p className="text-[10px] text-slate-400">{(att.sizeBytes / 1024).toFixed(1)} KB</p>
                            </div>
                            <button
                              type="button"
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                              title="Download attachment"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
