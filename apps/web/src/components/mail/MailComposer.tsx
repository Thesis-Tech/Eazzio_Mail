'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Minus, Maximize2, Minimize2, ChevronDown, 
  Paperclip, Image, Trash2, Send, Clock, Sparkles, 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  List, ListOrdered, Indent, Outdent, Link2, Smile, 
  Type, Check, AlertCircle, FileDown, Lock, Unlock,
  RemoveFormatting, Undo2, Redo2, Search
} from 'lucide-react';
import { ComposerAttachment, ComposeEmailPayload } from '@/types/mail';
export type { ComposerAttachment, ComposeEmailPayload };

interface MailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (payload: ComposeEmailPayload) => Promise<void>;
  onSaveDraft?: (payload: ComposeEmailPayload) => Promise<void>;
  initialTo?: string[];
  initialCc?: string[];
  initialBcc?: string[];
  initialSubject?: string;
  initialBody?: string;
  initialAttachments?: ComposerAttachment[];
}

const fileToBase64 = (file: File): Promise<string> => {
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
  { label: 'Serif', value: 'Georgia, serif', fontClass: 'font-serif' },
  { label: 'Fixed Width', value: 'ui-monospace, monospace', fontClass: 'font-mono' },
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

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', 
      '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜', 
      '🤪', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😔', '😢', '😭', 
      '😤', '😠', '😡', '🤯', '😳', '😱', '🤔', '🤗', '🤫', '😴', 
      '🤐', '😷', '🤒', '🤕', '🤠', '😈', '🤡', '💩', '👻', '💀'
    ]
  },
  {
    name: 'Gestures',
    icon: '👍',
    emojis: [
      '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', 
      '🤳', '💪', '👈', '👉', '👆', '👇', '☝️', '✌️', '🤞', '🫰', 
      '🤟', '🤘', '🤙', '🖐️', '✋', '👊', '🤛', '🤜', '👁️', '👀', 
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', 
      '💕', '💞', '💓', '💗', '💖', '💘', '💝', '✨', '🔥', '⭐'
    ]
  },
  {
    name: 'Work',
    icon: '💼',
    emojis: [
      '💼', '📁', '📂', '📄', '📃', '📊', '📈', '📉', '📑', '📋', 
      '📌', '📍', '📎', '🖇️', '📏', '✂️', '🗄️', '🗑️', '🔒', '🔓', 
      '🔑', '🔨', '🛠️', '⚙️', '⚖️', '🔗', '🧪', '🔬', '📡', '💻', 
      '🖥️', '📱', '⌨️', '🖱️', '🖨️', '💾', '💡', '🔌', '🔋', '⏰'
    ]
  },
  {
    name: 'Symbols',
    icon: '✅',
    emojis: [
      '✅', '❌', '⭕', '🛑', '⛔', '🚫', '💯', '⚠️', '♻️', '❇️', 
      '✳️', '✴️', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🆗', '🆙', '🆒', 
      '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', 
      '8️⃣', '9️⃣', '🔟', '➕', '➖', '➗', '✖️', '🟰', '♾️', '💲'
    ]
  },
  {
    name: 'Travel & Activity',
    icon: '🚀',
    emojis: [
      '🚀', '✈️', '🚗', '🚲', '🌍', '🏝️', '🏔️', '🏖️', '⛺', '⚽', 
      '🏀', '🏈', '🎾', '🎮', '🏆', '🥇', '🥈', '🥉', '🎯', '🎨', 
      '🎸', '📷', '☕', '🍺', '🍻', '🥂', '🍷', '🍕', '🍔', '🌮'
    ]
  }
];

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
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isConfidential, setIsConfidential] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Quoted Old Mail State
  const [quotedHtml, setQuotedHtml] = useState<string | null>(null);
  const [showQuotedInComposer, setShowQuotedInComposer] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);

  const prevIsOpenRef = useRef(false);

  // Selection Preservation
  const saveSelection = () => {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        savedSelectionRef.current = range.cloneRange();
      }
    }
  };

  const restoreSelection = () => {
    if (typeof window === 'undefined') return;
    if (savedSelectionRef.current && editorRef.current) {
      editorRef.current.focus();
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current);
      }
    } else if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setToChips([...(initialTo || [])]);
      setCcChips([...(initialCc || [])]);
      setShowCc((initialCc || []).length > 0);
      setBccChips([...(initialBcc || [])]);
      setShowBcc((initialBcc || []).length > 0);
      setSubject(initialSubject || '');
      setAttachments([...(initialAttachments || [])]);
      setErrorMessage(null);
      setIsMinimized(false);
      setIsMaximized(false);

      // Check if initialBody contains a quoted message
      if (initialBody) {
        const quoteIndex = initialBody.search(/(<div\s+class="gmail_quote"|<blockquote|<div\s+class="gmail_attr")/i);
        if (quoteIndex !== -1) {
          const primary = initialBody.slice(0, quoteIndex).trim();
          const quoted = initialBody.slice(quoteIndex).trim();
          setQuotedHtml(quoted);
          setShowQuotedInComposer(false);

          setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.innerHTML = primary;
              editorRef.current.focus();
            }
          }, 50);
        } else {
          setQuotedHtml(null);
          setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.innerHTML = initialBody.includes('<') && initialBody.includes('>')
                ? initialBody
                : initialBody.replace(/\n/g, '<br>');
              editorRef.current.focus();
            }
          }, 50);
        }
      } else {
        setQuotedHtml(null);
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = '';
            editorRef.current.focus();
          }
        }, 50);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialSubject, initialBody]);

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
    restoreSelection();
    document.execCommand(command, false, value);
    saveSelection();
  };

  const handleApplyFont = (fontName: string, fontValue: string) => {
    setCurrentFont(fontName);
    setIsFontDropdownOpen(false);
    restoreSelection();
    
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
      document.execCommand('fontName', false, fontValue);
    } else if (editorRef.current) {
      editorRef.current.style.fontFamily = fontValue;
      document.execCommand('fontName', false, fontValue);
    }
    saveSelection();
  };

  const handleApplySize = (sizeLabel: string, sizeCmd: string) => {
    setCurrentSize(sizeLabel);
    setIsSizeDropdownOpen(false);
    executeCommand('fontSize', sizeCmd);
  };

  const handleInsertLink = () => {
    restoreSelection();
    const url = window.prompt('Enter link URL:', 'https://');
    if (url && url !== 'https://') {
      executeCommand('createLink', url);
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    restoreSelection();
    document.execCommand('insertText', false, emoji);
    saveSelection();
    setIsEmojiPickerOpen(false);
  };

  const handleInsertSignature = () => {
    if (!editorRef.current) return;
    restoreSelection();
    const sigHtml = `<br><br>--<br><b>Best Regards,</b><br>Rahul Kumar<br><span style="color:#888; font-size:12px;">Thesis Technologies</span>`;
    document.execCommand('insertHTML', false, sigHtml);
    saveSelection();
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

    const finalHtml = quotedHtml 
      ? `${htmlContent.trim() || `<p>${textContent.trim()}</p>`}<br><br>${quotedHtml}`
      : (htmlContent.trim() || `<p>${textContent.trim()}</p>`);

    const finalPlainText = quotedHtml
      ? `${textContent.trim()}\n\n${quotedHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`
      : textContent.trim();

    setIsSending(true);
    try {
      await onSend({
        to: finalTo,
        cc: ccChips,
        bcc: bccChips,
        subject: subject.trim() || '(No Subject)',
        body: finalPlainText,
        bodyHtml: finalHtml,
        bodyText: finalPlainText,
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

  // Filter emojis by search keyword
  const currentCategoryEmojis = EMOJI_CATEGORIES[emojiCategory]?.emojis || [];
  const filteredEmojis = emojiSearch.trim()
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis)
    : currentCategoryEmojis;

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
        style={{ backgroundColor: 'var(--theme-bg-sidebar, #090A0D)' }}
        className="px-4 py-3 flex items-center justify-between border-b border-white/5 select-none cursor-default"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-200">
            {subject.trim() ? subject : 'New Message'}
          </span>
          {isConfidential && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> Confidential
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button 
            type="button"
            onClick={() => setIsMinimized(!isMinimized)} 
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button"
            onClick={() => { setIsMaximized(!isMaximized); setIsMinimized(false); }} 
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Error Banner */}
          {errorMessage && (
            <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errorMessage}
              </span>
              <button type="button" onClick={() => setErrorMessage(null)} className="hover:text-rose-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 2. Recipient Fields (To, CC, BCC, Subject) */}
          <div className="px-4 pt-2 pb-1 space-y-1 text-xs">
            
            {/* 'To' Field */}
            <div className="flex items-start gap-2 py-1 border-b border-white/5">
              <span className="text-slate-500 font-medium w-14 pt-1">Recipients</span>
              <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[26px]">
                {toChips.map((email) => (
                  <span 
                    key={email} 
                    style={{ backgroundColor: 'var(--theme-bg-sidebar, #1E232B)' }}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-slate-200 border border-white/10 text-xs animate-in fade-in"
                  >
                    <span>{email}</span>
                    <button 
                      type="button"
                      onClick={() => setToChips(toChips.filter((e) => e !== email))} 
                      className="hover:text-rose-400 text-slate-400"
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
                  placeholder={toChips.length === 0 ? "Type email address..." : ""} 
                  className="flex-1 min-w-[140px] bg-transparent text-xs text-white placeholder-slate-500 outline-none py-1" 
                />
              </div>
              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 pt-1 select-none">
                {!showCc && (
                  <button type="button" onClick={() => setShowCc(true)} className="hover:text-white transition-colors">
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button type="button" onClick={() => setShowBcc(true)} className="hover:text-white transition-colors">
                    Bcc
                  </button>
                )}
              </div>
            </div>

            {/* 'Cc' Field */}
            {showCc && (
              <div className="flex items-start gap-2 py-1 border-b border-white/5 animate-in fade-in">
                <span className="text-slate-500 font-medium w-14 pt-1">Cc</span>
                <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[26px]">
                  {ccChips.map((email) => (
                    <span 
                      key={email} 
                      style={{ backgroundColor: 'var(--theme-bg-sidebar, #1E232B)' }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-slate-200 border border-white/10 text-xs"
                    >
                      <span>{email}</span>
                      <button 
                        type="button"
                        onClick={() => setCcChips(ccChips.filter((e) => e !== email))} 
                        className="hover:text-rose-400 text-slate-400"
                      >
                        <X className="w-3 h-3" />
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

            {/* 'Bcc' Field */}
            {showBcc && (
              <div className="flex items-start gap-2 py-1 border-b border-white/5 animate-in fade-in">
                <span className="text-slate-500 font-medium w-14 pt-1">Bcc</span>
                <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[26px]">
                  {bccChips.map((email) => (
                    <span 
                      key={email} 
                      style={{ backgroundColor: 'var(--theme-bg-sidebar, #1E232B)' }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-slate-200 border border-white/10 text-xs"
                    >
                      <span>{email}</span>
                      <button 
                        type="button"
                        onClick={() => setBccChips(bccChips.filter((e) => e !== email))} 
                        className="hover:text-rose-400 text-slate-400"
                      >
                        <X className="w-3 h-3" />
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
              onKeyUp={saveSelection}
              onMouseUp={saveSelection}
              onBlur={saveSelection}
              className="flex-1 w-full bg-transparent text-sm text-slate-200 leading-relaxed outline-none min-h-[140px] focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-600 empty:before:pointer-events-none [&_ul]:list-disc [&_ul]:pl-7 [&_ul]:my-2 [&_ul_li]:list-disc [&_ol]:list-decimal [&_ol]:pl-7 [&_ol]:my-2 [&_ol_li]:list-decimal [&_li]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-500 [&_blockquote]:pl-3 [&_a]:text-blue-400 [&_a]:underline font-sans"
            />

            {/* Quoted Original Mail (Gmail '...' Button) */}
            {quotedHtml && (
              <div className="mt-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowQuotedInComposer(!showQuotedInComposer)}
                  className="px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white text-xs font-mono font-bold tracking-widest transition-all inline-flex items-center gap-1 shadow-sm select-none"
                  title="Show trimmed content"
                >
                  •••
                </button>

                {showQuotedInComposer && (
                  <div 
                    className="mt-3 pl-3.5 border-l-2 border-slate-700 text-xs text-slate-400 leading-relaxed max-w-none [&_a]:text-[#2D5BFF] [&_p]:my-1 animate-in fade-in"
                    dangerouslySetInnerHTML={{ __html: quotedHtml }}
                  />
                )}
              </div>
            )}

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
                      {Math.round(((att as any).sizeBytes ?? att.size ?? 0) / 1024)} KB
                    </span>
                    <button 
                      type="button"
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
                    onMouseDown={(e) => e.preventDefault()}
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
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleApplyFont(f.label, f.value)}
                          className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-white/10 flex items-center justify-between transition-colors"
                        >
                          <span style={{ fontFamily: f.value }} className={f.fontClass}>{f.label}</span>
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
                    onMouseDown={(e) => e.preventDefault()}
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
                          onMouseDown={(e) => e.preventDefault()}
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
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('bold')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 font-bold hover:text-white transition-colors"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>

                {/* Italic */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('italic')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 italic hover:text-white transition-colors"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>

                {/* Underline */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
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
                    onMouseDown={(e) => e.preventDefault()}
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
                            onMouseDown={(e) => e.preventDefault()}
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
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('justifyLeft')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Align left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('justifyCenter')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Align center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
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
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('insertOrderedList')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Numbered list"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>

                {/* Bulleted List */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('insertUnorderedList')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Bulleted list"
                >
                  <List className="w-3.5 h-3.5" />
                </button>

                {/* Indent / Outdent */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('outdent')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Indent less"
                >
                  <Outdent className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('indent')}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Indent more"
                >
                  <Indent className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
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
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('undo')}
                  className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
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
                  type="button"
                  onClick={() => handleSend()} 
                  disabled={isSending}
                  className="px-5 py-2 rounded-l-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <span>{isSending ? 'Sending...' : 'Send'}</span>
                  {!isSending && <Send className="w-3.5 h-3.5" />}
                </button>

                {/* Schedule Send Dropdown trigger */}
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(!isScheduleOpen)}
                  disabled={isSending}
                  className="px-2 py-2 rounded-r-full bg-blue-700 hover:bg-blue-600 text-white border-l border-blue-800 transition-colors flex items-center justify-center disabled:opacity-50"
                  title="Schedule send"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* Schedule Send Modal Dropdown */}
                {isScheduleOpen && (
                  <div 
                    style={{
                      backgroundColor: 'var(--theme-bg-card, #12141A)',
                      borderColor: 'var(--theme-border, #1E232B)',
                    }}
                    className="absolute left-0 bottom-full mb-2 w-60 rounded-xl border shadow-2xl py-2 z-50 animate-in fade-in"
                  >
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Schedule send
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        d.setHours(8, 0, 0, 0);
                        handleSend(d);
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/10 flex items-center justify-between transition-colors"
                    >
                      <span>Tomorrow morning</span>
                      <span className="text-[11px] text-slate-500 font-mono">8:00 AM</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        d.setHours(13, 0, 0, 0);
                        handleSend(d);
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/10 flex items-center justify-between transition-colors"
                    >
                      <span>Tomorrow afternoon</span>
                      <span className="text-[11px] text-slate-500 font-mono">1:00 PM</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        d.setHours(8, 0, 0, 0);
                        handleSend(d);
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/10 flex items-center justify-between transition-colors border-t border-white/5 mt-1"
                    >
                      <span>Next week</span>
                      <span className="text-[11px] text-slate-500 font-mono">Mon, 8:00 AM</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Toggle Formatting Bar (Aa) */}
              <button 
                type="button"
                onClick={() => setShowFormatting(!showFormatting)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  showFormatting 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
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

              {/* Full Categorized Emoji Picker (😀) */}
              <div className="relative">
                <button 
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                  className={`p-2 rounded-lg transition-colors ${
                    isEmojiPickerOpen 
                      ? 'bg-amber-500/20 text-amber-300' 
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
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
                    className="absolute left-0 bottom-full mb-2 p-3 rounded-2xl border shadow-2xl z-50 w-72 animate-in fade-in flex flex-col gap-2"
                  >
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        value={emojiSearch}
                        onChange={(e) => setEmojiSearch(e.target.value)}
                        placeholder="Search emojis..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Category Tabs */}
                    {!emojiSearch.trim() && (
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 px-1">
                        {EMOJI_CATEGORIES.map((cat, idx) => (
                          <button
                            key={cat.name}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setEmojiCategory(idx)}
                            className={`p-1 rounded-lg text-sm transition-all ${
                              emojiCategory === idx 
                                ? 'bg-blue-500/20 text-blue-400 scale-110' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                            title={cat.name}
                          >
                            <span>{cat.icon}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Emoji Grid */}
                    <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto custom-scrollbar p-1">
                      {filteredEmojis.map((e, idx) => (
                        <button
                          key={`${e}-${idx}`}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleInsertEmoji(e)}
                          className="w-8 h-8 rounded-lg hover:bg-white/15 text-lg flex items-center justify-center transition-transform hover:scale-125"
                        >
                          <span>{e}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Insert Signature */}
              <button
                type="button"
                onClick={handleInsertSignature}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs font-semibold"
                title="Insert signature"
              >
                <Type className="w-4 h-4" />
              </button>

              {/* Confidential Mode */}
              <button
                type="button"
                onClick={() => setIsConfidential(!isConfidential)}
                className={`p-2 rounded-lg transition-colors ${
                  isConfidential 
                    ? 'bg-amber-500/20 text-amber-300' 
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title="Confidential mode"
              >
                {isConfidential ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4" />}
              </button>
            </div>

            {/* Right Actions (Trash / Draft) */}
            <div className="flex items-center gap-1">
              <button 
                type="button"
                onClick={() => {
                  if (onSaveDraft) {
                    const textContent = editorRef.current?.innerText || '';
                    const htmlContent = editorRef.current?.innerHTML || '';
                    onSaveDraft({
                      to: toChips,
                      cc: ccChips,
                      bcc: bccChips,
                      subject,
                      body: textContent,
                      bodyText: textContent,
                      bodyHtml: htmlContent,
                      attachments,
                    });
                  }
                  onClose();
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Discard draft"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* AI Helper Flyout Drawer */}
          {isAiOpen && (
            <div 
              style={{
                backgroundColor: 'var(--theme-bg-sidebar, #090A0D)',
                borderColor: 'var(--theme-border, #1E232B)',
              }}
              className="p-3 border-t flex flex-col gap-2 z-30 animate-in slide-in-from-bottom-2"
            >
              <div className="flex items-center justify-between text-xs font-medium text-purple-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Help me write
                </span>
                <button type="button" onClick={() => setIsAiOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateAi()}
                  placeholder="e.g. Write a friendly follow-up about the project roadmap..."
                  className="flex-1 bg-white/5 border border-purple-500/30 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={handleGenerateAi}
                  disabled={isGeneratingAi || !aiPrompt.trim()}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>{isGeneratingAi ? 'Writing...' : 'Generate'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Hidden File Inputs */}
          <input 
            type="file" 
            ref={fileInputRef} 
            multiple 
            className="hidden" 
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (files.length === 0) return;
              const newAtts: ComposerAttachment[] = [];
              for (const file of files) {
                const dataBase64 = await fileToBase64(file);
                newAtts.push({
                  id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  name: file.name,
                  contentType: file.type || 'application/octet-stream',
                  sizeBytes: file.size,
                  dataBase64,
                });
              }
              setAttachments([...attachments, ...newAtts]);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }} 
          />
          <input 
            type="file" 
            ref={imageInputRef} 
            accept="image/*" 
            className="hidden" 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const base64 = await fileToBase64(file);
              const imgHtml = `<img src="data:${file.type};base64,${base64}" alt="${file.name}" style="max-width:100%; border-radius:8px; margin:8px 0;" />`;
              restoreSelection();
              document.execCommand('insertHTML', false, imgHtml);
              saveSelection();
              if (imageInputRef.current) imageInputRef.current.value = '';
            }} 
          />
        </>
      )}
    </div>
  );
};

export default MailComposer;
