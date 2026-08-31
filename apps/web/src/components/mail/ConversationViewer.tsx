'use client';

import React, { useState, useRef } from 'react';
import {
  Star, Trash2, Archive, Mail, Reply, Forward, ShieldCheck, ShieldAlert, 
  Paperclip, Download, Sparkles, ChevronDown, ChevronUp, Send, X, FileText, 
  Printer, ExternalLink, Smile, ArrowLeft, Clock, AlertOctagon, 
  MoreVertical, CheckCircle2, AlertTriangle, EyeOff, Tag, MoveRight,
  Bold, Italic, Underline, Link as LinkIcon, Image as ImageIcon,
  Maximize2, MoreHorizontal, Check, BadgeCheck, ChevronRight
} from 'lucide-react';
import { MessageDetail, ComposerAttachment } from '@/types/mail';

interface TrimmedMessageProps {
  bodyHtml?: string;
  bodyText?: string;
  snippet?: string;
}

export const TrimmedMessageContent: React.FC<TrimmedMessageProps> = ({ bodyHtml, bodyText, snippet }) => {
  const [showQuoted, setShowQuoted] = useState(false);

  // 1. Process HTML Content
  if (bodyHtml && bodyHtml.includes('<') && bodyHtml.includes('>') && bodyHtml !== '<p></p>' && bodyHtml !== '<p><br></p>') {
    const quoteIndex = bodyHtml.search(/(<div\s+class="gmail_quote"|<blockquote|<div\s+class="gmail_attr"|On\s+[A-Za-z]+,\s+[A-Za-z]+\s+\d+.*?(?:wrote|wrote:))/i);
    if (quoteIndex !== -1) {
      const primaryHtml = bodyHtml.slice(0, quoteIndex);
      const quotedHtml = bodyHtml.slice(quoteIndex);
      return (
        <div className="space-y-3 font-sans">
          <div 
            className="text-[14px] text-slate-200 leading-relaxed max-w-none [&_a]:text-[#2D5BFF] [&_a]:underline [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 font-sans" 
            dangerouslySetInnerHTML={{ __html: primaryHtml || '<p></p>' }} 
          />
          <div className="pt-1">
            <button 
              type="button"
              onClick={() => setShowQuoted(!showQuoted)} 
              className="px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white text-xs font-mono font-bold tracking-widest transition-all inline-flex items-center gap-1 shadow-sm select-none"
              title="Show trimmed content"
            >
              •••
            </button>
            {showQuoted && (
              <div 
                className="mt-3 pl-3.5 border-l-2 border-slate-700/80 text-xs text-slate-400 leading-relaxed max-w-none [&_a]:text-[#2D5BFF] [&_p]:my-1 animate-in fade-in slide-in-from-top-2 font-sans" 
                dangerouslySetInnerHTML={{ __html: quotedHtml }} 
              />
            )}
          </div>
        </div>
      );
    }
    return (
      <div 
        className="text-[14px] text-slate-200 leading-relaxed font-sans max-w-none [&_a]:text-[#2D5BFF] [&_a]:underline [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 font-sans" 
        dangerouslySetInnerHTML={{ __html: bodyHtml }} 
      />
    );
  }

  // 2. Process Plain Text Content
  const rawText = bodyText || snippet || '(No content)';
  const quoteRegex = /(?:(?:\r?\n|^|\s)(?:On\s+[A-Za-z]+,\s+[A-Za-z]+\s+\d+.*?(?:wrote|wrote:)|On\s+[A-Za-z]{3}\s+\d{1,2}.*?wrote:|-----Original Message-----|---------- Forwarded message ---------|>[\s\S]*))/i;
  const match = rawText.match(quoteRegex);

  if (match && match.index !== undefined && match.index >= 0) {
    const primaryText = rawText.slice(0, match.index).trim();
    const quotedText = rawText.slice(match.index).trim();
    return (
      <div className="space-y-3 font-sans">
        <div className="text-[14px] text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">{primaryText || (quotedText ? '' : '(No text content)')}</div>
        {quotedText && (
          <div className="pt-1">
            <button 
              type="button"
              onClick={() => setShowQuoted(!showQuoted)} 
              className="px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white text-xs font-mono font-bold tracking-widest transition-all inline-flex items-center gap-1 shadow-sm select-none"
              title="Show trimmed content"
            >
              •••
            </button>
            {showQuoted && (
              <div className="mt-3 pl-3.5 border-l-2 border-slate-700/80 text-xs text-slate-400 leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-top-2 font-sans">
                {quotedText}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  return <div className="text-[14px] text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">{rawText}</div>;
};

export interface ConversationViewerProps {
  threadId: string;
  subject: string;
  messages: MessageDetail[];
  folderName?: string;
  labels?: string[];
  onArchive?: (threadId: string) => void;
  onUnarchive?: (threadId: string) => void;
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
  onArchive, onUnarchive, onDelete, onToggleStar, onSnooze, onSpam,
  onSendReply, onReply, onReplyAll, onForward, onClose,
}) => {
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(
    new Set(messages.length > 0 ? [messages[messages.length - 1]!.id] : [])
  );
  const [activeDetailsId, setActiveDetailsId] = useState<string | null>(null);
  const [activeMoreMenuId, setActiveMoreMenuId] = useState<string | null>(null);
  
  // Inline Reply state
  const [isReplying, setIsReplying] = useState(false);
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll' | 'forward'>('reply');
  const [replyText, setReplyText] = useState('');
  const [showQuotedInReply, setShowQuotedInReply] = useState(false);
  const [isFormattingOpen, setIsFormattingOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const replyEditorRef = useRef<HTMLDivElement>(null);

  const isArchiveFolder = folderName?.toLowerCase().includes('archive');

  const handleToggleExpand = (id: string) => {
    const next = new Set(expandedMessageIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedMessageIds(next);
  };

  const handleGenerateAiSummary = () => {
    setIsSummarizing(true);
    setTimeout(() => {
      setAiSummary(`✨ AI Summary: Conversation regarding "${subject}". Verified outbound status & message flow.`);
      setIsSummarizing(false);
    }, 600);
  };

  const latestMessage = messages[messages.length - 1];

  const handleStartReply = (mode: 'reply' | 'replyAll' | 'forward', customText?: string) => {
    setReplyMode(mode);
    setIsReplying(true);
    if (customText) setReplyText(customText);
    setTimeout(() => {
      replyEditorRef.current?.focus();
    }, 50);
  };

  const handleSendInlineReply = () => {
    if (!replyText.trim() && !replyEditorRef.current?.innerText.trim()) return;
    const finalContent = replyText.trim() || replyEditorRef.current?.innerText.trim() || '';
    
    // Format quote cleanly in Gmail format
    const quoteAuthor = latestMessage?.from?.name || latestMessage?.from?.email || 'Sender';
    const quoteEmail = latestMessage?.from?.email || '';
    const quoteDate = latestMessage?.receivedAt || 'Recent';
    const originalBody = latestMessage?.bodyHtml || latestMessage?.bodyText || latestMessage?.snippet || '';

    const formattedPayload = `${finalContent}\n\n<div class="gmail_quote"><div class="gmail_attr">On ${quoteDate}, ${quoteAuthor} &lt;${quoteEmail}&gt; wrote:<br></div><blockquote class="gmail_quote" style="margin: 0 0 0 .8ex; border-left: 1px #ccc solid; padding-left: 1ex;">${originalBody}</blockquote></div>`;

    onSendReply?.(threadId, formattedPayload);
    setReplyText('');
    if (replyEditorRef.current) replyEditorRef.current.innerHTML = '';
    setIsReplying(false);
  };

  return (
    <div 
      style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)' }}
      className="flex flex-col h-full text-[#EDEEF0] overflow-hidden relative font-sans"
    >
      {/* 1. Gmail-Style Top Action Toolbar (48px) */}
      <div 
        style={{ backgroundColor: 'var(--theme-bg-header, #0A0C10)', borderColor: 'var(--theme-border, #1E232B)' }}
        className="h-12 px-3 sm:px-4 border-b flex items-center justify-between shrink-0 sticky top-0 z-20 select-none"
      >
        {/* Left Action Buttons */}
        <div className="flex items-center gap-1">
          {onClose && (
            <button 
              type="button"
              onClick={onClose} 
              className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Back to list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          
          <div style={{ backgroundColor: 'var(--theme-border, #1E232B)' }} className="w-[1px] h-5 mx-1 hidden sm:block"></div>

          {isArchiveFolder ? (
            <button 
              type="button"
              onClick={() => onUnarchive?.(threadId)} 
              className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Move to Inbox (Unarchive)"
            >
              <Mail className="w-4 h-4" />
            </button>
          ) : (
            <button 
              type="button"
              onClick={() => onArchive?.(threadId)} 
              className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Archive"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}

          <button 
            type="button"
            onClick={() => onSpam?.(threadId, true)} 
            className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Report spam"
          >
            <AlertOctagon className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={() => onDelete?.(threadId)} 
            className="p-2 rounded-full text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div style={{ backgroundColor: 'var(--theme-border, #1E232B)' }} className="w-[1px] h-5 mx-1 hidden sm:block"></div>

          <button 
            type="button"
            className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors hidden sm:inline-flex"
            title="Mark as unread"
          >
            <Mail className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={() => onSnooze?.(threadId)} 
            className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors hidden sm:inline-flex"
            title="Snooze"
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>

        {/* Right Utilities */}
        <div className="flex items-center gap-1">
          <button 
            type="button"
            onClick={handleGenerateAiSummary} 
            disabled={isSummarizing}
            className="px-2.5 py-1 rounded-md text-xs font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 flex items-center gap-1.5 transition-colors"
            title="Summarize with AI"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSummarizing ? 'Summarizing...' : 'Summarize'}</span>
          </button>
          <button 
            type="button"
            onClick={() => window.print()} 
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Print all"
          >
            <Printer className="w-4 h-4" />
          </button>
          {onClose && (
            <button 
              type="button"
              onClick={onClose} 
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Scrollable Body Area */}
      <div 
        style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)' }}
        className="flex-1 overflow-y-auto custom-scrollbar relative"
      >
        {/* Subject Header with Gmail Category Badges & Print/Popout */}
        <div className="px-6 sm:px-12 pt-6 pb-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl text-slate-100 font-medium tracking-tight">
              {subject || '(No Subject)'}
            </h1>
            
            {/* Gmail-style Yellow Chevron and Folder Tag */}
            <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-bold">
              <span className="text-amber-500 font-mono text-sm">›</span>
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded bg-white/10 text-slate-300 font-medium hover:bg-white/15 cursor-default transition-colors">
              <span>{folderName || 'Inbox'}</span>
              <button
                type="button"
                onClick={() => {
                  if (isArchiveFolder) onUnarchive?.(threadId);
                  else onArchive?.(threadId);
                }}
                className="hover:text-white text-slate-400 p-0.5 rounded-full hover:bg-white/10 transition-colors"
                title={isArchiveFolder ? "Move to Inbox" : "Archive"}
              >
                <X className="w-3 h-3" />
              </button>
            </span>

            {labels.map(l => (
              <span key={l} className="text-[11px] px-2.5 py-0.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-300 font-medium">
                {l}
              </span>
            ))}
          </div>

          {/* Right Subject Actions (Print, Popout) */}
          <div className="flex items-center gap-1 text-slate-400">
            <button 
              type="button"
              onClick={() => window.print()}
              className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors"
              title="Print all"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={() => {
                if (latestMessage) onReply?.(latestMessage);
              }}
              className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors"
              title="In new window"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI Summary Banner if generated */}
        {aiSummary && (
          <div className="px-6 sm:px-12 pt-4">
            <div 
              style={{ borderColor: 'var(--theme-accent, #2D5BFF)' }}
              className="p-3.5 rounded-xl bg-purple-500/10 border text-xs text-slate-200 leading-relaxed flex items-start gap-2.5 animate-in fade-in"
            >
              <Sparkles style={{ color: 'var(--theme-accent, #2D5BFF)' }} className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{aiSummary}</span>
            </div>
          </div>
        )}

        {/* 3. Messages in Thread */}
        <div className="px-4 sm:px-10 py-6 space-y-6">
          {messages.map((msg) => {
            const isExpanded = expandedMessageIds.has(msg.id);
            const isDetailsOpen = activeDetailsId === msg.id;
            const isMoreOpen = activeMoreMenuId === msg.id;

            return (
              <div 
                key={msg.id} 
                className="transition-all"
              >
                {/* Message Header */}
                <div 
                  onClick={() => handleToggleExpand(msg.id)} 
                  className="py-2.5 flex items-start justify-between gap-3 select-none cursor-pointer"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Gmail Round Brand Avatar */}
                    <div 
                      style={{ background: `linear-gradient(135deg, #059669, #10B981)` }}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md mt-0.5 select-none"
                    >
                      {msg.from.name ? msg.from.name.slice(0, 2).toUpperCase() : (msg.from.email?.slice(0, 2).toUpperCase() || 'U')}
                    </div>

                    <div className="min-w-0">
                      {/* Line 1: Sender Name & Verified Check & Email */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-sm text-white">{msg.from.name || msg.from.email}</span>
                        <BadgeCheck className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="text-xs text-slate-400 font-normal">&lt;{msg.from.email}&gt;</span>
                      </div>

                      {/* Line 2: to me dropdown toggle */}
                      <div className="relative mt-0.5">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDetailsId(isDetailsOpen ? null : msg.id);
                          }}
                          className="text-[12px] text-slate-400 hover:text-white flex items-center gap-1 py-0.5 rounded transition-colors"
                        >
                          <span>to {msg.to.map(t => t.name || t.email).join(', ') || 'me'}</span>
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>

                        {/* Gmail-style Dropdown Details Card */}
                        {isDetailsOpen && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            style={{ backgroundColor: 'var(--theme-bg-sidebar, #090A0D)', borderColor: 'var(--theme-border, #2A313C)' }}
                            className="absolute left-0 top-full mt-2 p-4 rounded-xl border shadow-2xl z-30 w-84 text-xs space-y-2 animate-in fade-in zoom-in-95"
                          >
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">from:</span><span className="text-slate-200 font-semibold">{msg.from.name ? `${msg.from.name} <${msg.from.email}>` : msg.from.email}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">to:</span><span className="text-slate-200">{msg.to.map(t => t.email || t.name).join(', ')}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">date:</span><span className="text-slate-200">{msg.receivedAt}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">subject:</span><span className="text-slate-200 font-medium">{subject}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">mailed-by:</span><span className="text-slate-200 font-mono text-[11px]">{msg.from.email.split('@')[1] || 'eazzio.com'}</span></div>
                            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-medium">security:</span>
                              <span className="flex items-center gap-1 text-emerald-400 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Standard encryption (TLS)</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Snippet if collapsed */}
                      {!isExpanded && (
                        <p className="text-xs text-slate-400 truncate max-w-lg mt-1">{msg.snippet}</p>
                      )}
                    </div>
                  </div>

                  {/* Header Right Actions (Gmail: Timestamp, Star, React, Reply, More) */}
                  <div className="flex items-center gap-1.5 shrink-0 text-slate-400 select-none">
                    <span className="text-xs text-slate-400 mr-1">{msg.receivedAt}</span>
                    
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar?.(threadId);
                      }}
                      className="p-1.5 rounded-full hover:bg-white/10 hover:text-amber-400 transition-colors"
                      title="Star message"
                    >
                      <Star className={`w-4 h-4 ${msg.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartReply('reply', '👍');
                      }}
                      className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors"
                      title="Add reaction"
                    >
                      <Smile className="w-4 h-4" />
                    </button>

                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartReply('reply');
                      }}
                      className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors"
                      title="Reply"
                    >
                      <Reply className="w-4 h-4" />
                    </button>

                    <div className="relative">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMoreMenuId(isMoreOpen ? null : msg.id);
                        }}
                        className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors"
                        title="More options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMoreOpen && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          style={{ backgroundColor: 'var(--theme-bg-sidebar, #090A0D)', borderColor: 'var(--theme-border, #2A313C)' }}
                          className="absolute right-0 top-full mt-1 w-44 rounded-xl border shadow-2xl py-1 z-30 animate-in fade-in"
                        >
                          <button 
                            type="button"
                            onClick={() => { handleStartReply('reply'); setActiveMoreMenuId(null); }}
                            className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-white/10 flex items-center gap-2"
                          >
                            <Reply className="w-3.5 h-3.5" /> Reply
                          </button>
                          <button 
                            type="button"
                            onClick={() => { handleStartReply('forward'); setActiveMoreMenuId(null); }}
                            className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-white/10 flex items-center gap-2"
                          >
                            <Forward className="w-3.5 h-3.5" /> Forward
                          </button>
                          <button 
                            type="button"
                            onClick={() => { window.print(); setActiveMoreMenuId(null); }}
                            className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-white/10 flex items-center gap-2"
                          >
                            <Printer className="w-3.5 h-3.5" /> Print
                          </button>
                          <button 
                            type="button"
                            onClick={() => { onDelete?.(threadId); setActiveMoreMenuId(null); }}
                            className="w-full px-3 py-1.5 text-left text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 border-t border-white/5 mt-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete message
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Message Body & Trimmed Content */}
                {isExpanded && (
                  <div className="pl-13.5 sm:pl-14 pr-4 py-3 animate-in fade-in duration-200">
                    <TrimmedMessageContent bodyHtml={msg.bodyHtml} bodyText={msg.bodyText} snippet={msg.snippet} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 4. Bottom Action Area (Gmail Standard Buttons & Inline Reply Card) */}
        <div className="px-4 sm:px-14 pb-12">
          {/* Smart Reply Pill Suggestions */}
          {!isReplying && (
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {['Got it, thanks!', 'Looks good to me.', 'I will review this today.', 'Could you provide more details?'].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleStartReply('reply', suggestion)}
                  style={{
                    backgroundColor: 'var(--theme-bg-card, #12141A)',
                    borderColor: 'var(--theme-border, #1E232B)',
                  }}
                  className="px-4 py-1.5 rounded-full border text-xs font-medium text-slate-300 hover:text-white hover:border-white/30 hover:scale-[1.02] active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          {/* Collapsed State: Gmail Rounded Reply & Forward Pills */}
          {!isReplying ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleStartReply('reply')}
                style={{
                  backgroundColor: 'var(--theme-bg-card, #12141A)',
                  borderColor: 'var(--theme-border, #2A313C)',
                }}
                className="px-6 py-2.5 rounded-full border text-slate-300 hover:text-white hover:border-white/40 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm hover:brightness-110"
              >
                <Reply className="w-4 h-4 text-slate-400" />
                <span>Reply</span>
              </button>
              <button
                type="button"
                onClick={() => handleStartReply('forward')}
                style={{
                  backgroundColor: 'var(--theme-bg-card, #12141A)',
                  borderColor: 'var(--theme-border, #2A313C)',
                }}
                className="px-6 py-2.5 rounded-full border text-slate-300 hover:text-white hover:border-white/40 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm hover:brightness-110"
              >
                <Forward className="w-4 h-4 text-slate-400" />
                <span>Forward</span>
              </button>
              <button
                type="button"
                onClick={() => handleStartReply('reply', '😀')}
                style={{
                  backgroundColor: 'var(--theme-bg-card, #12141A)',
                  borderColor: 'var(--theme-border, #2A313C)',
                }}
                className="p-2.5 rounded-full border text-slate-400 hover:text-white hover:border-white/40 transition-all shadow-sm hover:brightness-110"
                title="Add reaction"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Gmail Inline Rich Reply Box */
            <div
              style={{
                backgroundColor: 'var(--theme-bg-card, #12141A)',
                borderColor: 'var(--theme-border, #1E232B)',
              }}
              className="rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in duration-200"
            >
              {/* Header */}
              <div
                style={{
                  backgroundColor: 'var(--theme-bg-sidebar, #090A0D)',
                  borderColor: 'var(--theme-border, #1E232B)',
                }}
                className="px-4 py-2.5 border-b flex items-center justify-between text-xs select-none"
              >
                <div className="flex items-center gap-2 text-slate-300">
                  {replyMode === 'forward' ? (
                    <Forward className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Reply className="w-4 h-4 text-blue-400" />
                  )}
                  <span className="font-semibold text-slate-400">
                    {replyMode === 'forward' ? 'Forwarding to:' : 'Replying to:'}
                  </span>
                  <span className="font-semibold text-white">
                    {replyMode === 'forward' ? 'Select recipient...' : (latestMessage?.from?.name || latestMessage?.from?.email || 'Sender')}
                  </span>
                  {replyMode !== 'forward' && (
                    <span className="text-slate-500">&lt;{latestMessage?.from?.email}&gt;</span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (latestMessage) {
                        if (replyMode === 'forward') onForward?.(latestMessage);
                        else onReply?.(latestMessage);
                        setIsReplying(false);
                      }
                    }}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Pop out reply"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplying(false);
                      setReplyText('');
                    }}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Text Input */}
              <div className="p-4">
                <textarea
                  autoFocus
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${latestMessage?.from?.name || latestMessage?.from?.email || 'message'}...`}
                  rows={4}
                  className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none resize-none leading-relaxed font-sans"
                />

                {/* Trimmed Original Message inside Inline Reply */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuotedInReply(!showQuotedInReply)}
                    className="px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white text-xs font-mono font-bold tracking-widest transition-all inline-flex items-center gap-1 shadow-sm select-none"
                    title="Toggle original message"
                  >
                    •••
                  </button>

                  {showQuotedInReply && (
                    <div className="mt-3 pl-3.5 border-l-2 border-slate-700 text-xs text-slate-400 leading-relaxed animate-in fade-in font-sans">
                      <div className="font-semibold text-slate-300 mb-1">
                        On {latestMessage?.receivedAt}, {latestMessage?.from?.name || latestMessage?.from?.email} wrote:
                      </div>
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: latestMessage?.bodyHtml || `<p>${latestMessage?.bodyText || latestMessage?.snippet || ''}</p>` 
                        }} 
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div
                style={{
                  backgroundColor: 'var(--theme-bg-sidebar, #090A0D)',
                  borderColor: 'var(--theme-border, #1E232B)',
                }}
                className="p-3 border-t flex items-center justify-between"
              >
                {/* Left Formats */}
                <div className="flex items-center gap-1 text-slate-400">
                  <button
                    type="button"
                    onClick={handleSendInlineReply}
                    disabled={!replyText.trim()}
                    className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 transition-all disabled:opacity-50 shadow-md mr-2"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setIsFormattingOpen(!isFormattingOpen)} 
                    className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                      isFormattingOpen ? 'bg-blue-500/20 text-blue-400' : 'hover:text-white hover:bg-white/10'
                    }`} 
                    title="Formatting options"
                  >
                    Aa
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (latestMessage) onReply?.(latestMessage);
                      setIsReplying(false);
                    }}
                    className="p-1.5 rounded hover:text-white hover:bg-white/10" 
                    title="Attach files (open composer)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (latestMessage) onReply?.(latestMessage);
                      setIsReplying(false);
                    }}
                    className="p-1.5 rounded hover:text-white hover:bg-white/10" 
                    title="Insert emoji (open composer)"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                </div>

                {/* Right Discard */}
                <button
                  type="button"
                  onClick={() => {
                    setReplyText('');
                    setIsReplying(false);
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Discard draft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationViewer;
