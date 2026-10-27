'use client';

import React, { useState, useRef } from 'react';
import {
  Star, Trash2, Archive, Mail, Reply, Forward, ShieldCheck, ShieldAlert, 
  Paperclip, Download, Sparkles, ChevronDown, ChevronUp, Send, X, FileText, 
  Printer, ExternalLink, Smile, ArrowLeft, Clock, AlertOctagon, AlertCircle,
  MoreVertical, CheckCircle2, AlertTriangle, EyeOff, Tag, MoveRight,
  Bold, Italic, Underline, Link as LinkIcon, Image as ImageIcon,
  Maximize2, MoreHorizontal, Check, BadgeCheck, ChevronRight,
  Calendar, FileDown, Undo2
} from 'lucide-react';
import { MessageDetail } from '@/types/mail';
import { stripQuotedContent, foldNestedQuotes } from '../../lib/jwz-quote-normalizer';
import { sanitizeEmailHtml } from '../../lib/sanitizeHtml';

interface TrimmedMessageProps {
  bodyHtml?: string;
  bodyText?: string;
  snippet?: string;
}

export const TrimmedMessageContent: React.FC<TrimmedMessageProps> = ({ bodyHtml, bodyText, snippet }) => {
  const [showQuoted, setShowQuoted] = useState(false);

  // 1. Process HTML Content if meaningful HTML exists
  if (bodyHtml && bodyHtml.includes('<') && bodyHtml.includes('>') && bodyHtml !== '<p></p>' && bodyHtml !== '<p><br></p>') {
    const split = stripQuotedContent(bodyHtml, true);
    if (split.hasQuotedContent) {
      const primaryHtml = split.primaryContent;
      const quotedHtml = foldNestedQuotes(split.quotedContent);
      return (
        <div className="space-y-3 font-sans">
          {primaryHtml && (
            <div 
              style={{ color: 'var(--theme-text-primary, inherit)' }}
              className="text-[14px] leading-relaxed max-w-none [&_a]:text-[var(--theme-accent,#10B981)] [&_a]:underline [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 font-sans" 
              dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(primaryHtml) }} 
            />
          )}
          {quotedHtml && (
            <div className="pt-1">
              <button 
                type="button"
                onClick={() => setShowQuoted(!showQuoted)} 
                style={{
                  backgroundColor: 'var(--theme-accent-bg, rgba(20, 184, 166, 0.1))',
                  borderColor: 'var(--theme-border, #103F31)',
                  color: 'var(--theme-accent, #10B981)',
                }}
                className="px-2.5 py-0.5 rounded-full border opacity-80 hover:opacity-100 text-xs font-mono font-bold tracking-widest transition-all inline-flex items-center gap-1 shadow-sm select-none"
                title="Show trimmed content"
              >
                •••
              </button>
              {showQuoted && (
                <div 
                  style={{ 
                    borderColor: 'var(--theme-border, #103F31)',
                    color: 'var(--theme-text-secondary, #94A3B8)',
                  }}
                  className="mt-3 pl-3.5 border-l-2 text-xs opacity-75 leading-relaxed max-w-none [&_a]:text-[var(--theme-accent,#10B981)] [&_p]:my-1 animate-in fade-in slide-in-from-top-2 font-sans" 
                  dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(quotedHtml) }} 
                />
              )}
            </div>
          )}
        </div>
      );
    }
    return (
      <div 
        style={{ color: 'var(--theme-text-primary, inherit)' }}
        className="text-[14px] leading-relaxed font-sans max-w-none [&_a]:text-[var(--theme-accent,#10B981)] [&_a]:underline [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 font-sans" 
        dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(bodyHtml) }} 
      />
    );
  }

  // 2. Process Plain Text Content
  const rawText = bodyText || snippet || '(No content)';
  const splitText = stripQuotedContent(rawText, false);

  if (splitText.hasQuotedContent) {
    const primaryText = splitText.primaryContent;
    const quotedText = splitText.quotedContent;
    return (
      <div className="space-y-3 font-sans">
        {primaryText && (
          <div 
            style={{ color: 'var(--theme-text-primary, inherit)' }}
            className="text-[14px] leading-relaxed whitespace-pre-wrap font-sans"
          >
            {primaryText}
          </div>
        )}
        {quotedText && (
          <div className="pt-1">
            <button 
              type="button"
              onClick={() => setShowQuoted(!showQuoted)} 
              style={{
                backgroundColor: 'var(--theme-accent-bg, rgba(20, 184, 166, 0.1))',
                borderColor: 'var(--theme-border, #103F31)',
                color: 'var(--theme-accent, #10B981)',
              }}
              className="px-2.5 py-0.5 rounded-full border opacity-80 hover:opacity-100 text-xs font-mono font-bold tracking-widest transition-all inline-flex items-center gap-1 shadow-sm select-none"
              title="Show trimmed content"
            >
              •••
            </button>
            {showQuoted && (
              <div 
                style={{ 
                  borderColor: 'var(--theme-border, #103F31)',
                  color: 'var(--theme-text-secondary, #94A3B8)',
                }}
                className="mt-3 pl-3.5 border-l-2 text-xs opacity-75 leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-top-2 font-sans"
              >
                {quotedText}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  return (
    <div 
      style={{ color: 'var(--theme-text-primary, inherit)' }}
      className="text-[14px] leading-relaxed whitespace-pre-wrap font-sans"
    >
      {rawText}
    </div>
  );
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
  onCancelScheduled?: (threadId: string) => void;
  onSendReply?: (threadId: string, replyText: string) => void;
  onReply?: (message: MessageDetail) => void;
  onReplyAll?: (message: MessageDetail) => void;
  onForward?: (message: MessageDetail) => void;
  onClose?: () => void;
}

export const ConversationViewer: React.FC<ConversationViewerProps> = ({
  threadId, subject, messages, folderName, labels = [],
  onArchive, onUnarchive, onDelete, onToggleStar, onSnooze, onSpam,
  onCancelScheduled, onSendReply, onReply, onReplyAll, onForward, onClose,
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
  const isScheduledFolder = folderName?.toLowerCase().includes('scheduled');

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
    const latestFrom = (latestMessage?.from?.email || '').toLowerCase();
    const isNoReply = latestFrom.startsWith('no-reply@') || latestFrom.startsWith('noreply@');
    if (isNoReply && mode !== 'forward') {
      return;
    }

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
      style={{
        backgroundColor: 'var(--theme-bg-main, #F8FAFC)',
      }}
      className="flex flex-col h-full overflow-hidden relative font-sans"
    >
      {/* 1. Gmail-Style Top Action Toolbar (48px) */}
      <div 
        style={{
          backgroundColor: 'var(--theme-bg-header, #FFFFFF)',
          borderColor: 'var(--theme-border, #E2E8F0)',
        }}
        className="h-12 px-3 sm:px-4 border-b flex items-center justify-between shrink-0 sticky top-0 z-20 select-none"
      >
        {/* Left Action Buttons */}
        <div className="flex items-center gap-1">
          {onClose && (
            <button 
              type="button"
              onClick={onClose} 
              className="p-2 rounded-full opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Back to list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          
          <div style={{ backgroundColor: 'var(--theme-border, #E2E8F0)' }} className="w-[1px] h-5 mx-1 hidden sm:block"></div>

          {isScheduledFolder && (
            <button
              type="button"
              onClick={() => onCancelScheduled?.(threadId)}
              className="px-3 py-1 mr-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors border shadow-xs"
              style={{
                backgroundColor: 'var(--theme-accent-bg, rgba(20, 184, 166, 0.1))',
                borderColor: 'var(--theme-accent, #14B8A6)',
                color: 'var(--theme-accent, #0F766E)',
              }}
              title="Cancel scheduled send and revert to drafts"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Cancel send</span>
            </button>
          )}

          {isArchiveFolder ? (
            <button 
              type="button" 
              onClick={() => onUnarchive?.(threadId)} 
              className="p-2 rounded-full opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" 
              title="Move to Inbox (Unarchive)"
            >
              <Mail className="w-4 h-4" />
            </button>
          ) : !isScheduledFolder && (
            <button 
              type="button" 
              onClick={() => onArchive?.(threadId)} 
              className="p-2 rounded-full opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" 
              title="Archive"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}

          {!isScheduledFolder && (
            <button 
              type="button"
              onClick={() => onSpam?.(threadId, true)} 
              className="p-2 rounded-full opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Report spam"
            >
              <AlertOctagon className="w-4 h-4" />
            </button>
          )}
          <button 
            type="button"
            onClick={() => onDelete?.(threadId)} 
            className="p-2 rounded-full opacity-60 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div style={{ backgroundColor: 'var(--theme-border, #E2E8F0)' }} className="w-[1px] h-5 mx-1 hidden sm:block"></div>

          <button 
            type="button"
            className="p-2 rounded-full opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors hidden sm:inline-flex"
            title="Mark as unread"
          >
            <Mail className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={() => onSnooze?.(threadId)} 
            className="p-2 rounded-full opacity-60 hover:text-amber-500 hover:bg-amber-500/10 transition-colors hidden sm:inline-flex"
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
            style={{
              color: 'var(--theme-accent, #0F766E)',
              backgroundColor: 'var(--theme-accent-bg, #F0FDFA)',
              borderColor: 'var(--theme-border, #CCFBF1)',
            }}
            className="px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-colors shadow-sm"
            title="Summarize with AI"
          >
            <Sparkles style={{ color: 'var(--theme-accent, #14B8A6)' }} className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSummarizing ? 'Summarizing...' : 'Summarize'}</span>
          </button>
          {onClose && (
            <button 
              type="button"
              onClick={onClose} 
              className="p-2 rounded-full opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Scrollable Body Area */}
      <div 
        style={{ backgroundColor: 'var(--theme-bg-main, #F8FAFC)' }}
        className="flex-1 overflow-y-auto custom-scrollbar relative"
      >
        {/* Subject Header with Category Badges & Print/Popout */}
        <div 
          style={{
            backgroundColor: 'var(--theme-bg-card, #FFFFFF)',
            borderColor: 'var(--theme-border, #E2E8F0)',
          }}
          className="px-6 sm:px-12 pt-6 pb-4 border-b flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {subject || '(No Subject)'}
            </h1>
            
            {/* Importance chevron and tag */}
            <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-bold">
              <span className="text-amber-500 font-mono text-sm">›</span>
            </span>

            <span 
              style={{
                backgroundColor: 'var(--theme-accent-bg, rgba(16, 185, 129, 0.15))',
                borderColor: 'var(--theme-border, #103F31)',
                color: 'var(--theme-accent, #10B981)',
              }}
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border font-semibold cursor-default select-none"
            >
              <span>{folderName || 'Inbox'}</span>
              <button
                type="button"
                onClick={() => {
                  if (isArchiveFolder) onUnarchive?.(threadId);
                  else onArchive?.(threadId);
                }}
                className="hover:opacity-100 opacity-70 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                title={isArchiveFolder ? "Move to Inbox" : "Archive"}
              >
                <X className="w-3 h-3" />
              </button>
            </span>

            {labels.filter(l => l.toLowerCase() !== (folderName || 'inbox').toLowerCase()).map(l => (
              <span 
                key={l} 
                style={{
                  backgroundColor: 'var(--theme-accent-bg, rgba(16, 185, 129, 0.15))',
                  borderColor: 'var(--theme-border, #103F31)',
                  color: 'var(--theme-accent, #10B981)',
                }}
                className="text-[11px] px-2.5 py-0.5 rounded-full border font-semibold select-none"
              >
                {l}
              </span>
            ))}
          </div>

          {/* Right Subject Actions (Print, Popout) */}
          <div className="flex items-center gap-1 opacity-60">
            <button 
              type="button"
              onClick={() => window.print()}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 hover:opacity-100 transition-colors"
              title="Print all"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={() => {
                window.open(`/mail/popout/${threadId}`, '_blank', 'width=1000,height=850,resizable=yes,scrollbars=yes');
              }}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 hover:opacity-100 transition-colors"
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
              className="p-3.5 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-xs text-[#0F766E] font-medium leading-relaxed flex items-start gap-2.5 animate-in fade-in"
            >
              <Sparkles className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
              <span>{aiSummary}</span>
            </div>
          </div>
        )}

        {/* 3. Messages in Thread */}
        <div className="px-4 sm:px-10 py-6 space-y-4">
          {messages.map((msg) => {
            const isExpanded = expandedMessageIds.has(msg.id);
            const isDetailsOpen = activeDetailsId === msg.id;
            const isMoreOpen = activeMoreMenuId === msg.id;

            return (
              <div 
                key={msg.id} 
                style={{
                  backgroundColor: 'var(--theme-bg-card, #FFFFFF)',
                  borderColor: 'var(--theme-border, #E2E8F0)',
                }}
                className="border rounded-2xl p-4 shadow-sm transition-all"
              >
                {/* Message Header */}
                <div 
                  onClick={() => handleToggleExpand(msg.id)} 
                  className="flex items-start justify-between gap-3 select-none cursor-pointer"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Avatar */}
                    <div 
                      style={{ background: 'linear-gradient(135deg, var(--theme-accent, #14B8A6), #0E172A)' }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm mt-0.5 select-none"
                    >
                      {msg.from.name ? msg.from.name.slice(0, 2).toUpperCase() : (msg.from.email?.slice(0, 2).toUpperCase() || 'U')}
                    </div>

                    <div className="min-w-0">
                      {/* Line 1: Sender Name & Verified Check & Email */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-sm">{msg.from.name || msg.from.email}</span>
                        <BadgeCheck style={{ color: 'var(--theme-accent, #14B8A6)' }} className="w-4 h-4 shrink-0" />
                        <span className="text-xs opacity-60 font-normal">&lt;{msg.from.email}&gt;</span>
                        {(() => {
                          const lowerEmail = (msg.from.email || '').toLowerCase();
                          if (lowerEmail.startsWith('no-reply@') || lowerEmail.startsWith('noreply@')) {
                            return (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                System Generated (No-Reply)
                              </span>
                            );
                          }
                          if (lowerEmail.startsWith('support@') || lowerEmail.startsWith('billing@')) {
                            return (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                Automated Mailbox
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      {/* Line 2: to me dropdown toggle */}
                      <div className="relative mt-0.5">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDetailsId(isDetailsOpen ? null : msg.id);
                          }}
                          className="text-[12px] opacity-60 hover:opacity-100 flex items-center gap-1 py-0.5 rounded transition-colors"
                        >
                          <span>to {msg.to.map(t => t.name || t.email).join(', ') || 'me'}</span>
                          <ChevronDown className="w-3 h-3 opacity-60" />
                        </button>

                        {/* Details Card */}
                        {isDetailsOpen && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              backgroundColor: 'var(--theme-bg-card, #FFFFFF)',
                              borderColor: 'var(--theme-border, #E2E8F0)',
                            }}
                            className="absolute left-0 top-full mt-2 p-4 rounded-xl border shadow-xl z-30 w-84 text-xs space-y-2 animate-in fade-in zoom-in-95"
                          >
                            <div className="flex justify-between"><span className="opacity-60 font-medium">from:</span><span className="font-semibold">{msg.from.name ? `${msg.from.name} <${msg.from.email}>` : msg.from.email}</span></div>
                            <div className="flex justify-between"><span className="opacity-60 font-medium">to:</span><span>{msg.to.map(t => t.email || t.name).join(', ')}</span></div>
                            <div className="flex justify-between"><span className="opacity-60 font-medium">date:</span><span>{msg.receivedAt}</span></div>
                            <div className="flex justify-between"><span className="opacity-60 font-medium">subject:</span><span className="font-medium">{subject}</span></div>
                            <div className="flex justify-between"><span className="opacity-60 font-medium">mailed-by:</span><span className="font-mono text-[11px]">{msg.from.email.split('@')[1] || 'eazzio.com'}</span></div>
                            <div style={{ borderColor: 'var(--theme-border, #E2E8F0)' }} className="pt-2 border-t flex items-center justify-between text-[11px]">
                              <span className="opacity-60 font-medium">security:</span>
                              <span style={{ color: 'var(--theme-accent, #0F766E)' }} className="flex items-center gap-1 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Standard encryption (TLS)</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Snippet if collapsed */}
                      {!isExpanded && (
                        <p className="text-xs opacity-60 truncate max-w-lg mt-1">{msg.snippet}</p>
                      )}
                    </div>
                  </div>

                  {/* Header Right Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-70 select-none">
                    <span className="text-xs mr-1">{msg.receivedAt}</span>
                    
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar?.(threadId);
                      }}
                      className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 hover:text-amber-500 transition-colors"
                      title="Star message"
                    >
                      <Star className={`w-4 h-4 ${msg.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    {(() => {
                      const msgFromEmail = (msg.from?.email || '').toLowerCase();
                      const isMsgNoReply = msgFromEmail.startsWith('no-reply@') || msgFromEmail.startsWith('noreply@');
                      if (isMsgNoReply) return null;

                      return (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartReply('reply', '👍');
                          }}
                          className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 hover:opacity-100 transition-colors"
                          title="Add reaction"
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                      );
                    })()}

                    {(() => {
                      const msgFromEmail = (msg.from?.email || '').toLowerCase();
                      const isMsgNoReply = msgFromEmail.startsWith('no-reply@') || msgFromEmail.startsWith('noreply@');
                      if (isMsgNoReply) return null;

                      return (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartReply('reply');
                          }}
                          className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 hover:opacity-100 transition-colors"
                          title="Reply"
                        >
                          <Reply className="w-4 h-4" />
                        </button>
                      );
                    })()}

                    <div className="relative">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMoreMenuId(isMoreOpen ? null : msg.id);
                        }}
                        className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 hover:opacity-100 transition-colors"
                        title="More options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMoreOpen && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            backgroundColor: 'var(--theme-bg-card, #FFFFFF)',
                            borderColor: 'var(--theme-border, #E2E8F0)',
                          }}
                          className="absolute right-0 top-full mt-2 w-44 rounded-xl border shadow-xl py-1 z-30 animate-in fade-in zoom-in-95"
                        >
                          {(() => {
                            const msgFromEmail = (msg.from?.email || '').toLowerCase();
                            const isMsgNoReply = msgFromEmail.startsWith('no-reply@') || msgFromEmail.startsWith('noreply@');
                            if (isMsgNoReply) return null;

                            return (
                              <button 
                                type="button"
                                onClick={() => { handleStartReply('reply'); setActiveMoreMenuId(null); }}
                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                              >
                                <Reply className="w-3.5 h-3.5" /> Reply
                              </button>
                            );
                          })()}
                          <button 
                            type="button"
                            onClick={() => { handleStartReply('forward'); setActiveMoreMenuId(null); }}
                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                          >
                            <Forward className="w-3.5 h-3.5" /> Forward
                          </button>
                          <button 
                            type="button"
                            onClick={() => { window.print(); setActiveMoreMenuId(null); }}
                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                          >
                            <Printer className="w-3.5 h-3.5" /> Print
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              const emlContent = `From: ${msg.from.name || ''} <${msg.from.email}>\nTo: ${msg.to.map(t => t.email).join(', ')}\nSubject: ${msg.subject}\nDate: ${msg.receivedAt}\nMIME-Version: 1.0\nContent-Type: text/html; charset=utf-8\n\n${msg.bodyHtml || msg.bodyText || msg.snippet}`;
                              const blob = new Blob([emlContent], { type: 'message/rfc822' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${msg.subject.replace(/[^a-zA-Z0-9_-]/g, '_') || 'message'}.eml`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                              setActiveMoreMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                          >
                            <FileDown className="w-3.5 h-3.5" /> Export as .eml
                          </button>
                          <button 
                            type="button"
                            onClick={() => { onDelete?.(threadId); setActiveMoreMenuId(null); }}
                            className="w-full px-3 py-1.5 text-left text-xs text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 border-t border-black/5 dark:border-white/5 mt-1"
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
                  <div className="pl-12 sm:pl-12.5 pr-2 pt-3 animate-in fade-in duration-200">
                    {/* SEC-007 Scam & Phishing Detection Warning Banner */}
                    {msg.security?.threatAnalysis && msg.security.threatAnalysis.severity !== 'clean' && (
                      <div className={`mb-4 p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
                        msg.security.threatAnalysis.severity === 'dangerous'
                          ? 'bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
                          : 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                            msg.security.threatAnalysis.severity === 'dangerous' ? 'bg-rose-600' : 'bg-amber-500'
                          }`}>
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold flex items-center gap-1.5">
                              <span>
                                {msg.security.threatAnalysis.severity === 'dangerous'
                                  ? 'Warning: Suspicious Phishing or Scam Email Detected'
                                  : 'Caution: Unverified Sender Activity'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-black/10 dark:bg-white/10">
                                Score {Math.round(msg.security.threatAnalysis.score * 100)}%
                              </span>
                            </div>
                            <div className="text-[11px] opacity-80 mt-0.5 space-y-0.5 font-medium">
                              {msg.security.threatAnalysis.warnings.map((w, idx) => (
                                <div key={idx}>• {w}</div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => onSpam?.(threadId, true)}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1"
                          >
                            <AlertOctagon className="w-3.5 h-3.5" />
                            <span>Report Phishing</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => alert('Message verified as safe. Security flag cleared.')}
                            className="px-3 py-1.5 rounded-xl border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-xs transition-all"
                          >
                            Mark Safe
                          </button>
                        </div>
                      </div>
                    )}

                    {/* INT-001 Calendar Invitation / RSVP Detection Card */}
                    {(msg.bodyText?.includes('BEGIN:VCALENDAR') || 
                      msg.bodyHtml?.includes('BEGIN:VCALENDAR') || 
                      msg.subject.toLowerCase().includes('invitation:') ||
                      msg.attachments?.some(a => a.filename.endsWith('.ics') || a.contentType.includes('calendar'))) && (
                      <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-teal-500/10 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-sm shrink-0">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#0F172A] dark:text-white">Calendar Event Invitation</div>
                            <div className="text-[11px] text-slate-500 font-medium">Invitation from {msg.from.name || msg.from.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => alert('Response recorded: Yes, attending.')}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => alert('Response recorded: Maybe attending.')}
                            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs"
                          >
                            Maybe
                          </button>
                          <button
                            type="button"
                            onClick={() => alert('Response recorded: Declined.')}
                            className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    )}
                    <TrimmedMessageContent bodyHtml={msg.bodyHtml} bodyText={msg.bodyText} snippet={msg.snippet} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 4. Bottom Action Area (Smart Reply Pills & Inline Reply Card) */}
        <div className="px-4 sm:px-10 pb-12">
          {/* Smart Reply Pill Suggestions */}
          {!isReplying && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {['Got it, thanks!', 'Looks good to me.', 'I will review this today.', 'Could you provide more details?'].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleStartReply('reply', suggestion)}
                  style={{
                    backgroundColor: 'var(--theme-bg-card, #071F17)',
                    borderColor: 'var(--theme-border, #103F31)',
                    color: 'var(--theme-text-primary, #EDEEF0)',
                  }}
                  className="px-4 py-1.5 rounded-full border text-xs font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Sparkles style={{ color: 'var(--theme-accent, #10B981)' }} className="w-3.5 h-3.5" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          {/* Collapsed State: Reply & Forward Pills */}
          {!isReplying ? (
            <div className="flex items-center gap-3">
              {(() => {
                const latestFromEmail = (latestMessage?.from?.email || '').toLowerCase();
                const isNoReply = latestFromEmail.startsWith('no-reply@') || latestFromEmail.startsWith('noreply@');

                if (isNoReply) {
                  return (
                    <div className="flex items-center gap-2 p-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs border border-slate-200 dark:border-slate-700">
                      <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>This is an unmonitored automated address. Direct replies are disabled.</span>
                    </div>
                  );
                }

                return (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStartReply('reply')}
                      style={{
                        backgroundColor: 'var(--theme-bg-card, #071F17)',
                        borderColor: 'var(--theme-border, #103F31)',
                        color: 'var(--theme-text-primary, #EDEEF0)',
                      }}
                      className="px-5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all shadow-sm hover:opacity-90"
                    >
                      <Reply style={{ color: 'var(--theme-accent, #10B981)' }} className="w-4 h-4" />
                      <span>Reply</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartReply('forward')}
                      style={{
                        backgroundColor: 'var(--theme-bg-card, #071F17)',
                        borderColor: 'var(--theme-border, #103F31)',
                        color: 'var(--theme-text-primary, #EDEEF0)',
                      }}
                      className="px-5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all shadow-sm hover:opacity-90"
                    >
                      <Forward style={{ color: 'var(--theme-accent, #10B981)' }} className="w-4 h-4" />
                      <span>Forward</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartReply('reply', '😀')}
                      style={{
                        backgroundColor: 'var(--theme-bg-card, #071F17)',
                        borderColor: 'var(--theme-border, #103F31)',
                        color: 'var(--theme-text-primary, #EDEEF0)',
                      }}
                      className="p-2.5 rounded-xl border opacity-80 hover:opacity-100 transition-all shadow-sm"
                      title="Add reaction"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                  </>
                );
              })()}
            </div>
          ) : (
            /* Inline Reply Box */
            <div
              style={{
                backgroundColor: 'var(--theme-bg-card, #FFFFFF)',
                borderColor: 'var(--theme-border, #CBD5E1)',
              }}
              className="rounded-2xl border shadow-xl overflow-hidden animate-in fade-in duration-200"
            >
              {/* Header */}
              <div
                style={{
                  backgroundColor: 'var(--theme-bg-header, #F8FAFC)',
                  borderColor: 'var(--theme-border, #E2E8F0)',
                }}
                className="px-4 py-2.5 border-b flex items-center justify-between text-xs select-none"
              >
                <div className="flex items-center gap-2">
                  {replyMode === 'forward' ? (
                    <Forward style={{ color: 'var(--theme-accent, #14B8A6)' }} className="w-4 h-4" />
                  ) : (
                    <Reply style={{ color: 'var(--theme-accent, #14B8A6)' }} className="w-4 h-4" />
                  )}
                  <span className="font-semibold opacity-60">
                    {replyMode === 'forward' ? 'Forwarding to:' : 'Replying to:'}
                  </span>
                  <span className="font-semibold">
                    {replyMode === 'forward' ? 'Select recipient...' : (latestMessage?.from?.name || latestMessage?.from?.email || 'Sender')}
                  </span>
                  {replyMode !== 'forward' && (
                    <span className="opacity-60">&lt;{latestMessage?.from?.email}&gt;</span>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-60">
                  <button
                    type="button"
                    onClick={() => {
                      if (latestMessage) {
                        if (replyMode === 'forward') onForward?.(latestMessage);
                        else onReply?.(latestMessage);
                        setIsReplying(false);
                      }
                    }}
                    className="p-1 rounded hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
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
                    className="p-1 rounded hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
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
                  style={{ color: 'var(--theme-text-primary, inherit)' }}
                  className="w-full bg-transparent text-sm placeholder:opacity-50 outline-none resize-none leading-relaxed font-sans"
                />

                {/* Trimmed Original Message inside Inline Reply */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuotedInReply(!showQuotedInReply)}
                    style={{
                      backgroundColor: 'var(--theme-bg-main, #F1F5F9)',
                      borderColor: 'var(--theme-border, #CBD5E1)',
                    }}
                    className="px-2.5 py-0.5 rounded-full border opacity-70 hover:opacity-100 text-xs font-mono font-bold tracking-widest transition-all inline-flex items-center gap-1 shadow-sm select-none"
                    title="Toggle original message"
                  >
                    •••
                  </button>

                  {showQuotedInReply && (
                    <div 
                      style={{ borderColor: 'var(--theme-border, #CBD5E1)' }}
                      className="mt-3 pl-3.5 border-l-2 text-xs opacity-70 leading-relaxed animate-in fade-in font-sans"
                    >
                      <div className="font-semibold opacity-90 mb-1">
                        On {latestMessage?.receivedAt}, {latestMessage?.from?.name || latestMessage?.from?.email} wrote:
                      </div>
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: sanitizeEmailHtml(latestMessage?.bodyHtml || `<p>${latestMessage?.bodyText || latestMessage?.snippet || ''}</p>`)
                        }} 
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div
                style={{
                  backgroundColor: 'var(--theme-bg-header, #F8FAFC)',
                  borderColor: 'var(--theme-border, #E2E8F0)',
                }}
                className="p-3 border-t flex items-center justify-between"
              >
                {/* Left Formats */}
                <div className="flex items-center gap-1 opacity-60">
                  <button
                    type="button"
                    onClick={handleSendInlineReply}
                    disabled={!replyText.trim()}
                    style={{
                      backgroundColor: 'var(--theme-accent, #14B8A6)',
                    }}
                    className="px-5 py-2 rounded-xl text-white font-semibold text-xs flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm mr-2 hover:brightness-95"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setIsFormattingOpen(!isFormattingOpen)} 
                    className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                      isFormattingOpen ? 'bg-[#F0FDFA] text-[#0F766E]' : 'hover:text-[#0F172A] hover:bg-[#E2E8F0]'
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
                    className="p-1.5 rounded hover:text-[#0F172A] hover:bg-[#E2E8F0]" 
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
                    className="p-1.5 rounded hover:text-[#0F172A] hover:bg-[#E2E8F0]" 
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
                  className="p-2 rounded-lg text-[#64748B] hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
