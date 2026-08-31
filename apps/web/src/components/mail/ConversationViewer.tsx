'use client';

import React, { useState } from 'react';
import {
  Star, Trash2, Archive, Mail, Reply, Forward, ShieldCheck, ShieldAlert, 
  Paperclip, Download, Sparkles, ChevronDown, ChevronUp, Send, X, FileText, 
  Printer, ExternalLink, Smile, ArrowLeft, Clock, AlertOctagon, 
  MoreVertical, CheckCircle2, AlertTriangle, EyeOff, Tag, MoveRight,
  Bold, Italic, Underline, Link as LinkIcon, Image as ImageIcon
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
          <div className="text-[14px] text-slate-200 leading-relaxed prose prose-invert max-w-none [&_a]:text-[#2D5BFF] [&_a]:underline" dangerouslySetInnerHTML={{ __html: primaryHtml }} />
          <div>
            <button 
              type="button"
              onClick={() => setShowQuoted(!showQuoted)} 
              className="px-2.5 py-0.5 rounded bg-[#1E232B] hover:bg-[#2A313C] text-slate-400 hover:text-white text-xs font-bold tracking-widest transition-colors inline-flex items-center gap-1.5"
              title="Toggle quoted text"
            >
              •••
            </button>
            {showQuoted && (
              <div className="mt-3 pl-3 border-l-2 border-[#2A313C] text-xs text-slate-400 leading-relaxed prose prose-invert max-w-none [&_a]:text-[#2D5BFF] animate-in fade-in slide-in-from-top-2" dangerouslySetInnerHTML={{ __html: quotedHtml }} />
            )}
          </div>
        </div>
      );
    }
    return <div className="text-[14px] text-slate-200 leading-relaxed font-sans prose prose-invert max-w-none [&_a]:text-[#2D5BFF] [&_a]:underline" dangerouslySetInnerHTML={{ __html: bodyHtml }} />;
  }

  const rawText = bodyText || snippet || '(No content)';
  const quoteRegex = /(?:(?:\r?\n|^|\s)(?:On\s+[A-Za-z]+,\s+[A-Za-z]+\s+\d+.*?(?:wrote|wrote:)|On\s+[A-Za-z]{3}\s+\d{1,2}.*?wrote:|-----Original Message-----|---------- Forwarded message ---------|>[\s\S]*))/i;
  const match = rawText.match(quoteRegex);

  if (match && match.index !== undefined && match.index > 0) {
    const primaryText = rawText.slice(0, match.index).trim();
    const quotedText = rawText.slice(match.index).trim();
    return (
      <div className="space-y-3 font-sans">
        <div className="text-[14px] text-slate-200 leading-relaxed whitespace-pre-wrap">{primaryText || '(No text content)'}</div>
        <div>
          <button 
            type="button"
            onClick={() => setShowQuoted(!showQuoted)} 
            className="px-2.5 py-0.5 rounded bg-[#1E232B] hover:bg-[#2A313C] text-slate-400 hover:text-white text-xs font-bold tracking-widest transition-colors inline-flex items-center gap-1.5"
            title="Toggle quoted text"
          >
            •••
          </button>
          {showQuoted && (
            <div className="mt-3 pl-3 border-l-2 border-[#2A313C] text-xs text-slate-400 leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-top-2">{quotedText}</div>
          )}
        </div>
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
  const [activeDetailsId, setActiveDetailsId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const handleToggleExpand = (id: string) => {
    const next = new Set(expandedMessageIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedMessageIds(next);
  };

  const handleGenerateAiSummary = () => {
    setIsSummarizing(true);
    setTimeout(() => {
      setAiSummary(`✨ AI Summary: This thread contains discussion regarding system verification and message delivery. Key points: Confirmation of outbound routing to internal and external recipients.`);
      setIsSummarizing(false);
    }, 600);
  };

  const latestMessage = messages[messages.length - 1];

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
              onClick={onClose} 
              className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Back to list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          
          <div style={{ backgroundColor: 'var(--theme-border, #1E232B)' }} className="w-[1px] h-5 mx-1 hidden sm:block"></div>

          <button 
            onClick={() => onArchive?.(threadId)} 
            className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Archive"
          >
            <Archive className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onSpam?.(threadId, true)} 
            className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Report spam"
          >
            <AlertOctagon className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete?.(threadId)} 
            className="p-2 rounded-full text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div style={{ backgroundColor: 'var(--theme-border, #1E232B)' }} className="w-[1px] h-5 mx-1 hidden sm:block"></div>

          <button 
            className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors hidden sm:inline-flex"
            title="Mark as unread"
          >
            <Mail className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onSnooze?.(threadId)} 
            className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors hidden sm:inline-flex"
            title="Snooze"
          >
            <Clock className="w-4 h-4" />
          </button>
          <button 
            className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors hidden md:inline-flex"
            title="Labels"
          >
            <Tag className="w-4 h-4" />
          </button>
        </div>

        {/* Right Utilities */}
        <div className="flex items-center gap-1">
          <button 
            onClick={handleGenerateAiSummary} 
            disabled={isSummarizing}
            className="px-2.5 py-1 rounded-md text-xs font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 flex items-center gap-1.5 transition-colors"
            title="Summarize with AI"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSummarizing ? 'Summarizing...' : 'Summarize'}</span>
          </button>
          <button 
            onClick={() => window.print()} 
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Print all"
          >
            <Printer className="w-4 h-4" />
          </button>
          {onClose && (
            <button 
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
        {/* Subject Header */}
        <div className="px-6 sm:px-12 pt-5 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl text-slate-100 font-normal tracking-tight">
              {subject || '(No Subject)'}
            </h1>
            {folderName && (
              <span 
                style={{ backgroundColor: 'var(--theme-bg-card, #1E232B)', borderColor: 'var(--theme-border, #2A313C)' }}
                className="text-[11px] px-2 py-0.5 rounded uppercase font-semibold text-slate-400 border tracking-wider"
              >
                {folderName}
              </span>
            )}
            {labels.map(l => (
              <span key={l} className="text-[11px] px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-300 font-semibold">
                {l}
              </span>
            ))}
          </div>

          {/* AI Summary Banner if generated */}
          {aiSummary && (
            <div 
              style={{ borderColor: 'var(--theme-accent, #2D5BFF)' }}
              className="mt-3 p-3.5 rounded-xl bg-purple-500/10 border text-xs text-slate-200 leading-relaxed flex items-start gap-2.5 animate-in fade-in"
            >
              <Sparkles style={{ color: 'var(--theme-accent, #2D5BFF)' }} className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{aiSummary}</span>
            </div>
          )}
        </div>

        {/* 3. Messages in Thread */}
        <div className="px-4 sm:px-10 pb-6 space-y-4">
          {messages.map((msg, index) => {
            const isExpanded = expandedMessageIds.has(msg.id);
            const isDetailsOpen = activeDetailsId === msg.id;

            return (
              <div 
                key={msg.id} 
                style={{
                  backgroundColor: isExpanded ? 'var(--theme-bg-card, #12141A)' : 'transparent',
                  borderColor: 'var(--theme-border, #1E232B)',
                }}
                className={`rounded-2xl border transition-all ${
                  isExpanded ? 'shadow-md' : 'hover:bg-white/[0.02] cursor-pointer'
                }`}
              >
                {/* Message Header */}
                <div 
                  onClick={() => handleToggleExpand(msg.id)} 
                  className="p-4 sm:p-5 flex items-start justify-between gap-3 select-none cursor-pointer"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Avatar */}
                    <div 
                      style={{ background: `linear-gradient(135deg, var(--theme-accent, #2D5BFF), #14B8A6)` }}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm mt-0.5"
                    >
                      {msg.from.name ? msg.from.name.slice(0, 2).toUpperCase() : 'U'}
                    </div>

                    <div className="min-w-0">
                      {/* Line 1: Sender Name & Email */}
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="font-bold text-sm text-white">{msg.from.name || msg.from.email}</span>
                        <span className="text-xs text-slate-400">&lt;{msg.from.email}&gt;</span>
                      </div>

                      {/* Line 2: to me dropdown toggle */}
                      <div className="relative mt-0.5">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDetailsId(isDetailsOpen ? null : msg.id);
                          }}
                          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 py-0.5 rounded transition-colors"
                        >
                          <span>to {msg.to.map(t => t.name || t.email).join(', ')}</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>

                        {/* Dropdown Details Card */}
                        {isDetailsOpen && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            style={{ backgroundColor: 'var(--theme-bg-sidebar, #090A0D)', borderColor: 'var(--theme-border, #2A313C)' }}
                            className="absolute left-0 top-full mt-2 p-3.5 rounded-xl border shadow-2xl z-30 w-72 text-xs space-y-2 animate-in fade-in zoom-in-95"
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

                      {/* Snippet if collapsed */}
                      {!isExpanded && (
                        <p className="text-xs text-slate-400 truncate max-w-lg mt-1">{msg.snippet}</p>
                      )}
                    </div>
                  </div>

                  {/* Header Right Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400">{msg.receivedAt}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar?.(threadId);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-amber-400 transition-colors"
                      title="Star message"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsReplying(true);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                      title="Reply"
                    >
                      <Reply className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleExpand(msg.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Message Body */}
                {isExpanded && (
                  <div className="px-5 sm:px-14 pb-6 pt-1 animate-in fade-in duration-200">
                    <TrimmedMessageContent bodyHtml={msg.bodyHtml} bodyText={msg.bodyText} snippet={msg.snippet} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 4. Bottom Action Area (Gmail Standard) */}
        <div className="px-4 sm:px-10 pb-8">
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
                  className="px-3.5 py-1.5 rounded-full border text-xs font-medium text-slate-300 hover:text-white hover:border-white/30 hover:scale-[1.02] active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Sparkles style={{ color: 'var(--theme-accent, #2D5BFF)' }} className="w-3 h-3 opacity-80" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          {/* Collapsed State: Reply & Forward Action Buttons */}
          {!isReplying && !replyText ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsReplying(true)}
                style={{
                  backgroundColor: 'var(--theme-bg-card, #12141A)',
                  borderColor: 'var(--theme-border, #1E232B)',
                }}
                className="px-6 py-2 rounded-full border text-slate-300 hover:text-white hover:border-white/30 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm hover:brightness-110"
              >
                <Reply className="w-3.5 h-3.5 text-slate-400" />
                <span>Reply</span>
              </button>
              <button
                onClick={() => {
                  if (latestMessage) onForward?.(latestMessage);
                }}
                style={{
                  backgroundColor: 'var(--theme-bg-card, #12141A)',
                  borderColor: 'var(--theme-border, #1E232B)',
                }}
                className="px-6 py-2 rounded-full border text-slate-300 hover:text-white hover:border-white/30 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm hover:brightness-110"
              >
                <Forward className="w-3.5 h-3.5 text-slate-400" />
                <span>Forward</span>
              </button>
            </div>
          ) : (
            /* Expanded State: Inline Rich Composer */
            <div
              style={{
                backgroundColor: 'var(--theme-bg-card, #12141A)',
                borderColor: 'var(--theme-border, #1E232B)',
              }}
              className="rounded-2xl border shadow-xl overflow-hidden animate-in fade-in duration-200"
            >
              {/* Header */}
              <div
                style={{
                  backgroundColor: 'var(--theme-bg-sidebar, #090A0D)',
                  borderColor: 'var(--theme-border, #1E232B)',
                }}
                className="px-4 py-2 border-b flex items-center justify-between text-xs"
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
                rows={5}
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
                {/* Left Formats */}
                <div className="flex items-center gap-1 text-slate-400">
                  <button type="button" className="p-1.5 rounded hover:text-white hover:bg-white/10" title="Bold">
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1.5 rounded hover:text-white hover:bg-white/10" title="Italic">
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1.5 rounded hover:text-white hover:bg-white/10" title="Underline">
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <div style={{ backgroundColor: 'var(--theme-border, #1E232B)' }} className="w-[1px] h-4 mx-1"></div>
                  <button type="button" className="p-1.5 rounded hover:text-white hover:bg-white/10" title="Attach file">
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1.5 rounded hover:text-white hover:bg-white/10" title="Insert link">
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1.5 rounded hover:text-white hover:bg-white/10" title="Insert emoji">
                    <Smile className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyText('');
                      setIsReplying(false);
                    }}
                    className="p-1.5 rounded hover:text-rose-400 hover:bg-rose-500/10 ml-2"
                    title="Discard draft"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Right Send */}
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
                    className="px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-lg hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
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
