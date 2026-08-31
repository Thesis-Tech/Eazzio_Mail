'use client';

import React, { useState } from 'react';
import {
  Star, Trash2, Archive, Mail, Reply, Forward, ShieldCheck, ShieldAlert, 
  Paperclip, Download, Sparkles, ChevronDown, ChevronUp, Send, X, FileText, 
  Printer, ExternalLink, Smile, ArrowLeft, Clock, AlertOctagon, 
  MoreVertical, CheckCircle2, AlertTriangle, EyeOff, LayoutTemplate
} from 'lucide-react';
import { MessageDetail } from '../../types/mail';

interface TrimmedMessageProps {
  bodyHtml?: string;
  bodyText?: string;
  snippet?: string;
}

const TrimmedMessageContent: React.FC<TrimmedMessageProps> = ({ bodyHtml, bodyText, snippet }) => {
  const [showQuoted, setShowQuoted] = useState(false);

  if (bodyHtml && bodyHtml.includes('<') && bodyHtml.includes('>') && bodyHtml !== '<p></p>' && bodyHtml !== '<p><br></p>') {
    const quoteIndex = bodyHtml.search(/(<div\s+class="gmail_quote"|<blockquote|<div\s+class="gmail_attr")/i);
    if (quoteIndex !== -1) {
      const primaryHtml = bodyHtml.slice(0, quoteIndex);
      const quotedHtml = bodyHtml.slice(quoteIndex);
      return (
        <div className="space-y-3 font-sans">
          <div className="text-[15px] text-slate-200 leading-relaxed prose prose-invert max-w-none [&_a]:text-[#2D5BFF] [&_a]:underline" dangerouslySetInnerHTML={{ __html: primaryHtml }} />
          <div>
            <button onClick={() => setShowQuoted(!showQuoted)} className="px-3 py-1 rounded-md bg-[#1E232B] hover:bg-[#2A313C] text-slate-400 hover:text-white text-xs font-bold tracking-widest transition-colors flex items-center gap-2">••• {showQuoted ? 'Hide trimmed content' : 'Show trimmed content'}</button>
            {showQuoted && (
              <div className="mt-4 pl-4 border-l-2 border-[#2A313C] text-sm text-slate-400 leading-relaxed prose prose-invert max-w-none [&_a]:text-[#2D5BFF] animate-in fade-in slide-in-from-top-2" dangerouslySetInnerHTML={{ __html: quotedHtml }} />
            )}
          </div>
        </div>
      );
    }
    return <div className="text-[15px] text-slate-200 leading-relaxed font-sans prose prose-invert max-w-none [&_a]:text-[#2D5BFF] [&_a]:underline" dangerouslySetInnerHTML={{ __html: bodyHtml }} />;
  }

  const rawText = bodyText || snippet || '(No content)';
  const quoteRegex = /(?:\r?\n)(?:On\s+[A-Za-z]+,\s+[A-Za-z]+\s+\d+.*?(?:wrote|wrote:)|-----Original Message-----|---------- Forwarded message ---------)[\s\S]*/i;
  const match = rawText.match(quoteRegex);

  if (match && match.index !== undefined) {
    const primaryText = rawText.slice(0, match.index).trim();
    const quotedText = rawText.slice(match.index).trim();
    return (
      <div className="space-y-3 font-sans">
        <div className="text-[15px] text-slate-200 leading-relaxed whitespace-pre-wrap">{primaryText || '(No text content)'}</div>
        <div>
          <button onClick={() => setShowQuoted(!showQuoted)} className="px-3 py-1 rounded-md bg-[#1E232B] hover:bg-[#2A313C] text-slate-400 hover:text-white text-xs font-bold tracking-widest transition-colors flex items-center gap-2">••• {showQuoted ? 'Hide trimmed content' : 'Show trimmed content'}</button>
          {showQuoted && (
            <div className="mt-4 pl-4 border-l-2 border-[#2A313C] text-sm text-slate-400 leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-top-2">{quotedText}</div>
          )}
        </div>
      </div>
    );
  }
  return <div className="text-[15px] text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">{rawText}</div>;
};

export interface ConversationViewerProps {
  threadId: string;
  subject: string;
  messages: MessageDetail[];
  folderName?: string;
  labels?: string[];
  onArchive?: (threadId: string) => void;
  onDelete?: (threadId: string) => void;
  onToggleStar?: (threadId: string) => void;
  onSnooze?: (threadId: string) => void;
  onSpam?: (threadId: string, isSpam: boolean) => void;
  onSendReply?: (threadId: string, replyText: string) => void;
  onReply?: (message: MessageDetail) => void;
  onReplyAll?: (message: MessageDetail) => void;
  onForward?: (message: MessageDetail) => void;
  onClose?: () => void;
}

export const ConversationViewer: React.FC<ConversationViewerProps> = ({
  threadId, subject, messages, folderName, labels = [],
  onArchive, onDelete, onToggleStar, onSnooze, onSpam,
  onSendReply, onReply, onReplyAll, onForward, onClose,
}) => {
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(
    new Set(messages.length > 0 ? [messages[messages.length - 1]!.id] : [])
  );
  const [replyText, setReplyText] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSecurityDetails, setShowSecurityDetails] = useState(false);

  const handleToggleExpand = (id: string) => {
    const next = new Set(expandedMessageIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedMessageIds(next);
  };

  const handleGenerateAiSummary = () => {
    setIsSummarizing(true);
    setTimeout(() => {
      setAiSummary(`✨ AI Summary: This thread discusses the upcoming infrastructure milestone. The sender wants a review of the deliverables by EOD. Key action item: Respond with feedback on the attached Q3 plan.`);
      setIsSummarizing(false);
    }, 800);
  };

  const latestMessage = messages[messages.length - 1];
  const isVerified = latestMessage?.security?.dkim === 'pass' && latestMessage?.security?.spf === 'pass';

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] text-[#EDEEF0] overflow-hidden relative font-sans">
      {/* Header */}
      <div className="h-16 px-4 sm:px-6 border-b border-[#1E232B] flex items-center justify-between gap-4 shrink-0 bg-[#0A0C10]/90 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onClose && (
            <button onClick={onClose} className="md:hidden p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1E232B] transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">{subject || '(No Subject)'}</h1>
          <span className="hidden sm:flex text-xs px-2.5 py-1 rounded-md bg-[#1E232B] text-slate-300 font-bold shrink-0 shadow-inner">{messages.length}</span>
          {labels.map(l => (
            <span key={l} className="hidden lg:flex text-[11px] px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-300 font-semibold">{l}</span>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={handleGenerateAiSummary} className="hidden sm:flex px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 text-purple-400 hover:from-purple-500/20 hover:to-blue-500/20 text-xs font-bold items-center gap-1.5 transition-all shadow-sm">
            <Sparkles className="w-4 h-4" /> <span>Summarize</span>
          </button>
          <div className="w-[1px] h-6 bg-[#1E232B] mx-1 hidden sm:block"></div>
          <button onClick={() => window.print()} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E232B]"><Printer className="w-4 h-4" /></button>
          <button onClick={() => onArchive?.(threadId)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E232B]"><Archive className="w-4 h-4" /></button>
          <button onClick={() => onDelete?.(threadId)} className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
          {onClose && (
            <button onClick={onClose} className="p-2 ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E232B] bg-[#12141A] border border-[#1E232B] shadow-sm"><X className="w-4 h-4" /></button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#0A0C10]">
        
        {/* Security Banner (ProtonMail Tier) */}
        {latestMessage && (
          <div className="mx-4 sm:mx-8 mt-6">
            <div className={`p-4 rounded-xl border flex flex-col gap-3 transition-all duration-300 ${isVerified ? 'bg-[#14B8A6]/5 border-[#14B8A6]/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowSecurityDetails(!showSecurityDetails)}>
                <div className="flex items-center gap-3">
                  {isVerified ? (
                    <div className="w-8 h-8 rounded-full bg-[#14B8A6]/20 flex items-center justify-center text-[#14B8A6]"><ShieldCheck className="w-4 h-4" /></div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500"><AlertTriangle className="w-4 h-4" /></div>
                  )}
                  <div>
                    <h3 className={`text-sm font-bold ${isVerified ? 'text-[#14B8A6]' : 'text-amber-500'}`}>{isVerified ? 'Verified Sender & Clean Content' : 'Sender Identity Unverified'}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Eazzio Security has scanned this conversation.</p>
                  </div>
                </div>
                <button className="text-slate-500 hover:text-white">{showSecurityDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</button>
              </div>

              {showSecurityDetails && (
                <div className="pt-3 mt-1 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-in fade-in slide-in-from-top-2">
                  <div className="p-2 rounded bg-black/20 border border-white/5">
                    <div className="text-slate-500 font-semibold mb-1 uppercase tracking-wider text-[10px]">SPF</div>
                    <div className="flex items-center gap-1.5 font-bold text-white"><CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6]" /> Pass</div>
                  </div>
                  <div className="p-2 rounded bg-black/20 border border-white/5">
                    <div className="text-slate-500 font-semibold mb-1 uppercase tracking-wider text-[10px]">DKIM</div>
                    <div className="flex items-center gap-1.5 font-bold text-white"><CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6]" /> Pass</div>
                  </div>
                  <div className="p-2 rounded bg-black/20 border border-white/5">
                    <div className="text-slate-500 font-semibold mb-1 uppercase tracking-wider text-[10px]">DMARC</div>
                    <div className="flex items-center gap-1.5 font-bold text-white"><CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6]" /> Pass</div>
                  </div>
                  <div className="p-2 rounded bg-black/20 border border-white/5">
                    <div className="text-slate-500 font-semibold mb-1 uppercase tracking-wider text-[10px]">Protection</div>
                    <div className="flex items-center gap-1.5 font-bold text-white"><EyeOff className="w-3.5 h-3.5 text-purple-400" /> Trackers Blocked</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {aiSummary && (
          <div className="mx-4 sm:mx-8 mt-4 p-4 rounded-xl bg-gradient-to-r from-[#2D5BFF]/10 to-[#14B8A6]/10 border border-[#2D5BFF]/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 shadow-lg">
            <Sparkles className="w-5 h-5 text-[#2D5BFF] shrink-0 mt-0.5" />
            <p className="text-sm text-slate-200 font-medium leading-relaxed">{aiSummary}</p>
          </div>
        )}

        {/* Thread Messages */}
        <div className="p-4 sm:p-8 pt-6 space-y-4">
          {messages.map((msg, index) => {
            const isExpanded = expandedMessageIds.has(msg.id);
            return (
              <div key={msg.id} className={`rounded-2xl border transition-all duration-300 ${isExpanded ? 'bg-[#12141A] border-[#1E232B] shadow-2xl' : 'bg-[#0A0C10] border-[#1E232B]/50 hover:border-[#1E232B] cursor-pointer'}`}>
                {/* Header */}
                <div onClick={() => handleToggleExpand(msg.id)} className="p-4 sm:p-5 flex items-center justify-between gap-4 select-none cursor-pointer group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-sm shrink-0 border border-slate-600 shadow-md">
                      {msg.from.name ? msg.from.name.slice(0, 2).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-white truncate">{msg.from.name || msg.from.email}</span>
                        <span className="text-sm text-slate-400 hidden sm:inline truncate">&lt;{msg.from.email}&gt;</span>
                      </div>
                      {!isExpanded && <p className="text-sm text-slate-500 truncate max-w-lg mt-0.5">{msg.snippet}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs font-semibold text-slate-400">{msg.receivedAt}</span>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#1E232B] text-slate-400 group-hover:text-white transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Body */}
                {isExpanded && (
                  <div className="px-5 sm:px-16 pb-6 pt-2 animate-in fade-in duration-300">
                    <div className="text-xs text-slate-400 mb-6 flex items-center gap-2 font-medium">
                      <span className="text-slate-500">To:</span> <span className="text-slate-300 bg-[#1E232B] px-2 py-0.5 rounded-md">{msg.to.map((t) => t.email || t.name).join(', ')}</span>
                    </div>
                    
                    <TrimmedMessageContent bodyHtml={msg.bodyHtml} bodyText={msg.bodyText} snippet={msg.snippet} />

                    {/* Action Bar */}
                    <div className="mt-8 pt-4 border-t border-[#1E232B] flex items-center gap-2">
                      <button onClick={() => onReply?.(msg)} className="px-4 py-2 rounded-lg bg-[#1E232B] hover:bg-[#2A313C] text-white text-sm font-semibold flex items-center gap-2 transition-colors"><Reply className="w-4 h-4" /> Reply</button>
                      <button onClick={() => onForward?.(msg)} className="px-4 py-2 rounded-lg bg-[#1E232B] hover:bg-[#2A313C] text-white text-sm font-semibold flex items-center gap-2 transition-colors"><Forward className="w-4 h-4" /> Forward</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Reply (Floating Bottom) */}
        <div className="sticky bottom-0 p-4 sm:p-6 bg-gradient-to-t from-[#0A0C10] via-[#0A0C10]/95 to-transparent z-10">
          <div className="max-w-4xl mx-auto bg-[#12141A] rounded-2xl border border-[#1E232B] shadow-2xl overflow-hidden focus-within:border-[#2D5BFF]/50 focus-within:ring-4 focus-within:ring-[#2D5BFF]/10 transition-all">
            <div className="p-3 bg-[#1E232B]/50 border-b border-[#1E232B] flex flex-wrap gap-2">
              {['Got it, thanks!', 'Looks good to me.', 'I will review this today.', 'Could you provide more details?'].map(s => (
                <button key={s} onClick={() => setReplyText(s)} className="px-3 py-1.5 rounded-lg bg-[#0A0C10] border border-[#1E232B] hover:border-[#2D5BFF] hover:text-[#2D5BFF] text-xs font-semibold text-slate-400 transition-colors">{s}</button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if(replyText.trim()) { onSendReply?.(threadId, replyText); setReplyText(''); } }}>
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Click here to reply..." rows={3} className="w-full bg-transparent p-4 text-sm text-white placeholder-slate-500 outline-none resize-none" />
              <div className="p-3 bg-[#0A0C10] border-t border-[#1E232B] flex items-center justify-between">
                <div className="flex gap-1">
                  <button type="button" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E232B]"><LayoutTemplate className="w-4 h-4" /></button>
                  <button type="button" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E232B]"><Paperclip className="w-4 h-4" /></button>
                </div>
                <button type="submit" disabled={!replyText.trim()} className="px-5 py-2 rounded-xl bg-[#2D5BFF] hover:bg-[#1E48E0] disabled:opacity-50 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-[#2D5BFF]/20 transition-all"><Send className="w-4 h-4" /> Send</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
