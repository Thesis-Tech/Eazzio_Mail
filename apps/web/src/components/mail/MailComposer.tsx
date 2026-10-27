'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Minus, Maximize2, Minimize2, ChevronDown, 
  Paperclip, Image, Trash2, Send, Clock, Sparkles, 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  List, ListOrdered, Indent, Outdent, Link2, Smile, 
  Type, Check, AlertCircle, FileDown, Lock, Unlock,
  RemoveFormatting, Undo2, Redo2, Search, Calendar
} from 'lucide-react';
import { ComposerAttachment, ComposeEmailPayload } from '@/types/mail';
import { AuthStore } from '@/lib/auth-store';
import { sanitizeEmailHtml } from '@/lib/sanitizeHtml';
export type { ComposerAttachment, ComposeEmailPayload };

interface MailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (payload: ComposeEmailPayload) => Promise<void>;
  onSaveDraft?: (payload: ComposeEmailPayload) => Promise<void>;
  initialFrom?: string;
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
  initialFrom,
  initialTo = [], initialCc = [], initialBcc = [],
  initialSubject = '', initialBody = '', initialAttachments = [],
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Sender ("From") State
  const currentUserEmail = AuthStore.getState().user?.email || 'kumarrahul0@eazzio.com';
  const currentUserName = AuthStore.getState().user?.displayName || 'Active User';
  const [selectedFrom, setSelectedFrom] = useState<string>(initialFrom || currentUserEmail);
  const [isFromDropdownOpen, setIsFromDropdownOpen] = useState(false);

  // Available Sender Accounts / Aliases
  const availableSenders = React.useMemo(() => {
    const list: Array<{ label: string; email: string; isPrimary?: boolean; type?: 'primary' | 'automated' | 'system' }> = [];
    if (currentUserEmail && !currentUserEmail.toLowerCase().startsWith('no-reply@') && !currentUserEmail.toLowerCase().startsWith('noreply@')) {
      list.push({ label: `${currentUserName} <${currentUserEmail}>`, email: currentUserEmail, isPrimary: true, type: 'primary' });
    }
    // Include common domain aliases (support & billing are automated role mailboxes users can use)
    const domain = currentUserEmail.includes('@') ? currentUserEmail.split('@')[1] : 'eazzio.com';
    const alias1 = `support@${domain}`;
    const alias2 = `billing@${domain}`;
    if (!list.some(s => s.email.toLowerCase() === alias1.toLowerCase())) {
      list.push({ label: `Support <${alias1}>`, email: alias1, type: 'automated' });
    }
    if (!list.some(s => s.email.toLowerCase() === alias2.toLowerCase())) {
      list.push({ label: `Billing <${alias2}>`, email: alias2, type: 'automated' });
    }
    // Strictly filter out any no-reply / system-generated senders
    return list.filter(s => !s.email.toLowerCase().startsWith('no-reply@') && !s.email.toLowerCase().startsWith('noreply@'));
  }, [currentUserEmail, currentUserName]);

  // Recipient Fields
  const [toInput, setToInput] = useState('');
  const [toChips, setToChips] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [ccInput, setCcInput] = useState('');
  const [ccChips, setCcChips] = useState<string[]>([]);
  const [showBcc, setShowBcc] = useState(false);
  const [bccInput, setBccInput] = useState('');
  const [bccChips, setBccChips] = useState<string[]>([]);

  // Contact Autocomplete Suggestions (FE-001)
  const [contactSuggestions, setContactSuggestions] = useState<Array<{ email: string; name?: string }>>([]);
  const [activeAutocompleteField, setActiveAutocompleteField] = useState<'to' | 'cc' | 'bcc' | null>(null);

  useEffect(() => {
    const activeQuery = activeAutocompleteField === 'to' ? toInput : activeAutocompleteField === 'cc' ? ccInput : activeAutocompleteField === 'bcc' ? bccInput : '';
    if (!activeQuery || activeQuery.trim().length < 1) {
      setContactSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/contacts?q=${encodeURIComponent(activeQuery.trim())}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            setContactSuggestions(json.data);
          }
        }
      } catch {
        setContactSuggestions([]);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [toInput, ccInput, bccInput, activeAutocompleteField]);
  
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
  const [isCustomScheduleOpen, setIsCustomScheduleOpen] = useState(false);
  const [customScheduleDate, setCustomScheduleDate] = useState('');
  const [customScheduleTime, setCustomScheduleTime] = useState('09:00');
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
      setSelectedFrom(initialFrom || currentUserEmail);
      setIsFromDropdownOpen(false);
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

    // Prevent outbound compose from system-generated no-reply addresses
    const normalizedSender = (selectedFrom || '').toLowerCase().trim();
    if (normalizedSender.startsWith('no-reply@') || normalizedSender.startsWith('noreply@')) {
      return setErrorMessage('System-generated no-reply addresses cannot be used to compose messages.');
    }

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
        from: selectedFrom,
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

  // Keep keyboard shortcut handler ref synchronized with latest state
  const handleKeyDownRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  handleKeyDownRef.current = (e: KeyboardEvent) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    // 1. Send Email: Ctrl + Enter / Cmd + Enter
    if (isCtrlOrCmd && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
      return;
    }

    // 2. Bold: Ctrl + B / Cmd + B
    if (isCtrlOrCmd && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      executeCommand('bold');
      return;
    }

    // 3. Italic: Ctrl + I / Cmd + I
    if (isCtrlOrCmd && (e.key === 'i' || e.key === 'I')) {
      e.preventDefault();
      executeCommand('italic');
      return;
    }

    // 4. Underline: Ctrl + U / Cmd + U
    if (isCtrlOrCmd && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      executeCommand('underline');
      return;
    }

    // 5. Insert Link: Ctrl + K / Cmd + K
    if (isCtrlOrCmd && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      handleInsertLink();
      return;
    }

    // 6. Show Cc: Ctrl + Shift + C
    if (isCtrlOrCmd && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      setShowCc(true);
      return;
    }

    // 7. Show Bcc: Ctrl + Shift + B
    if (isCtrlOrCmd && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      setShowBcc(true);
      return;
    }

    // 8. Close / Minimize on Escape (if not in an active dropdown/input autocomplete)
    if (e.key === 'Escape') {
      if (isFontDropdownOpen || isSizeDropdownOpen || isColorDropdownOpen || isEmojiPickerOpen || isScheduleOpen || isFromDropdownOpen) {
        setIsFontDropdownOpen(false);
        setIsSizeDropdownOpen(false);
        setIsColorDropdownOpen(false);
        setIsEmojiPickerOpen(false);
        setIsScheduleOpen(false);
        setIsFromDropdownOpen(false);
      } else {
        onClose();
      }
    }
  };

  // Global & In-Composer Keyboard Shortcuts (Gmail Parity)
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      handleKeyDownRef.current?.(e);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  // Filter emojis by search keyword
  const currentCategoryEmojis = EMOJI_CATEGORIES[emojiCategory]?.emojis || [];
  const filteredEmojis = emojiSearch.trim()
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis)
    : currentCategoryEmojis;

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed z-[100] transition-all duration-200 shadow-2xl flex flex-col bg-white border border-[#CBD5E1] overflow-hidden ${
        isMinimized 
          ? 'bottom-0 right-4 w-72 h-12 rounded-t-xl' 
          : isMaximized 
          ? 'inset-3 md:inset-8 rounded-2xl' 
          : 'bottom-0 right-4 md:right-16 w-full sm:w-[620px] h-[640px] max-h-[90vh] rounded-t-2xl shadow-[0_-10px_50px_rgba(0,0,0,0.15)]'
      }`}
    >
      {/* 1. Window Header */}
      <div 
        className="px-4 py-3 flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] select-none cursor-default"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#0F172A]">
            {subject.trim() ? subject : 'New Message'}
          </span>
          {isConfidential && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> Confidential
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button 
            type="button"
            onClick={() => setIsMinimized(!isMinimized)} 
            className="p-1 rounded hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button"
            onClick={() => { setIsMaximized(!isMaximized); setIsMinimized(false); }} 
            className="p-1 rounded hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] transition-colors"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 rounded hover:bg-rose-50 text-[#64748B] hover:text-rose-600 transition-colors"
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
            <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-600 text-xs flex items-center justify-between font-medium">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errorMessage}
              </span>
              <button type="button" onClick={() => setErrorMessage(null)} className="hover:text-rose-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 2. Recipient Fields (From, To, CC, BCC, Subject) */}
          <div className="px-4 pt-2 pb-1 space-y-1 text-xs bg-white">
            
            {/* 'From' Selector Field (Gmail/Outlook Parity) */}
            <div className="relative flex items-center justify-between gap-2 py-1 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[#64748B] font-semibold w-16 select-none shrink-0">From</span>
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={() => setIsFromDropdownOpen(!isFromDropdownOpen)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] transition-all max-w-full truncate shadow-2xs"
                    title="Select sender address / alias"
                  >
                    <span className="truncate">{selectedFrom}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                  </button>

                  {isFromDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 w-80 bg-white rounded-xl shadow-2xl border border-[#CBD5E1] py-1.5 z-50 animate-in fade-in">
                      <div className="px-3 py-1 text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#F1F5F9]">
                        Send message as
                      </div>
                      {availableSenders.map((sender) => {
                        const isSelected = sender.email.toLowerCase() === selectedFrom.toLowerCase();
                        return (
                          <button
                            key={sender.email}
                            type="button"
                            onClick={() => {
                              setSelectedFrom(sender.email);
                              setIsFromDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors border-b border-[#F8FAFC] last:border-0 ${
                              isSelected ? 'bg-[#F0FDFA] text-[#0F766E]' : 'hover:bg-[#F8FAFC] text-[#0F172A]'
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="font-semibold truncate">{sender.label}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {sender.isPrimary && (
                                  <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#CCFBF1] text-[#0F766E]">
                                    Default Mailbox
                                  </span>
                                )}
                                {sender.type === 'automated' && (
                                  <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#E0F2FE] text-[#0369A1]">
                                    Automated Service Mailbox
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-[#0D9488] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 'To' Field */}
            <div className="relative flex items-start gap-2 py-1 border-b border-[#E2E8F0]">
              <span className="text-[#64748B] font-semibold w-16 pt-1">Recipients</span>
              <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[26px]">
                {toChips.map((email) => (
                  <span 
                    key={email} 
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[#0F766E] bg-[#F0FDFA] border border-[#CCFBF1] text-xs font-medium animate-in fade-in"
                  >
                    <span>{email}</span>
                    <button 
                      type="button"
                      onClick={() => setToChips(toChips.filter((e) => e !== email))} 
                      className="hover:text-rose-600 text-[#64748B]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input 
                  type="text" 
                  value={toInput} 
                  onFocus={() => setActiveAutocompleteField('to')}
                  onChange={(e) => {
                    setToInput(e.target.value);
                    setActiveAutocompleteField('to');
                  }} 
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { 
                      e.preventDefault(); 
                      handleAddChip('to', toInput); 
                      setActiveAutocompleteField(null);
                    } 
                  }} 
                  onBlur={() => {
                    setTimeout(() => {
                      if (activeAutocompleteField === 'to') {
                        handleAddChip('to', toInput);
                        setActiveAutocompleteField(null);
                      }
                    }, 200);
                  }} 
                  placeholder={toChips.length === 0 ? "Type email address..." : ""} 
                  className="flex-1 min-w-[140px] bg-transparent text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none py-1" 
                />
              </div>

              {/* Autocomplete Suggestions Dropdown (FE-001) */}
              {activeAutocompleteField === 'to' && contactSuggestions.length > 0 && (
                <div className="absolute left-16 top-full mt-1 w-72 bg-white rounded-xl shadow-2xl border border-[#CBD5E1] py-1 z-50 animate-in fade-in max-h-48 overflow-y-auto">
                  <div className="px-3 py-1 text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#F1F5F9]">
                    Suggested Contacts
                  </div>
                  {contactSuggestions.map((c) => (
                    <button
                      key={c.email}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setToChips([...toChips, c.email]);
                        setToInput('');
                        setContactSuggestions([]);
                        setActiveAutocompleteField(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-[#F0FDFA] flex flex-col transition-colors border-b border-[#F8FAFC] last:border-0"
                    >
                      <span className="font-semibold text-[#0F172A]">{c.name || c.email.split('@')[0]}</span>
                      <span className="text-[11px] text-[#0F766E] font-mono">{c.email}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 text-[11px] font-semibold text-[#64748B] pt-1 select-none">
                {!showCc && (
                  <button type="button" onClick={() => setShowCc(true)} className="hover:text-[#0F172A] transition-colors">
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button type="button" onClick={() => setShowBcc(true)} className="hover:text-[#0F172A] transition-colors">
                    Bcc
                  </button>
                )}
              </div>
            </div>

            {/* 'Cc' Field */}
            {showCc && (
              <div className="relative flex items-start gap-2 py-1 border-b border-[#E2E8F0] animate-in fade-in">
                <span className="text-[#64748B] font-semibold w-16 pt-1">Cc</span>
                <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[26px]">
                  {ccChips.map((email) => (
                    <span 
                      key={email} 
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[#0F766E] bg-[#F0FDFA] border border-[#CCFBF1] text-xs font-medium"
                    >
                      <span>{email}</span>
                      <button 
                        type="button"
                        onClick={() => setCcChips(ccChips.filter((e) => e !== email))} 
                        className="hover:text-rose-600 text-[#64748B]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input 
                    type="text" 
                    value={ccInput} 
                    onFocus={() => setActiveAutocompleteField('cc')}
                    onChange={(e) => {
                      setCcInput(e.target.value);
                      setActiveAutocompleteField('cc');
                    }} 
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { 
                        e.preventDefault(); 
                        handleAddChip('cc', ccInput); 
                        setActiveAutocompleteField(null);
                      } 
                    }} 
                    onBlur={() => {
                      setTimeout(() => {
                        if (activeAutocompleteField === 'cc') {
                          handleAddChip('cc', ccInput);
                          setActiveAutocompleteField(null);
                        }
                      }, 200);
                    }} 
                    className="flex-1 min-w-[120px] bg-transparent text-xs text-[#0F172A] outline-none py-1" 
                  />
                </div>
                {activeAutocompleteField === 'cc' && contactSuggestions.length > 0 && (
                  <div className="absolute left-16 top-full mt-1 w-72 bg-white rounded-xl shadow-2xl border border-[#CBD5E1] py-1 z-50 animate-in fade-in max-h-48 overflow-y-auto">
                    <div className="px-3 py-1 text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#F1F5F9]">
                      Suggested Contacts
                    </div>
                    {contactSuggestions.map((c) => (
                      <button
                        key={c.email}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setCcChips([...ccChips, c.email]);
                          setCcInput('');
                          setContactSuggestions([]);
                          setActiveAutocompleteField(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-[#F0FDFA] flex flex-col transition-colors border-b border-[#F8FAFC] last:border-0"
                      >
                        <span className="font-semibold text-[#0F172A]">{c.name || c.email.split('@')[0]}</span>
                        <span className="text-[11px] text-[#0F766E] font-mono">{c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 'Bcc' Field */}
            {showBcc && (
              <div className="relative flex items-start gap-2 py-1 border-b border-[#E2E8F0] animate-in fade-in">
                <span className="text-[#64748B] font-semibold w-16 pt-1">Bcc</span>
                <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[26px]">
                  {bccChips.map((email) => (
                    <span 
                      key={email} 
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[#0F766E] bg-[#F0FDFA] border border-[#CCFBF1] text-xs font-medium"
                    >
                      <span>{email}</span>
                      <button 
                        type="button"
                        onClick={() => setBccChips(bccChips.filter((e) => e !== email))} 
                        className="hover:text-rose-600 text-[#64748B]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input 
                    type="text" 
                    value={bccInput} 
                    onFocus={() => setActiveAutocompleteField('bcc')}
                    onChange={(e) => {
                      setBccInput(e.target.value);
                      setActiveAutocompleteField('bcc');
                    }} 
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { 
                        e.preventDefault(); 
                        handleAddChip('bcc', bccInput); 
                        setActiveAutocompleteField(null);
                      } 
                    }} 
                    onBlur={() => {
                      setTimeout(() => {
                        if (activeAutocompleteField === 'bcc') {
                          handleAddChip('bcc', bccInput);
                          setActiveAutocompleteField(null);
                        }
                      }, 200);
                    }} 
                    className="flex-1 min-w-[120px] bg-transparent text-xs text-[#0F172A] outline-none py-1" 
                  />
                </div>
                {activeAutocompleteField === 'bcc' && contactSuggestions.length > 0 && (
                  <div className="absolute left-16 top-full mt-1 w-72 bg-white rounded-xl shadow-2xl border border-[#CBD5E1] py-1 z-50 animate-in fade-in max-h-48 overflow-y-auto">
                    <div className="px-3 py-1 text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#F1F5F9]">
                      Suggested Contacts
                    </div>
                    {contactSuggestions.map((c) => (
                      <button
                        key={c.email}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setBccChips([...bccChips, c.email]);
                          setBccInput('');
                          setContactSuggestions([]);
                          setActiveAutocompleteField(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-[#F0FDFA] flex flex-col transition-colors border-b border-[#F8FAFC] last:border-0"
                      >
                        <span className="font-semibold text-[#0F172A]">{c.name || c.email.split('@')[0]}</span>
                        <span className="text-[11px] text-[#0F766E] font-mono">{c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Subject Line */}
            <div className="border-b border-[#E2E8F0] pt-1.5 pb-2">
              <input 
                type="text" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                placeholder="Subject" 
                className="w-full bg-transparent text-sm font-semibold text-[#0F172A] placeholder-[#94A3B8] outline-none" 
              />
            </div>
          </div>

          {/* 3. Content-Editable Body Canvas */}
          <div className="flex-1 flex flex-col p-4 min-h-0 overflow-y-auto custom-scrollbar relative bg-white">
            <div 
              ref={editorRef}
              contentEditable="true"
              suppressContentEditableWarning={true}
              data-placeholder="Write your email here..."
              onKeyUp={saveSelection}
              onMouseUp={saveSelection}
              onBlur={saveSelection}
              className="flex-1 w-full bg-transparent text-sm text-[#1E293B] leading-relaxed outline-none min-h-[140px] focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#94A3B8] empty:before:pointer-events-none [&_ul]:list-disc [&_ul]:pl-7 [&_ul]:my-2 [&_ul_li]:list-disc [&_ol]:list-decimal [&_ol]:pl-7 [&_ol]:my-2 [&_ol_li]:list-decimal [&_li]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-[#CBD5E1] [&_blockquote]:pl-3 [&_a]:text-[#0F766E] [&_a]:underline font-sans"
            />

            {/* Quoted Original Mail */}
            {quotedHtml && (
              <div className="mt-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowQuotedInComposer(!showQuotedInComposer)}
                  className="px-2.5 py-0.5 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] text-xs font-mono font-bold tracking-widest transition-all inline-flex items-center gap-1 shadow-sm select-none"
                  title="Show trimmed content"
                >
                  •••
                </button>

                {showQuotedInComposer && (
                  <div 
                    className="mt-3 pl-3.5 border-l-2 border-[#CBD5E1] text-xs text-[#64748B] leading-relaxed max-w-none [&_a]:text-[#0F766E] [&_p]:my-1 animate-in fade-in"
                    dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(quotedHtml) }}
                  />
                )}
              </div>
            )}

            {/* Attachment preview chips */}
            {attachments.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex flex-wrap gap-2">
                {attachments.map((att) => (
                  <div 
                    key={att.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#CBD5E1] transition-colors group cursor-default shadow-sm text-xs"
                  >
                    <FileDown className="w-3.5 h-3.5 text-[#14B8A6]" />
                    <span className="font-semibold text-[#0F172A] max-w-[160px] truncate">{att.name}</span>
                    <span className="text-[10px] font-mono text-[#64748B]">
                      {Math.round(((att as any).sizeBytes ?? att.size ?? 0) / 1024)} KB
                    </span>
                    <button 
                      type="button"
                      onClick={() => setAttachments(attachments.filter((a) => a.id !== att.id))} 
                      className="ml-1 text-[#64748B] hover:text-rose-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Formatting Bar (Toggled by Aa) */}
          {showFormatting && (
            <div 
              className="px-3 py-1.5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-1 text-xs select-none relative z-30"
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
                    className="px-2.5 py-1 rounded hover:bg-[#E2E8F0] text-[#334155] font-medium flex items-center gap-1.5 transition-colors text-xs"
                  >
                    <span>{currentFont}</span>
                    <ChevronDown className="w-3 h-3 text-[#64748B]" />
                  </button>

                  {isFontDropdownOpen && (
                    <div 
                      className="absolute left-0 bottom-full mb-1 w-44 rounded-xl bg-white border border-[#E2E8F0] shadow-xl py-1 z-50 animate-in fade-in"
                    >
                      {FONT_FAMILIES.map((f) => (
                        <button
                          key={f.label}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleApplyFont(f.label, f.value)}
                          className="w-full px-3 py-1.5 text-left text-xs text-[#334155] hover:bg-[#F1F5F9] flex items-center justify-between transition-colors"
                        >
                          <span style={{ fontFamily: f.value }} className={f.fontClass}>{f.label}</span>
                          {currentFont === f.label && <Check className="w-3.5 h-3.5 text-[#14B8A6]" />}
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
                    className="px-2 py-1 rounded hover:bg-[#E2E8F0] text-[#334155] font-medium flex items-center gap-1 transition-colors text-xs"
                  >
                    <span className="font-bold">T<span className="text-[10px]">T</span></span>
                    <ChevronDown className="w-3 h-3 text-[#64748B]" />
                  </button>

                  {isSizeDropdownOpen && (
                    <div 
                      className="absolute left-0 bottom-full mb-1 w-32 rounded-xl bg-white border border-[#E2E8F0] shadow-xl py-1 z-50 animate-in fade-in"
                    >
                      {FONT_SIZES.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleApplySize(s.label, s.cmd)}
                          className="w-full px-3 py-1.5 text-left text-xs text-[#334155] hover:bg-[#F1F5F9] flex items-center justify-between transition-colors"
                        >
                          <span>{s.label}</span>
                          {currentSize === s.label && <Check className="w-3.5 h-3.5 text-[#14B8A6]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-[1px] h-4 mx-1 bg-[#CBD5E1]"></div>

                {/* Bold */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('bold')}
                  className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#334155] font-bold hover:text-[#0F172A] transition-colors"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>

                {/* Italic */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('italic')}
                  className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#334155] italic hover:text-[#0F172A] transition-colors"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>

                {/* Underline */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('underline')}
                  className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#334155] underline hover:text-[#0F172A] transition-colors"
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
                    className="px-1.5 py-1 rounded hover:bg-[#E2E8F0] text-[#334155] flex items-center gap-0.5 transition-colors"
                    title="Text color"
                  >
                    <span className="font-bold border-b-2 border-[#14B8A6] text-xs px-0.5">A</span>
                    <ChevronDown className="w-2.5 h-2.5 text-[#64748B]" />
                  </button>

                  {isColorDropdownOpen && (
                    <div 
                      className="absolute left-0 bottom-full mb-1 p-2.5 rounded-xl bg-white border border-[#E2E8F0] shadow-xl z-50 animate-in fade-in w-48"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-[#64748B] font-bold mb-1.5">Text Color</div>
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
                            className="w-5 h-5 rounded-md border border-[#E2E8F0] hover:scale-110 transition-transform"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-[1px] h-4 mx-1 bg-[#CBD5E1]"></div>

                {/* Alignment */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('justifyLeft')}
                  className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#334155] hover:text-[#0F172A] transition-colors"
                  title="Align left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('justifyCenter')}
                  className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#334155] hover:text-[#0F172A] transition-colors"
                  title="Align center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('justifyRight')}
                  className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#334155] hover:text-[#0F172A] transition-colors"
                  title="Align right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-4 mx-1 bg-[#CBD5E1]"></div>

                {/* Numbered List */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('insertOrderedList')}
                  className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#334155] hover:text-[#0F172A] transition-colors"
                  title="Numbered list"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>

                {/* Bulleted List */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('insertUnorderedList')}
                  className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#334155] hover:text-[#0F172A] transition-colors"
                  title="Bulleted list"
                >
                  <List className="w-3.5 h-3.5" />
                </button>

                {/* Indent / Outdent */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('outdent')}
                  className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#334155] hover:text-[#0F172A] transition-colors"
                  title="Indent less"
                >
                  <Outdent className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('indent')}
                  className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#334155] hover:text-[#0F172A] transition-colors"
                  title="Indent more"
                >
                  <Indent className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('removeFormat')}
                  className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#334155] hover:text-rose-600 transition-colors ml-1"
                  title="Remove formatting"
                >
                  <RemoveFormatting className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Right Undo / Redo */}
              <div className="flex items-center gap-0.5 text-[#64748B]">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('undo')}
                  className="p-1.5 rounded hover:bg-[#E2E8F0] hover:text-[#0F172A] transition-colors"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand('redo')}
                  className="p-1.5 rounded hover:bg-[#E2E8F0] hover:text-[#0F172A] transition-colors"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* 5. Bottom Action Bar */}
          <div 
            className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between z-20"
          >
            {/* Left Actions */}
            <div className="flex items-center gap-2">
              
              {/* Send Button Split Pill */}
              <div className="relative inline-flex rounded-xl shadow-sm">
                <button 
                  type="button"
                  onClick={() => handleSend()} 
                  disabled={isSending}
                  title="Send (Ctrl+Enter)"
                  className="px-5 py-2 rounded-l-xl bg-[#14B8A6] hover:bg-[#0D9488] active:bg-[#0F766E] text-white font-semibold text-xs flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
                >
                  <span>{isSending ? 'Sending...' : 'Send'}</span>
                  {!isSending && <Send className="w-3.5 h-3.5" />}
                </button>

                {/* Schedule Send Dropdown trigger */}
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(!isScheduleOpen)}
                  disabled={isSending}
                  className="px-2 py-2 rounded-r-xl bg-[#0D9488] hover:bg-[#0F766E] text-white border-l border-[#0F766E]/40 transition-colors flex items-center justify-center disabled:opacity-50"
                  title="Schedule send"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* Schedule Send Modal Dropdown */}
                {isScheduleOpen && (
                  <div 
                    className="absolute left-0 bottom-full mb-2 w-60 rounded-xl bg-white border border-[#E2E8F0] shadow-xl py-2 z-50 animate-in fade-in"
                  >
                    <div className="px-3 py-1.5 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
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
                      className="w-full px-3 py-2 text-left text-xs text-[#334155] hover:bg-[#F1F5F9] flex items-center justify-between transition-colors"
                    >
                      <span>Tomorrow morning</span>
                      <span className="text-[11px] text-[#64748B] font-mono">8:00 AM</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        d.setHours(13, 0, 0, 0);
                        handleSend(d);
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-[#334155] hover:bg-[#F1F5F9] flex items-center justify-between transition-colors"
                    >
                      <span>Tomorrow afternoon</span>
                      <span className="text-[11px] text-[#64748B] font-mono">1:00 PM</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        d.setHours(8, 0, 0, 0);
                        handleSend(d);
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-[#334155] hover:bg-[#F1F5F9] flex items-center justify-between transition-colors border-t border-[#E2E8F0] mt-1"
                    >
                      <span>Next week</span>
                      <span className="text-[11px] text-[#64748B] font-mono">Mon, 8:00 AM</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsScheduleOpen(false);
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        setCustomScheduleDate(tomorrow.toISOString().split('T')[0] || '');
                        setCustomScheduleTime('09:00');
                        setIsCustomScheduleOpen(true);
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-[#0D9488] font-semibold hover:bg-[#F0FDFA] flex items-center gap-2 transition-colors border-t border-[#E2E8F0] mt-1"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Pick date & time</span>
                    </button>
                  </div>
                )}

                {/* Custom Schedule Date & Time Picker Dialog */}
                {isCustomScheduleOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
                    <div className="w-full max-w-sm rounded-2xl bg-white border border-[#CBD5E1] shadow-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
                          <Clock className="w-4 h-4 text-[#0D9488]" />
                          <span>Schedule send</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsCustomScheduleOpen(false)}
                          className="p-1 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#475569] mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            value={customScheduleDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setCustomScheduleDate(e.target.value)}
                            className="w-full px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#475569] mb-1">
                            Time
                          </label>
                          <input
                            type="time"
                            value={customScheduleTime}
                            onChange={(e) => setCustomScheduleTime(e.target.value)}
                            className="w-full px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                        <button
                          type="button"
                          onClick={() => setIsCustomScheduleOpen(false)}
                          className="px-3.5 py-1.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!customScheduleDate) return;
                            const [year, month, day] = customScheduleDate.split('-').map(Number);
                            const [hours, minutes] = customScheduleTime.split(':').map(Number);
                            const scheduleDate = new Date(year!, month! - 1, day!, hours || 0, minutes || 0, 0);

                            if (scheduleDate.getTime() <= Date.now()) {
                              alert('Please select a future date and time for scheduled send.');
                              return;
                            }

                            setIsCustomScheduleOpen(false);
                            handleSend(scheduleDate);
                          }}
                          className="px-4 py-1.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shadow-sm transition-all"
                        >
                          Schedule send
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Toggle Formatting Bar (Aa) */}
              <button 
                type="button" 
                onClick={() => setShowFormatting(!showFormatting)} 
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  showFormatting 
                    ? 'bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]' 
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]'
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
                className="p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors"
                title="Attach files"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Insert Link (🔗) */}
              <button 
                type="button" 
                onClick={handleInsertLink}
                className="p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors"
                title="Insert link (Ctrl+K)"
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
                      ? 'bg-amber-100 text-amber-800' 
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]'
                  }`}
                  title="Insert emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {isEmojiPickerOpen && (
                  <div 
                    className="absolute left-0 bottom-full mb-2 p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xl z-50 w-72 animate-in fade-in flex flex-col gap-2"
                  >
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        value={emojiSearch}
                        onChange={(e) => setEmojiSearch(e.target.value)}
                        placeholder="Search emojis..."
                        className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg pl-8 pr-3 py-1 text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#14B8A6]"
                      />
                    </div>

                    {/* Category Tabs */}
                    {!emojiSearch.trim() && (
                      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-1.5 px-1">
                        {EMOJI_CATEGORIES.map((cat, idx) => (
                          <button
                            key={cat.name}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setEmojiCategory(idx)}
                            className={`p-1 rounded-lg text-sm transition-all ${
                              emojiCategory === idx 
                                ? 'bg-[#F0FDFA] text-[#0F766E] scale-110' 
                                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
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
                          className="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] text-lg flex items-center justify-center transition-transform hover:scale-125"
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
                className="p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors text-xs font-semibold"
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
                    ? 'bg-amber-100 text-amber-800' 
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]'
                }`}
                title="Confidential mode"
              >
                {isConfidential ? <Lock className="w-4 h-4 text-amber-600" /> : <Unlock className="w-4 h-4" />}
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
                className="p-2 rounded-lg text-[#64748B] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Discard draft"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* AI Helper Flyout Drawer */}
          {isAiOpen && (
            <div 
              className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col gap-2 z-30 animate-in slide-in-from-bottom-2"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#0F766E]">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#14B8A6]" /> Help me write
                </span>
                <button type="button" onClick={() => setIsAiOpen(false)} className="text-[#64748B] hover:text-[#0F172A]">
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
                  className="flex-1 bg-white border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#14B8A6]"
                />
                <button
                  type="button"
                  onClick={handleGenerateAi}
                  disabled={isGeneratingAi || !aiPrompt.trim()}
                  className="px-4 py-1.5 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white font-semibold text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
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
