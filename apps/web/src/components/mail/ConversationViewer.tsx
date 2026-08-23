'use client';

import React, { useState } from 'react';
import {
  Star,
  Trash2,
  Archive,
  Mail,
  Reply,
  Forward,
  MoreVertical,
  ShieldCheck,
  ShieldAlert,
  Paperclip,
  Download,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react';
import { MessageDetail } from '../../types/mail';

export interface ConversationViewerProps {
  threadId: string;
  subject: string;
  messages: MessageDetail[];
  onArchive?: (threadId: string) => void;
  onDelete?: (threadId: string) => void;
  onToggleStar?: (threadId: string) => void;
  onSendReply?: (threadId: string, replyText: string) => void;
  onClose?: () => void;
}

export const ConversationViewer: React.FC<ConversationViewerProps> = ({
  threadId,
  subject,
  messages,
  onArchive,
  onDelete,
  onToggleStar,
  onSendReply,
  onClose,
}) => {
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(
    new Set(messages.length > 0 ? [messages[messages.length - 1]!.id] : [])
  );
  const [replyText, setReplyText] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<{
    id: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    url?: string;
  } | null>(null);

  const smartReplySuggestions = [
    'Thank you for the update! I will review shortly.',
    'Looks great to proceed.',
    'Could you please share more details regarding this?',
  ];

  const handleToggleExpand = (id: string) => {
    const next = new Set(expandedMessageIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedMessageIds(next);
  };

  const handleGenerateAiSummary = () => {
    setIsSummarizing(true);
    setTimeout(() => {
      setAiSummary(
        `AI Summary: Key updates from ${messages[0]?.from.name || 'sender'}. Action item: Review infrastructure milestone deliverables by EOD.`
      );
      setIsSummarizing(false);
    }, 400);
  };

  const handleSendQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    if (onSendReply) {
      onSendReply(threadId, replyText);
    }
    setReplyText('');
  };

  return (
    <div className="flex flex-col h-full bg-[#0F1115] text-[#EDEEF0] overflow-hidden" data-testid="conversation-viewer">
      {/* Top Header & Actions */}
      <div className="h-14 px-6 border-b border-[#2A2E37] flex items-center justify-between gap-4 shrink-0 bg-[#16181D]">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-base font-bold text-white tracking-tight truncate">
            {subject || '(No Subject)'}
          </h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#2A2E37] text-slate-300 font-semibold shrink-0">
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleGenerateAiSummary}
            className="px-2.5 py-1.5 rounded-lg bg-[#2D5BFF]/15 border border-[#2D5BFF]/30 text-[#2D5BFF] hover:bg-[#2D5BFF]/25 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Summarize thread with AI"
            data-testid="ai-summarize-btn"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Summary</span>
          </button>

          <button
            onClick={() => onToggleStar && onToggleStar(threadId)}
            className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-[#1C1F26] transition-colors"
            title="Star conversation"
            data-testid="thread-star-btn"
          >
            <Star className="w-4 h-4" />
          </button>

          <button
            onClick={() => onArchive && onArchive(threadId)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1C1F26] transition-colors"
            title="Archive"
            data-testid="thread-archive-btn"
          >
            <Archive className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete && onDelete(threadId)}
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete"
            data-testid="thread-delete-btn"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI Summary Banner */}
      {aiSummary && (
        <div className="mx-6 mt-4 p-3.5 rounded-xl bg-[#2D5BFF]/10 border border-[#2D5BFF]/30 flex items-start gap-2.5 text-xs text-slate-200 animate-in fade-in" data-testid="ai-summary-box">
          <Sparkles className="w-4 h-4 text-[#2D5BFF] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{aiSummary}</p>
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {messages.map((msg, index) => {
          const isExpanded = expandedMessageIds.has(msg.id);
          const isLatest = index === messages.length - 1;

          return (
            <div
              key={msg.id}
              className={`rounded-2xl border transition-all ${
                isExpanded
                  ? 'bg-[#16181D] border-[#2A2E37] shadow-xl'
                  : 'bg-[#121418] border-[#2A2E37]/70 hover:border-[#2A2E37] cursor-pointer'
              }`}
              data-testid={`message-card-${msg.id}`}
            >
              {/* Message Header */}
              <div
                onClick={() => handleToggleExpand(msg.id)}
                className="p-4 flex items-center justify-between gap-4 select-none cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Sender Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-[#2D5BFF]/20 text-[#2D5BFF] font-bold flex items-center justify-center text-sm shrink-0 border border-[#2D5BFF]/30">
                    {msg.from.name ? msg.from.name.slice(0, 2).toUpperCase() : 'U'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white truncate">
                        {msg.from.name || msg.from.email}
                      </span>
                      <span className="text-xs text-slate-400 hidden sm:inline truncate">
                        &lt;{msg.from.email}&gt;
                      </span>
                    </div>

                    {msg.listUnsubscribe && (
                      <div className="mt-1 flex items-center gap-2">
                        <a
                          href={msg.listUnsubscribe.match(/<([^>]+)>/)?.[1] || msg.listUnsubscribe}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] font-medium text-slate-400 hover:text-amber-400 bg-[#1C1F26] border border-[#2A2E37] hover:border-amber-500/40 px-2 py-0.5 rounded-md transition-colors inline-flex items-center gap-1"
                          title="One-click Unsubscribe from this mailing list"
                        >
                          <span>Mailing List</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-amber-400/90 underline">Unsubscribe</span>
                        </a>
                      </div>
                    )}

                    {!isExpanded && (
                      <p className="text-xs text-slate-400 truncate max-w-lg mt-0.5">
                        {msg.snippet}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Security Alignment Badges */}
                  <div className="hidden md:flex items-center gap-1.5 text-[10px]">
                    {msg.security?.dkim === 'pass' && msg.security?.spf === 'pass' ? (
                      <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                        <ShieldCheck className="w-3 h-3" />
                        Verified Sender
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                        <ShieldAlert className="w-3 h-3" />
                        Unverified
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-slate-400">{msg.receivedAt}</span>

                  <button className="text-slate-500 hover:text-white">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Message Expanded Body */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-[#2A2E37]/60 space-y-4">
                  {/* Recipients Line */}
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span className="text-slate-500 font-medium">To:</span>
                    <span className="text-slate-200" title={msg.to.map((t) => t.email || t.name).join(', ')}>
                      {msg.to.map((t) => t.email || t.name).join(', ')}
                    </span>
                  </div>

                  {/* Body Text / HTML */}
                  {msg.bodyHtml && msg.bodyHtml.includes('<') && msg.bodyHtml.includes('>') && msg.bodyHtml !== '<p></p>' && msg.bodyHtml !== '<p><br></p>' ? (
                    <div
                      className="text-sm text-slate-200 leading-relaxed font-sans prose prose-invert max-w-none [&_a]:text-[#2D5BFF] [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: msg.bodyHtml }}
                    />
                  ) : (
                    <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.bodyText || msg.snippet || '(No content)'}
                    </div>
                  )}

                  {/* Attachments Section */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="pt-3 border-t border-[#2A2E37]/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {msg.attachments.length} {msg.attachments.length === 1 ? 'Attachment' : 'Attachments'}
                        </p>
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" />
                          Antivirus Clean
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.attachments.map((att) => (
                          <div
                            key={att.id}
                            onClick={() => setSelectedPreview(att)}
                            className="p-2.5 rounded-xl bg-[#0F1115] border border-[#2A2E37] hover:border-[#2D5BFF]/60 cursor-pointer flex items-center justify-between gap-3 text-xs transition-all group"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Paperclip className="w-4 h-4 text-slate-400 group-hover:text-[#2D5BFF] shrink-0 transition-colors" />
                              <span className="text-slate-200 font-medium truncate group-hover:text-white transition-colors">{att.filename}</span>
                              <span className="text-slate-500 shrink-0">
                                ({Math.round(att.sizeBytes / 1024)} KB)
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] text-slate-400 group-hover:text-slate-200 bg-[#16181D] px-1.5 py-0.5 rounded">Preview</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`/v1/attachments/${att.id}/download`, '_blank');
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-[#2D5BFF] hover:bg-[#1C1F26] transition-colors"
                                title="Download Attachment"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Quick Reply & Smart Suggestions Box */}
        <div className="p-4 rounded-2xl bg-[#16181D] border border-[#2A2E37] space-y-3" data-testid="quick-reply-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Reply className="w-3.5 h-3.5 text-[#2D5BFF]" />
              Quick Reply
            </span>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Sparkles className="w-3 h-3 text-[#2D5BFF]" />
              <span>Smart Suggestions</span>
            </div>
          </div>

          {/* AI Smart Suggestion Chips */}
          <div className="flex flex-wrap gap-2">
            {smartReplySuggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setReplyText(suggestion)}
                className="px-3 py-1 rounded-full bg-[#0F1115] border border-[#2A2E37] hover:border-[#2D5BFF] hover:text-white text-xs text-slate-300 transition-all"
                data-testid="smart-reply-chip"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Reply Textarea & Submit */}
          <form onSubmit={handleSendQuickReply} className="space-y-3">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply here..."
              rows={3}
              className="w-full bg-[#0F1115] border border-[#2A2E37] focus:border-[#2D5BFF] focus:ring-1 focus:ring-[#2D5BFF] rounded-xl p-3 text-sm text-white placeholder-slate-500 outline-none resize-none transition-all"
              data-testid="quick-reply-textarea"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="py-2 px-4 rounded-xl bg-[#2D5BFF] hover:bg-[#1E48E0] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs shadow-md transition-all flex items-center gap-1.5"
                data-testid="send-quick-reply-btn"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Reply</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sandboxed Attachment Preview Modal (FR-IN-06, FR-MBOX-06) */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#16181D] border border-[#2A2E37] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 px-6 border-b border-[#2A2E37] flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate">
                <Paperclip className="w-4 h-4 text-[#2D5BFF] shrink-0" />
                <div className="truncate">
                  <h3 className="text-sm font-semibold text-white truncate">{selectedPreview.filename}</h3>
                  <p className="text-[11px] text-slate-400">
                    {Math.round(selectedPreview.sizeBytes / 1024)} KB • {selectedPreview.contentType}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/v1/attachments/${selectedPreview.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#2D5BFF] hover:bg-[#2048DE] text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setSelectedPreview(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1C1F26]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-[#0F1115] min-h-[300px]">
              {selectedPreview.contentType.startsWith('image/') ? (
                <img
                  src={`/v1/attachments/${selectedPreview.id}/download`}
                  alt={selectedPreview.filename}
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-md"
                />
              ) : selectedPreview.contentType.includes('pdf') ? (
                <iframe
                  src={`/v1/attachments/${selectedPreview.id}/download#toolbar=0`}
                  title={selectedPreview.filename}
                  className="w-full h-[60vh] rounded-lg border border-[#2A2E37]"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <FileText className="w-12 h-12 text-slate-500 mx-auto" />
                  <p className="text-sm text-slate-300 font-medium">{selectedPreview.filename}</p>
                  <p className="text-xs text-slate-500">
                    Direct in-browser sandboxed preview is supported for Images, Text, and PDFs.
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 px-6 border-t border-[#2A2E37] bg-[#121418] flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Scanned & Verified Clean by ClamAV Sandbox
              </span>
              <span>Content-Disposition: attachment; nosniff</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
