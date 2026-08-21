'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Send,
  Paperclip,
  Trash2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Sparkles,
  Clock,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';

export interface ComposerAttachment {
  id: string;
  name: string;
  sizeBytes: number;
  file?: File;
}

export interface ComposeEmailPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: ComposerAttachment[];
}

export interface MailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: ComposeEmailPayload) => Promise<void> | void;
  onSaveDraft?: (email: ComposeEmailPayload) => Promise<void> | void;
  initialTo?: string[];
  initialSubject?: string;
  initialBody?: string;
}

const DEFAULT_TO: string[] = [];

export const MailComposer: React.FC<MailComposerProps> = ({
  isOpen,
  onClose,
  onSend,
  onSaveDraft,
  initialTo = DEFAULT_TO,
  initialSubject = '',
  initialBody = '',
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Form Fields
  const [toInput, setToInput] = useState('');
  const [toChips, setToChips] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [ccInput, setCcInput] = useState('');
  const [ccChips, setCcChips] = useState<string[]>([]);
  const [showBcc, setShowBcc] = useState(false);
  const [bccInput, setBccInput] = useState('');
  const [bccChips, setBccChips] = useState<string[]>([]);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);

  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftStatus, setDraftStatus] = useState<string>('Draft ready');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setToChips(Array.isArray(initialTo) ? [...initialTo] : []);
      setSubject(initialSubject || '');
      setBody(initialBody || '');
      setAttachments([]);
      setErrorMessage(null);
      setDraftStatus('Draft ready');
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, initialTo, initialSubject, initialBody]);

  // Autosave simulation every 3 seconds
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (subject || body || toChips.length > 0) {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setDraftStatus(`Saved at ${time}`);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [subject, body, toChips, isOpen]);

  if (!isOpen) return null;

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const handleAddRecipient = (
    type: 'to' | 'cc' | 'bcc',
    value: string,
    e?: React.KeyboardEvent
  ) => {
    if (e && e.key !== 'Enter' && e.key !== ',' && e.key !== ' ') return;
    if (e) e.preventDefault();

    const trimmed = value.trim().replace(/,$/, '');
    if (!trimmed) return;

    if (!validateEmail(trimmed) && !trimmed.includes('@eazzio.com')) {
      setErrorMessage(`Invalid email format: ${trimmed}`);
      return;
    }
    setErrorMessage(null);

    if (type === 'to' && !toChips.includes(trimmed)) {
      setToChips([...toChips, trimmed]);
      setToInput('');
    } else if (type === 'cc' && !ccChips.includes(trimmed)) {
      setCcChips([...ccChips, trimmed]);
      setCcInput('');
    } else if (type === 'bcc' && !bccChips.includes(trimmed)) {
      setBccChips([...bccChips, trimmed]);
      setBccInput('');
    }
  };

  const handleRemoveChip = (type: 'to' | 'cc' | 'bcc', emailToRemove: string) => {
    if (type === 'to') setToChips(toChips.filter((c) => c !== emailToRemove));
    if (type === 'cc') setCcChips(ccChips.filter((c) => c !== emailToRemove));
    if (type === 'bcc') setBccChips(bccChips.filter((c) => c !== emailToRemove));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: ComposerAttachment[] = Array.from(files).map((f) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: f.name,
      sizeBytes: f.size,
      file: f,
    }));

    setAttachments([...attachments, ...newAttachments]);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    // Auto-add any pending text in toInput
    let finalTo = [...toChips];
    if (toInput.trim()) {
      if (validateEmail(toInput.trim()) || toInput.trim().includes('@eazzio.com')) {
        finalTo.push(toInput.trim());
      } else {
        setErrorMessage(`Invalid email address: ${toInput.trim()}`);
        return;
      }
    }

    if (finalTo.length === 0) {
      setErrorMessage('Please add at least one recipient');
      return;
    }

    setIsSending(true);
    try {
      await onSend({
        to: finalTo,
        cc: ccChips,
        bcc: bccChips,
        subject: subject.trim() || '(No Subject)',
        body: body.trim(),
        attachments,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    let finalTo = [...toChips];
    if (toInput.trim() && validateEmail(toInput.trim())) {
      finalTo.push(toInput.trim());
    }

    setIsSavingDraft(true);
    try {
      if (onSaveDraft) {
        await onSaveDraft({
          to: finalTo,
          cc: ccChips,
          bcc: bccChips,
          subject: subject.trim() || '(Draft - No Subject)',
          body: body.trim(),
          attachments,
        });
      }
      setDraftStatus('Draft saved');
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <div
      className={`fixed z-50 transition-all duration-200 shadow-2xl flex flex-col bg-[#16181D] border border-[#2A2E37] rounded-t-2xl md:rounded-2xl overflow-hidden ${
        isMinimized
          ? 'bottom-0 right-6 w-72 h-12'
          : isMaximized
          ? 'inset-4 md:inset-10 w-auto h-auto'
          : 'bottom-0 right-4 md:right-10 w-full md:w-[600px] h-[520px]'
      }`}
      data-testid="mail-composer-modal"
    >
      {/* Top Header Bar */}
      <div className="h-12 px-4 bg-[#1C1F26] border-b border-[#2A2E37] flex items-center justify-between select-none shrink-0">
        <span className="text-sm font-semibold text-white truncate">
          {subject ? subject : 'New Message'}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2A2E37] transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsMaximized(!isMaximized);
              setIsMinimized(false);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2A2E37] transition-colors hidden sm:block"
            title={isMaximized ? 'Restore size' : 'Maximize'}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Save & Close"
            data-testid="composer-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0F1115]">
          {/* Error Alert */}
          {errorMessage && (
            <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="p-3 space-y-2 border-b border-[#2A2E37] text-xs">
            {/* TO Recipients */}
            <div className="flex items-center gap-2 flex-wrap min-h-[34px]">
              <span className="text-slate-500 w-8">To:</span>
              <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                {toChips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2D5BFF]/15 border border-[#2D5BFF]/30 text-[#2D5BFF] font-medium"
                  >
                    <span>{chip}</span>
                    <button
                      onClick={() => handleRemoveChip('to', chip)}
                      className="hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  onKeyDown={(e) => handleAddRecipient('to', toInput, e)}
                  onBlur={() => handleAddRecipient('to', toInput)}
                  placeholder={toChips.length === 0 ? 'recipients@example.com' : ''}
                  className="flex-1 min-w-[140px] bg-transparent text-white outline-none placeholder-slate-600"
                  data-testid="composer-to-input"
                />
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                {!showCc && (
                  <button onClick={() => setShowCc(true)} className="hover:text-slate-300">
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button onClick={() => setShowBcc(true)} className="hover:text-slate-300">
                    Bcc
                  </button>
                )}
              </div>
            </div>

            {/* CC Recipients */}
            {showCc && (
              <div className="flex items-center gap-2 flex-wrap min-h-[34px] pt-1 border-t border-[#2A2E37]/60">
                <span className="text-slate-500 w-8">Cc:</span>
                <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                  {ccChips.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1C1F26] border border-[#2A2E37] text-slate-300 font-medium"
                    >
                      <span>{chip}</span>
                      <button
                        onClick={() => handleRemoveChip('cc', chip)}
                        className="hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    onKeyDown={(e) => handleAddRecipient('cc', ccInput, e)}
                    onBlur={() => handleAddRecipient('cc', ccInput)}
                    placeholder="cc@example.com"
                    className="flex-1 min-w-[140px] bg-transparent text-white outline-none placeholder-slate-600"
                  />
                </div>
              </div>
            )}

            {/* BCC Recipients */}
            {showBcc && (
              <div className="flex items-center gap-2 flex-wrap min-h-[34px] pt-1 border-t border-[#2A2E37]/60">
                <span className="text-slate-500 w-8">Bcc:</span>
                <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                  {bccChips.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1C1F26] border border-[#2A2E37] text-slate-300 font-medium"
                    >
                      <span>{chip}</span>
                      <button
                        onClick={() => handleRemoveChip('bcc', chip)}
                        className="hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={bccInput}
                    onChange={(e) => setBccInput(e.target.value)}
                    onKeyDown={(e) => handleAddRecipient('bcc', bccInput, e)}
                    onBlur={() => handleAddRecipient('bcc', bccInput)}
                    placeholder="bcc@example.com"
                    className="flex-1 min-w-[140px] bg-transparent text-white outline-none placeholder-slate-600"
                  />
                </div>
              </div>
            )}

            {/* Subject */}
            <div className="pt-1 border-t border-[#2A2E37]/60">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder-slate-600"
                data-testid="composer-subject-input"
              />
            </div>
          </div>

          {/* Rich Text / Email Body Editor */}
          <div className="flex-1 p-4 flex flex-col min-h-0">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email here..."
              className="flex-1 w-full bg-transparent text-sm text-slate-200 leading-relaxed outline-none resize-none placeholder-slate-600 custom-scrollbar"
              data-testid="composer-body-textarea"
            />

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div className="pt-3 border-t border-[#2A2E37] flex flex-wrap gap-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#16181D] border border-[#2A2E37] text-xs text-slate-300"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate max-w-[140px] font-medium">{att.name}</span>
                    <span className="text-slate-500 text-[10px]">
                      ({Math.round(att.sizeBytes / 1024)} KB)
                    </span>
                    <button
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="hover:text-red-400 ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Toolbar & Send Action */}
          <div className="h-14 px-4 bg-[#16181D] border-t border-[#2A2E37] flex items-center justify-between gap-3 shrink-0">
            {/* Left Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || isSavingDraft}
                className="py-2 px-4 rounded-xl bg-[#2D5BFF] hover:bg-[#1E48E0] active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
                data-testid="composer-send-btn"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Sending...' : 'Send'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSending || isSavingDraft}
                className="py-2 px-3 rounded-xl bg-[#1C1F26] hover:bg-[#2A2E37] text-slate-300 hover:text-white font-medium text-xs border border-[#2A2E37] transition-all flex items-center gap-1.5"
                data-testid="composer-save-draft-btn"
                title="Save this message as a draft in Drafts folder"
              >
                <Save className="w-3.5 h-3.5 text-amber-400" />
                <span>{isSavingDraft ? 'Saving...' : 'Save Draft'}</span>
              </button>

              {/* Attachment Trigger */}
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1C1F26] transition-colors"
                title="Attach files"
                data-testid="composer-attach-btn"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Formatting Toolbar */}
              <div className="hidden sm:flex items-center gap-0.5 pl-2 border-l border-[#2A2E37]">
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1C1F26]"
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1C1F26]"
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1C1F26]"
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Status & Discard */}
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="hidden sm:inline text-[11px] text-slate-500">{draftStatus}</span>
              <button
                type="button"
                onClick={() => {
                  setToChips([]);
                  setSubject('');
                  setBody('');
                  setAttachments([]);
                  onClose();
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Discard Draft"
                data-testid="composer-discard-btn"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
