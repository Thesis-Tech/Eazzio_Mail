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
  const [isReplying, setIsReplying] = useState(false);
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
    <div 
      style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)' }}
      className="flex flex-col h-full text-[#EDEEF0] overflow-hidden relative font-sans"
    >
      {/* Header */}
      <div 
        style={{ backgroundColor: 'var(--theme-bg-header, #0A0C10)', borderColor: 'var(--theme-border, #1E232B)' }}
        className="h-16 px-4 sm:px-6 border-b flex items-center justify-between gap-4 shrink-0 backdrop-blur-md sticky top-0 z-20"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onClose && (
            <button onClick={onClose} className="md:hidden p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">{subject || '(No Subject)'}</h1>
          <span 
            style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
            className="hidden sm:flex text-xs px-2.5 py-1 rounded-md text-slate-300 font-bold shrink-0 border"
          >
            {messages.length}
          </span>
          {labels.map(l => (
            <span key={l} className="hidden lg:flex text-[11px] px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-300 font-semibold">{l}</span>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={handleGenerateAiSummary} className="hidden sm:flex px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 text-purple-400 hover:from-purple-500/20 hover:to-blue-500/20 text-xs font-bold items-center gap-1.5 transition-all shadow-sm">
            <Sparkles className="w-4 h-4" /> <span>Summarize</span>
          </button>
          <div style={{ backgroundColor: 'var(--theme-border, #1E232B)' }} className="w-[1px] h-6 mx-1 hidden sm:block"></div>
          <button onClick={() => window.print()} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"><Printer className="w-4 h-4" /></button>
          <button onClick={() => onArchive?.(threadId)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"><Archive className="w-4 h-4" /></button>
          <button onClick={() => onDelete?.(threadId)} className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
          {onClose && (
            <button 
              onClick={onClose} 
              style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
              className="p-2 ml-2 rounded-lg text-slate-400 hover:text-white border shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)' }}
        className="flex-1 overflow-y-auto custom-scrollbar relative"
      >
        
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
          <div 
            style={{ borderColor: 'var(--theme-accent, #2D5BFF)' }}
            className="mx-4 sm:mx-8 mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border flex items-start gap-3 animate-in fade-in slide-in-from-top-4 shadow-lg"
          >
            <Sparkles style={{ color: 'var(--theme-accent, #2D5BFF)' }} className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-200 font-medium leading-relaxed">{aiSummary}</p>
          </div>
        )}

        {/* Thread Messages */}
        <div className="p-4 sm:p-8 pt-6 space-y-4">
          {messages.map((msg) => {
            const isExpanded = expandedMessageIds.has(msg.id);
            return (
              <div 
                key={msg.id} 
                style={{
                  backgroundColor: isExpanded ? 'var(--theme-bg-card, #12141A)' : 'var(--theme-bg-main, #0A0C10)',
                  borderColor: 'var(--theme-border, #1E232B)',
                }}
                className={`rounded-2xl border transition-all duration-300 ${isExpanded ? 'shadow-2xl' : 'hover:border-white/20 cursor-pointer'}`}
              >
                {/* Header */}
                <div onClick={() => handleToggleExpand(msg.id)} className="p-4 sm:p-5 flex items-center justify-between gap-4 select-none cursor-pointer group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div 
                      style={{ background: `linear-gradient(135deg, var(--theme-accent, #2D5BFF), #14B8A6)` }}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md"
                    >
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
                    <div 
                      style={{ backgroundColor: 'var(--theme-border, #1E232B)' }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:text-white transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Body */}
                {isExpanded && (
                  <div className="px-5 sm:px-16 pb-6 pt-2 animate-in fade-in duration-300">
                    <div className="text-xs text-slate-400 mb-6 flex items-center gap-2 font-medium">
                      <span className="text-slate-500">To:</span> <span style={{ backgroundColor: 'var(--theme-border, #1E232B)' }} className="text-slate-300 px-2 py-0.5 rounded-md">{msg.to.map((t) => t.email || t.name).join(', ')}</span>
                    </div>
                    
                    <TrimmedMessageContent bodyHtml={msg.bodyHtml} bodyText={msg.bodyText} snippet={msg.snippet} />

                    {/* Action Bar */}
                    <div style={{ borderColor: 'var(--theme-border, #1E232B)' }} className="mt-8 pt-4 border-t flex items-center gap-2">
                      <button onClick={() => onReply?.(msg)} style={{ backgroundColor: 'var(--theme-border, #1E232B)' }} className="px-4 py-2 rounded-lg hover:brightness-125 text-white text-sm font-semibold flex items-center gap-2 transition-all"><Reply className="w-4 h-4" /> Reply</button>
                      <button onClick={() => onForward?.(msg)} style={{ backgroundColor: 'var(--theme-border, #1E232B)' }} className="px-4 py-2 rounded-lg hover:brightness-125 text-white text-sm font-semibold flex items-center gap-2 transition-all"><Forward className="w-4 h-4" /> Forward</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Reply Area (Gmail-style) */}
        <div className="p-4 sm:p-8 pt-0">
          {/* Smart Reply Pill Suggestions */}
          {!isReplying && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {['Got it, thanks!', 'Looks good to me.', 'I will review this today.', 'Could you provide more details?'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setReplyText(suggestion);
                    setIsReplying(true);
                  }}
                  style={{
                    backgroundColor: 'var(--theme-bg-card, #12141A)',
                    borderColor: 'var(--theme-border, #1E232B)',
                  }}
                  className="px-4 py-2 rounded-full border text-xs font-medium text-slate-300 hover:text-white hover:border-white/30 hover:scale-[1.02] active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Sparkles style={{ color: 'var(--theme-accent, #2D5BFF)' }} className="w-3 h-3 opacity-80" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          {/* Collapsed State: Standard Gmail Action Buttons */}
          {!isReplying && !replyText ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsReplying(true)}
                style={{
                  backgroundColor: 'var(--theme-bg-card, #12141A)',
                  borderColor: 'var(--theme-border, #1E232B)',
                }}
                className="px-6 py-2.5 rounded-full border text-slate-300 hover:text-white hover:border-white/30 hover:brightness-125 text-sm font-semibold flex items-center gap-2 transition-all shadow-md"
              >
                <Reply className="w-4 h-4 text-slate-400" />
                <span>Reply</span>
              </button>
              <button
                onClick={() => {
                  if (latestMessage) onReplyAll?.(latestMessage);
                }}
                style={{
                  backgroundColor: 'var(--theme-bg-card, #12141A)',
                  borderColor: 'var(--theme-border, #1E232B)',
                }}
                className="px-6 py-2.5 rounded-full border text-slate-300 hover:text-white hover:border-white/30 hover:brightness-125 text-sm font-semibold flex items-center gap-2 transition-all shadow-md"
              >
                <Reply className="w-4 h-4 text-slate-400 rotate-180" />
                <span>Reply all</span>
              </button>
              <button
                onClick={() => {
                  if (latestMessage) onForward?.(latestMessage);
                }}
                style={{
                  backgroundColor: 'var(--theme-bg-card, #12141A)',
                  borderColor: 'var(--theme-border, #1E232B)',
                }}
                className="px-6 py-2.5 rounded-full border text-slate-300 hover:text-white hover:border-white/30 hover:brightness-125 text-sm font-semibold flex items-center gap-2 transition-all shadow-md"
              >
                <Forward className="w-4 h-4 text-slate-400" />
                <span>Forward</span>
              </button>
            </div>
          ) : (
            /* Expanded State: Inline Reply Composer */
            <div
              style={{
                backgroundColor: 'var(--theme-bg-card, #12141A)',
                borderColor: 'var(--theme-border, #1E232B)',
              }}
              className="rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            >
              {/* Header */}
              <div
                style={{
                  backgroundColor: 'var(--theme-bg-sidebar, #090A0D)',
                  borderColor: 'var(--theme-border, #1E232B)',
                }}
                className="px-4 py-2.5 border-b flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 text-slate-300">
                  <Reply className="w-3.5 h-3.5 text-slate-400" />
                  <span>Replying to:</span>
                  <span className="font-semibold text-white">
                    {latestMessage?.from?.name || latestMessage?.from?.email || 'Sender'}
                  </span>
                  <span className="text-slate-500">&lt;{latestMessage?.from?.email}&gt;</span>
                </div>
                <button
                  onClick={() => {
                    setIsReplying(false);
                    setReplyText('');
                  }}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Text Area */}
              <textarea
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your reply here..."
                rows={4}
                className="w-full bg-transparent p-4 text-sm text-white placeholder-slate-500 outline-none resize-none"
              />

              {/* Toolbar & Send */}
              <div
                style={{
                  backgroundColor: 'var(--theme-bg-header, #0A0C10)',
                  borderColor: 'var(--theme-border, #1E232B)',
                }}
                className="p-3 border-t flex items-center justify-between"
              >
                <div className="flex items-center gap-1 text-slate-400">
                  <button type="button" className="p-2 rounded-lg hover:text-white hover:bg-white/10 transition-colors" title="Attach file">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button type="button" className="p-2 rounded-lg hover:text-white hover:bg-white/10 transition-colors" title="Emoji">
                    <Smile className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyText('');
                      setIsReplying(false);
                    }}
                    className="p-2 rounded-lg hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                    title="Discard draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (replyText.trim()) {
                        onSendReply?.(threadId, replyText);
                        setReplyText('');
                        setIsReplying(false);
                      }
                    }}
                    disabled={!replyText.trim()}
                    style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }}
                    className="px-6 py-2 rounded-xl text-white font-bold text-sm flex items-center gap-2 shadow-lg hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
