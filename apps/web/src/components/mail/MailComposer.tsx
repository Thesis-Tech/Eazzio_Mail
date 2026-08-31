'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X, Minus, Maximize2, Minimize2, Send, Paperclip, Trash2, Bold, Italic, 
  Underline, List, ListOrdered, Link2, Sparkles, Clock, ChevronDown, 
  AlertCircle, Save, Shield, ShieldCheck, FileDown, Type, AlignLeft,
  AlignCenter, AlignRight, AlignJustify, Strikethrough, Quote, Undo2, Redo2,
  RemoveFormatting, Palette, Image as ImageIcon, Smile, Lock, PenTool,
  Check, MoreVertical, Calendar, CornerDownRight, Outdent, Indent
} from 'lucide-react';

export interface ComposerAttachment {
  id: string;
  name: string;
  sizeBytes: number;
  type?: string;
  dataBase64?: string;
  file?: File;
}

export interface ComposeEmailPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  bodyText?: string;
  attachments?: ComposerAttachment[];
  scheduledAt?: string;
}

export interface MailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: ComposeEmailPayload) => Promise<void> | void;
  onSaveDraft?: (email: ComposeEmailPayload) => Promise<void> | void;
  initialTo?: string[];
  initialCc?: string[];
  initialBcc?: string[];
  initialSubject?: string;
  initialBody?: string;
  initialAttachments?: ComposerAttachment[];
}

const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.includes(',') ? res.split(',')[1] : res;
      resolve(base64 || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const FONT_FAMILIES = [
  { label: 'Sans Serif', value: 'sans-serif', fontClass: 'font-sans' },
  { label: 'Serif', value: 'serif', fontClass: 'font-serif' },
  { label: 'Fixed Width', value: 'monospace', fontClass: 'font-mono' },
  { label: 'Wide', value: 'Arial Black, sans-serif', fontClass: 'tracking-wider font-sans' },
  { label: 'Narrow', value: 'Arial Narrow, sans-serif', fontClass: 'tracking-tight font-sans' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive, sans-serif', fontClass: 'font-sans' },
  { label: 'Garamond', value: 'Garamond, serif', fontClass: 'font-serif' },
  { label: 'Georgia', value: 'Georgia, serif', fontClass: 'font-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif', fontClass: 'font-sans' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif', fontClass: 'font-sans' },
  { label: 'Verdana', value: 'Verdana, sans-serif', fontClass: 'font-sans' },
];

const FONT_SIZES = [
  { label: 'Small', cmd: '1', cssSize: '12px' },
  { label: 'Normal', cmd: '3', cssSize: '14px' },
  { label: 'Large', cmd: '5', cssSize: '18px' },
  { label: 'Huge', cmd: '7', cssSize: '24px' },
];

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF', '#F3F3F3', '#FFFFFF',
  '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF', '#9900FF', '#FF00FF',
  '#E6B8AF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3', '#C9DAF8', '#CFE2F3', '#D9D2E9', '#EAD1DC',
  '#2D5BFF', '#14B8A6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#06B6D4', '#84CC16',
];

const EMOJIS = ['👍', '❤️', '😊', '🎉', '🔥', '✅', '🙏', '👏', '🚀', '💡', '✨', '👋', '🤝', '💯', '📩', '⭐', '☕', '💪', '🎯', '😃'];

export const MailComposer: React.FC<MailComposerProps> = ({
  isOpen, onClose, onSend, onSaveDraft,
  initialTo = [], initialCc = [], initialBcc = [],
  initialSubject = '', initialBody = '', initialAttachments = [],
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Recipient Fields
  const [toInput, setToInput] = useState('');
  const [toChips, setToChips] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [ccInput, setCcInput] = useState('');
  const [ccChips, setCcChips] = useState<string[]>([]);
  const [showBcc, setShowBcc] = useState(false);
  const [bccInput, setBccInput] = useState('');
  const [bccChips, setBccChips] = useState<string[]>([]);
  
  // Subject & Attachments
  const [subject, setSubject] = useState('');
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  
  // Formatting state
  const [showFormatting, setShowFormatting] = useState(true);
  const [currentFont, setCurrentFont] = useState('Sans Serif');
  const [currentSize, setCurrentSize] = useState('Normal');
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
  const [isAlignDropdownOpen, setIsAlignDropdownOpen] = useState(false);
  const [isMoreFormatOpen, setIsMoreFormatOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isConfidential, setIsConfidential] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setToChips([...initialTo]);
      setCcChips([...initialCc]);
      setShowCc(initialCc.length > 0);
      setBccChips([...initialBcc]);
      setShowBcc(initialBcc.length > 0);
      setSubject(initialSubject || '');
      setAttachments([...initialAttachments]);
      setErrorMessage(null);
      setIsMinimized(false);
      setIsMaximized(false);

      // Populate contentEditable editor
      setTimeout(() => {
        if (editorRef.current) {
          if (initialBody) {
            editorRef.current.innerHTML = initialBody.includes('<') && initialBody.includes('>')
              ? initialBody
              : initialBody.replace(/\n/g, '<br>');
          } else {
            editorRef.current.innerHTML = '';
          }
        }
      }, 50);
    }
  }, [isOpen, initialTo, initialCc, initialBcc, initialSubject, initialBody, initialAttachments]);

  if (!isOpen) return null;

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleAddChip = (type: 'to'|'cc'|'bcc', value: string) => {
    const trimmed = value.trim().replace(/,$/, '').replace(/;$/, '');
    if (!trimmed) return;
    if (!validateEmail(trimmed) && !trimmed.includes('@')) {
      setErrorMessage(`Invalid email: ${trimmed}`);
      return;
    }
    setErrorMessage(null);
    if (type === 'to') { 
      if (!toChips.includes(trimmed)) setToChips([...toChips, trimmed]); 
      setToInput(''); 
    }
    if (type === 'cc') { 
      if (!ccChips.includes(trimmed)) setCcChips([...ccChips, trimmed]); 
      setCcInput(''); 
    }
    if (type === 'bcc') { 
      if (!bccChips.includes(trimmed)) setBccChips([...bccChips, trimmed]); 
      setBccInput(''); 
    }
  };

  const executeCommand = (command: string, value: string = '') => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
  };

  const handleApplyFont = (fontName: string, fontValue: string) => {
    setCurrentFont(fontName);
    setIsFontDropdownOpen(false);
    executeCommand('fontName', fontValue);
  };

  const handleApplySize = (sizeLabel: string, sizeCmd: string) => {
    setCurrentSize(sizeLabel);
    setIsSizeDropdownOpen(false);
    executeCommand('fontSize', sizeCmd);
  };

  const handleInsertLink = () => {
    const url = window.prompt('Enter link URL:', 'https://');
    if (url && url !== 'https://') {
      executeCommand('createLink', url);
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    executeCommand('insertText', emoji);
    setIsEmojiPickerOpen(false);
  };

  const handleInsertSignature = () => {
    if (!editorRef.current) return;
    const sigHtml = `<br><br>--<br><b>Best Regards,</b><br>Rahul Kumar<br><span style="color:#888; font-size:12px;">Thesis Technologies</span>`;
    editorRef.current.focus();
    document.execCommand('insertHTML', false, sigHtml);
  };

  const handleGenerateAi = () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAi(true);
    setTimeout(() => {
      if (editorRef.current) {
        const generated = `<p>Hi team,</p><p>Regarding <b>${aiPrompt}</b>, I wanted to follow up and confirm our status. Everything is on schedule for deployment and testing.</p><p>Please let me know if you need any additional details.</p>`;
        editorRef.current.innerHTML = generated;
      }
      setIsGeneratingAi(false);
      setIsAiOpen(false);
      setAiPrompt('');
    }, 800);
  };

  const handleSend = async (scheduledDate?: Date) => {
    setErrorMessage(null);
    let finalTo = [...toChips];
    if (toInput.trim()) {
      if (validateEmail(toInput.trim())) finalTo.push(toInput.trim());
      else return setErrorMessage(`Invalid email: ${toInput.trim()}`);
    }
    if (finalTo.length === 0) return setErrorMessage('Please add at least one recipient');

    const htmlContent = editorRef.current ? editorRef.current.innerHTML : '';
    const textContent = editorRef.current ? editorRef.current.innerText : '';

    setIsSending(true);
    try {
      await onSend({
        to: finalTo,
        cc: ccChips,
        bcc: bccChips,
        subject: subject.trim() || '(No Subject)',
        body: textContent.trim(),
        bodyHtml: htmlContent.trim() || `<p>${textContent.trim()}</p>`,
        bodyText: textContent.trim(),
        attachments,
        scheduledAt: scheduledDate?.toISOString(),
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
      setIsScheduleOpen(false);
    }
  };

  return (
    <div 
      style={{
        backgroundColor: 'var(--theme-bg-card, #12141A)',
        borderColor: 'var(--theme-border, #1E232B)',
      }}
      className={`fixed z-[100] transition-all duration-200 shadow-2xl flex flex-col border overflow-hidden ${
        isMinimized 
          ? 'bottom-0 right-4 w-72 h-12 rounded-t-xl' 
          : isMaximized 
          ? 'inset-3 md:inset-8 rounded-2xl' 
          : 'bottom-0 right-4 md:right-16 w-full sm:w-[620px] h-[640px] max-h-[90vh] rounded-t-2xl shadow-[0_-10px_50px_rgba(0,0,0,0.6)]'
      }`}
    >
      {/* 1. Window Header (Gmail Style) */}
      <div 
        style={{
          backgroundColor: 'var(--theme-bg-sidebar, #090A0D)',
          borderColor: 'var(--theme-border, #1E232B)',
        }}
        className="h-11 px-4 border-b flex items-center justify-between shrink-0 select-none cursor-pointer"
        onClick={(e) => { 
          if (e.target === e.currentTarget && isMinimized) setIsMinimized(false); 
        }}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="text-xs font-bold text-slate-200 truncate">
            {subject.trim() || 'New Message'}
          </span>
          {isConfidential && (
            <span className="flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
              <Lock className="w-3 h-3" /> Confidential
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1 shrink-0 ml-4 text-slate-400">
          <button 
            onClick={() => setIsMinimized(!isMinimized)} 
            className="p-1.5 rounded hover:text-white hover:bg-white/10 transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => { 
              setIsMaximized(!isMaximized); 
              setIsMinimized(false); 
            }} 
            className="p-1.5 rounded hover:text-white hover:bg-white/10 transition-colors hidden sm:block"
            title={isMaximized ? "Exit full screen" : "Full screen"}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded hover:text-white hover:bg-rose-500/20 transition-colors"
            title="Save & Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div 
          style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)' }}
          className="flex-1 flex flex-col min-h-0 relative"
        >
          {errorMessage && (
            <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 2. Recipient Fields (Gmail borderless lines) */}
          <div className="px-4 py-1 space-y-0.5 border-b border-white/5">
            {/* To Line */}
            <div className="flex items-center gap-2 min-h-[36px]">
              <span className="text-slate-400 text-xs w-16 select-none font-medium">Recipients</span>
              <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                {toChips.map((chip) => (
                  <span 
                    key={chip} 
                    style={{
                      backgroundColor: 'var(--theme-accent-bg, rgba(45,91,255,0.15))',
                      borderColor: 'var(--theme-accent, #2D5BFF)',
                      color: 'var(--theme-accent, #2D5BFF)'
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border"
                  >
                    <span>{chip}</span>
                    <button 
                      onClick={() => setToChips(toChips.filter((c) => c !== chip))}
                      className="hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input 
                  type="text" 
                  value={toInput} 
                  onChange={(e) => setToInput(e.target.value)} 
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { 
                      e.preventDefault(); 
                      handleAddChip('to', toInput); 
                    } 
                  }} 
                  onBlur={() => handleAddChip('to', toInput)} 
                  className="flex-1 min-w-[140px] bg-transparent text-xs text-white outline-none py-1 placeholder-slate-500" 
                  placeholder={toChips.length === 0 ? "Type email address..." : ""}
                />
              </div>
              <div className="flex gap-2 text-xs font-semibold text-slate-400 select-none">
                {!showCc && (
                  <button onClick={() => setShowCc(true)} className="hover:text-white transition-colors">
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button onClick={() => setShowBcc(true)} className="hover:text-white transition-colors">
                    Bcc
                  </button>
                )}
              </div>
            </div>

            {/* Cc Line */}
            {showCc && (
              <div className="flex items-center gap-2 min-h-[32px] border-t border-white/5 pt-1">
                <span className="text-slate-400 text-xs w-16 select-none font-medium">Cc</span>
                <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                  {ccChips.map((chip) => (
                    <span 
                      key={chip} 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs border border-slate-700"
                    >
                      <span>{chip}</span>
                      <button onClick={() => setCcChips(ccChips.filter((c) => c !== chip))}>
                        <X className="w-3 h-3 hover:text-white" />
                      </button>
                    </span>
                  ))}
                  <input 
                    type="text" 
                    value={ccInput} 
                    onChange={(e) => setCcInput(e.target.value)} 
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { 
                        e.preventDefault(); 
                        handleAddChip('cc', ccInput); 
                      } 
                    }} 
                    onBlur={() => handleAddChip('cc', ccInput)} 
                    className="flex-1 min-w-[120px] bg-transparent text-xs text-white outline-none py-1" 
                  />
                </div>
              </div>
            )}

            {/* Bcc Line */}
            {showBcc && (
              <div className="flex items-center gap-2 min-h-[32px] border-t border-white/5 pt-1">
                <span className="text-slate-400 text-xs w-16 select-none font-medium">Bcc</span>
                <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                  {bccChips.map((chip) => (
                    <span 
                      key={chip} 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs border border-slate-700"
                    >
                      <span>{chip}</span>
                      <button onClick={() => setBccChips(bccChips.filter((c) => c !== chip))}>
                        <X className="w-3 h-3 hover:text-white" />
                      </button>
                    </span>
                  ))}
                  <input 
                    type="text" 
                    value={bccInput} 
                    onChange={(e) => setBccInput(e.target.value)} 
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { 
                        e.preventDefault(); 
                        handleAddChip('bcc', bccInput); 
                      } 
                    }} 
                    onBlur={() => handleAddChip('bcc', bccInput)} 
                    className="flex-1 min-w-[120px] bg-transparent text-xs text-white outline-none py-1" 
                  />
                </div>
              </div>
            )}

            {/* Subject Line */}
            <div className="border-t border-white/5 pt-1.5 pb-1">
              <input 
                type="text" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                placeholder="Subject" 
                className="w-full bg-transparent text-sm font-medium text-white placeholder-slate-500 outline-none" 
              />
            </div>
          </div>

          {/* 3. Content-Editable Body Canvas */}
          <div className="flex-1 flex flex-col p-4 min-h-0 overflow-y-auto custom-scrollbar relative">
            <div 
              ref={editorRef}
              contentEditable="true"
              suppressContentEditableWarning={true}
              data-placeholder="Write your email here..."
              className="flex-1 w-full bg-transparent text-sm text-slate-200 leading-relaxed outline-none min-h-[160px] focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-600 empty:before:pointer-events-none prose prose-invert max-w-none"
            />

            {/* Attachment preview chips */}
            {attachments.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                {attachments.map((att) => (
                  <div 
                    key={att.id} 
                    style={{
                      backgroundColor: 'var(--theme-bg-card, #12141A)',
                      borderColor: 'var(--theme-border, #1E232B)',
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border hover:border-white/20 transition-colors group cursor-default shadow-sm text-xs"
                  >
                    <FileDown className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-semibold text-white max-w-[160px] truncate">{att.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {Math.round(att.sizeBytes / 1024)} KB
                    </span>
                    <button 
                      onClick={() => setAttachments(attachments.filter((a) => a.id !== att.id))} 
                      className="ml-1 text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Gmail Rich-Text Formatting Bar (Toggled by Aa) */}
          {showFormatting && (
            <div 
              style={{
                backgroundColor: 'var(--theme-bg-sidebar, #090A0D)',
                borderColor: 'var(--theme-border, #1E232B)',
              }}
              className="px-3 py-1.5 border-t flex flex-wrap items-center justify-between gap-1 text-xs select-none relative z-30"
            >
              {/* Left Format Tools */}
              <div className="flex items-center flex-wrap gap-0.5">
                
                {/* Font Family Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFontDropdownOpen(!isFontDropdownOpen);
                      setIsSizeDropdownOpen(false);
                      setIsColorDropdownOpen(false);
                    }}
                    className="px-2.5 py-1 rounded hover:bg-white/10 text-slate-300 font-medium flex items-center gap-1.5 transition-colors text-xs"
                  >
                    <span>{currentFont}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {isFontDropdownOpen && (
                    <div 
                      style={{
                        backgroundColor: 'var(--theme-bg-card, #12141A)',
                        borderColor: 'var(--theme-border, #1E232B)',
                      }}
                      className="absolute left-0 bottom-full mb-1 w-44 rounded-xl border shadow-2xl py-1 z-50 animate-in fade-in"
                    >
                      {FONT_FAMILIES.map((f) => (
                        <button
                          key={f.label}
                          type="button"
                          onClick={() => handleApplyFont(f.label, f.value)}
                          className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-white/10 flex items-center justify-between transition-colors"
                        >
                          <span className={f.fontClass}>{f.label}</span>
                          {currentFont === f.label && <Check className="w-3.5 h-3.5 text-blue-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Font Size Dropdown (TT ▾) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSizeDropdownOpen(!isSizeDropdownOpen);
                      setIsFontDropdownOpen(false);
                      setIsColorDropdownOpen(false);
                    }}
                    className="px-2 py-1 rounded hover:bg-white/10 text-slate-300 font-medium flex items-center gap-1 transition-colors text-xs"
                  >
                    <span className="font-bold">T<span className="text-[10px]">T</span></span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {isSizeDropdownOpen && (
                    <div 
                      style={{
                        backgroundColor: 'var(--theme-bg-card, #12141A)',
                        borderColor: 'var(--theme-border, #1E232B)',
                      }}
                      className="absolute left-0 bottom-full mb-1 w-32 rounded-xl border shadow-2xl py-1 z-50 animate-in fade-in"
                    >
                      {FONT_SIZES.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => handleApplySize(s.label, s.cmd)}
                          className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-white/10 flex items-center justify-between transition-colors"
                        >
                          <span>{s.label}</span>
                          {currentSize === s.label && <Check className="w-3.5 h-3.5 text-blue-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ backgroundColor: 'var(--theme-border, #1E232B)' }} className="w-[1px] h-4 mx-1"></div>

                {/* Bold */}
                <button
                  type="button"
                  onClick={() => executeCommand('bold')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 font-bold hover:text-white transition-colors"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>

                {/* Italic */}
                <button
                  type="button"
                  onClick={() => executeCommand('italic')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 italic hover:text-white transition-colors"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>

                {/* Underline */}
                <button
                  type="button"
                  onClick={() => executeCommand('underline')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 underline hover:text-white transition-colors"
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>

                {/* Text Color Dropdown (A ▾) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsColorDropdownOpen(!isColorDropdownOpen);
                      setIsFontDropdownOpen(false);
                      setIsSizeDropdownOpen(false);
                    }}
                    className="px-1.5 py-1 rounded hover:bg-white/10 text-slate-300 flex items-center gap-0.5 transition-colors"
                    title="Text color"
                  >
                    <span className="font-bold border-b-2 border-blue-500 text-xs px-0.5">A</span>
                    <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                  </button>

                  {isColorDropdownOpen && (
                    <div 
                      style={{
                        backgroundColor: 'var(--theme-bg-card, #12141A)',
                        borderColor: 'var(--theme-border, #1E232B)',
                      }}
                      className="absolute left-0 bottom-full mb-1 p-2.5 rounded-xl border shadow-2xl z-50 animate-in fade-in w-48"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">Text Color</div>
                      <div className="grid grid-cols-6 gap-1">
                        {TEXT_COLORS.map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => {
                              executeCommand('foreColor', col);
                              setIsColorDropdownOpen(false);
                            }}
                            style={{ backgroundColor: col }}
                            className="w-5 h-5 rounded-md border border-white/20 hover:scale-110 transition-transform"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ backgroundColor: 'var(--theme-border, #1E232B)' }} className="w-[1px] h-4 mx-1"></div>

                {/* Alignment */}
                <button
                  type="button"
                  onClick={() => executeCommand('justifyLeft')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Align left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('justifyCenter')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Align center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('justifyRight')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Align right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>

                <div style={{ backgroundColor: 'var(--theme-border, #1E232B)' }} className="w-[1px] h-4 mx-1"></div>

                {/* Numbered List */}
                <button
                  type="button"
                  onClick={() => executeCommand('insertOrderedList')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Numbered list"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>

                {/* Bulleted List */}
                <button
                  type="button"
                  onClick={() => executeCommand('insertUnorderedList')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Bulleted list"
                >
                  <List className="w-3.5 h-3.5" />
                </button>

                {/* Indent / Outdent */}
                <button
                  type="button"
                  onClick={() => executeCommand('outdent')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Indent less"
                >
                  <Outdent className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('indent')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Indent more"
                >
                  <Indent className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => executeCommand('removeFormat')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-rose-400 transition-colors ml-1"
                  title="Remove formatting"
                >
                  <RemoveFormatting className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Right Undo / Redo */}
              <div className="flex items-center gap-0.5 text-slate-400">
                <button
                  type="button"
                  onClick={() => executeCommand('undo')}
                  className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('redo')}
                  className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* 5. Bottom Action Bar (Gmail Authentic Action Row) */}
          <div 
            style={{
              backgroundColor: 'var(--theme-bg-sidebar, #090A0D)',
              borderColor: 'var(--theme-border, #1E232B)',
            }}
            className="p-3 border-t flex items-center justify-between z-20"
          >
            {/* Left Actions */}
            <div className="flex items-center gap-2">
              
              {/* Send Button Split Pill */}
              <div className="relative inline-flex rounded-full shadow-lg">
                <button 
                  onClick={() => handleSend()} 
                  disabled={isSending} 
                  style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }}
                  className="px-5 py-2 rounded-l-full hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md"
                >
                  <span>{isSending ? 'Sending...' : 'Send'}</span>
                </button>
                <div className="w-[1px] bg-black/30 z-10"></div>
                <button 
                  onClick={() => setIsScheduleOpen(!isScheduleOpen)} 
                  disabled={isSending} 
                  style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }}
                  className="px-2.5 py-2 rounded-r-full hover:brightness-110 disabled:opacity-50 text-white transition-all shadow-md"
                  title="More send options"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                
                {/* Schedule Send Popover */}
                {isScheduleOpen && (
                  <div 
                    style={{
                      backgroundColor: 'var(--theme-bg-card, #12141A)',
                      borderColor: 'var(--theme-border, #1E232B)',
                    }}
                    className="absolute left-0 bottom-[115%] w-60 rounded-xl border shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-bottom-2"
                  >
                    <div className="px-3 py-2 text-xs font-bold text-slate-300 border-b border-white/5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Schedule send</span>
                    </div>
                    {[
                      { label: 'Tomorrow morning', time: '8:00 AM', hrs: 24 },
                      { label: 'Tomorrow afternoon', time: '1:00 PM', hrs: 29 },
                      { label: 'Monday morning', time: '8:00 AM', hrs: 72 },
                    ].map((opt) => (
                      <button 
                        key={opt.label} 
                        onClick={() => { 
                          const d = new Date(); 
                          d.setHours(d.getHours() + opt.hrs); 
                          handleSend(d); 
                        }} 
                        className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/10 flex justify-between items-center transition-colors"
                      >
                        <span>{opt.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{opt.time}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Formatting Toggle (Aa) */}
              <button
                type="button"
                onClick={() => setShowFormatting(!showFormatting)}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                  showFormatting 
                    ? 'bg-white/10 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title="Formatting options"
              >
                <span>Aa</span>
              </button>

              {/* AI Writer (🪄) */}
              <button
                type="button"
                onClick={() => setIsAiOpen(!isAiOpen)}
                className={`p-2 rounded-lg transition-colors ${
                  isAiOpen 
                    ? 'bg-purple-500/20 text-purple-300' 
                    : 'text-purple-400 hover:bg-purple-500/10'
                }`}
                title="Help me write (AI)"
              >
                <Sparkles className="w-4 h-4" />
              </button>

              {/* Attach File (📎) */}
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()} 
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Attach files"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Insert Link (🔗) */}
              <button 
                type="button"
                onClick={handleInsertLink}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Insert link"
              >
                <Link2 className="w-4 h-4" />
              </button>

              {/* Emoji Picker (😀) */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Insert emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {isEmojiPickerOpen && (
                  <div 
                    style={{
                      backgroundColor: 'var(--theme-bg-card, #12141A)',
                      borderColor: 'var(--theme-border, #1E232B)',
                    }}
                    className="absolute left-0 bottom-full mb-2 p-2 rounded-xl border shadow-2xl z-50 grid grid-cols-5 gap-1 animate-in fade-in"
                  >
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => handleInsertEmoji(e)}
                        className="w-8 h-8 rounded hover:bg-white/10 flex items-center justify-center text-base hover:scale-125 transition-transform"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Insert Photo / Image (🖼) */}
              <button 
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Insert photo"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Confidential Mode (🔒) */}
              <button 
                type="button"
                onClick={() => setIsConfidential(!isConfidential)}
                className={`p-2 rounded-lg transition-colors ${
                  isConfidential ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title="Toggle confidential mode"
              >
                <Lock className="w-4 h-4" />
              </button>

              {/* Insert Signature (✍) */}
              <button 
                type="button"
                onClick={handleInsertSignature}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Insert signature"
              >
                <PenTool className="w-4 h-4" />
              </button>

              {/* Hidden File Inputs */}
              <input 
                type="file" 
                multiple 
                ref={fileInputRef} 
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files) return;
                  const newAtts: ComposerAttachment[] = [];
                  for (let i = 0; i < files.length; i++) {
                    const base64 = await readFileAsBase64(files[i]);
                    newAtts.push({ 
                      id: `att-${Date.now()}-${i}`, 
                      name: files[i].name, 
                      sizeBytes: files[i].size, 
                      dataBase64: base64, 
                      file: files[i] 
                    });
                  }
                  setAttachments([...attachments, ...newAtts]);
                }} 
                className="hidden" 
              />

              <input 
                type="file" 
                accept="image/*"
                ref={imageInputRef} 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const base64 = await readFileAsBase64(file);
                  if (editorRef.current) {
                    editorRef.current.focus();
                    document.execCommand('insertHTML', false, `<img src="data:${file.type};base64,${base64}" style="max-width:100%; border-radius:8px; margin:8px 0;" alt="${file.name}" />`);
                  }
                }} 
                className="hidden" 
              />
            </div>

            {/* Right Discard / Trash */}
            <div className="flex items-center gap-1 text-slate-400">
              <button 
                onClick={onClose} 
                className="p-2 rounded-lg hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Discard draft"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* AI Writer Panel (Expandable) */}
          {isAiOpen && (
            <div 
              style={{
                backgroundColor: 'var(--theme-bg-card, #12141A)',
                borderColor: 'var(--theme-border, #1E232B)',
              }}
              className="absolute bottom-16 right-4 left-4 sm:left-auto sm:w-96 rounded-2xl border shadow-2xl p-4 z-50 animate-in slide-in-from-bottom-4"
            >
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Help me write
                </span>
                <button onClick={() => setIsAiOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="E.g., Ask for the project status update politely..." 
                rows={3} 
                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-xs text-white resize-none outline-none focus:border-purple-500/50" 
              />
              <div className="flex justify-between items-center mt-3">
                <span className="text-[10px] text-slate-500">Powered by Eazzio AI</span>
                <button 
                  onClick={handleGenerateAi}
                  disabled={isGeneratingAi || !aiPrompt.trim()}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isGeneratingAi ? 'Writing...' : 'Generate'}
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
