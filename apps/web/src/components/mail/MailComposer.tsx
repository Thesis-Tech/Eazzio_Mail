'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X, Minus, Maximize2, Minimize2, Send, Paperclip, Trash2, Bold, Italic, 
  Underline, List, ListOrdered, Link2, Sparkles, Clock, ChevronDown, 
  AlertCircle, Save, Shield, ShieldCheck, FileDown, Type
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

export const MailComposer: React.FC<MailComposerProps> = ({
  isOpen, onClose, onSend, onSaveDraft,
  initialTo = [], initialCc = [], initialBcc = [],
  initialSubject = '', initialBody = '', initialAttachments = [],
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
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
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isSecure, setIsSecure] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setToChips([...initialTo]);
      setCcChips([...initialCc]);
      setShowCc(initialCc.length > 0);
      setBccChips([...initialBcc]);
      setShowBcc(initialBcc.length > 0);
      setSubject(initialSubject || '');
      setBody(initialBody || '');
      setAttachments([...initialAttachments]);
      setErrorMessage(null);
      setIsMinimized(false);
      setIsMaximized(false);
    }
  }, [isOpen, initialTo, initialCc, initialBcc, initialSubject, initialBody, initialAttachments]);

  if (!isOpen) return null;

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleAddChip = (type: 'to'|'cc'|'bcc', value: string) => {
    const trimmed = value.trim().replace(/,$/, '');
    if (!trimmed) return;
    if (!validateEmail(trimmed) && !trimmed.includes('@')) {
      setErrorMessage(`Invalid email: ${trimmed}`);
      return;
    }
    setErrorMessage(null);
    if (type === 'to') { if (!toChips.includes(trimmed)) setToChips([...toChips, trimmed]); setToInput(''); }
    if (type === 'cc') { if (!ccChips.includes(trimmed)) setCcChips([...ccChips, trimmed]); setCcInput(''); }
    if (type === 'bcc') { if (!bccChips.includes(trimmed)) setBccChips([...bccChips, trimmed]); setBccInput(''); }
  };

  const handleSend = async (scheduledDate?: Date) => {
    setErrorMessage(null);
    let finalTo = [...toChips];
    if (toInput.trim()) {
      if (validateEmail(toInput.trim())) finalTo.push(toInput.trim());
      else return setErrorMessage(`Invalid email: ${toInput.trim()}`);
    }
    if (finalTo.length === 0) return setErrorMessage('Please add at least one recipient');

    setIsSending(true);
    try {
      await onSend({
        to: finalTo, cc: ccChips, bcc: bccChips,
        subject: subject.trim() || '(No Subject)',
        body: body.trim(), attachments,
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
    <div className={`fixed z-[100] transition-all duration-300 shadow-2xl flex flex-col bg-[#12141A] border border-[#1E232B] overflow-hidden ${
      isMinimized ? 'bottom-0 right-4 w-72 h-14 rounded-t-2xl' : 
      isMaximized ? 'inset-4 md:inset-10 rounded-2xl' : 
      'bottom-0 right-4 md:right-16 w-full sm:w-[560px] h-[600px] rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]'
    }`}>
      
      {/* Header */}
      <div className="h-14 px-4 bg-[#1E232B] flex items-center justify-between shrink-0 cursor-pointer" onClick={(e) => { if (e.target === e.currentTarget && isMinimized) setIsMinimized(false); }}>
        <div className="flex items-center gap-3 truncate">
          <span className="text-sm font-bold text-white truncate">{subject || 'New Message'}</span>
          {isSecure && <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-4">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><Minus className="w-4 h-4" /></button>
          <button onClick={() => { setIsMaximized(!isMaximized); setIsMinimized(false); }} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors hidden sm:block">
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-500/20 transition-colors"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0A0C10]">
          {errorMessage && (
            <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {errorMessage}
            </div>
          )}

          {/* Form Fields */}
          <div className="px-4 py-2 space-y-1 border-b border-[#1E232B]">
            {/* To */}
            <div className="flex items-center gap-2 min-h-[36px]">
              <span className="text-slate-500 font-semibold text-xs w-8">To</span>
              <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                {toChips.map(chip => (
                  <span key={chip} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#2D5BFF]/20 text-[#2D5BFF] text-xs font-bold border border-[#2D5BFF]/30">
                    {chip} <button onClick={() => setToChips(toChips.filter(c => c !== chip))}><X className="w-3 h-3 hover:text-white" /></button>
                  </span>
                ))}
                <input type="text" value={toInput} onChange={e => setToInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddChip('to', toInput); } }} onBlur={() => handleAddChip('to', toInput)} className="flex-1 min-w-[120px] bg-transparent text-sm text-white outline-none" />
              </div>
              <div className="flex gap-2 text-xs font-bold text-slate-500">
                {!showCc && <button onClick={() => setShowCc(true)} className="hover:text-slate-300">Cc</button>}
                {!showBcc && <button onClick={() => setShowBcc(true)} className="hover:text-slate-300">Bcc</button>}
              </div>
            </div>
            {/* Cc & Bcc */}
            {showCc && (
              <div className="flex items-center gap-2 min-h-[36px] border-t border-[#1E232B]/50">
                <span className="text-slate-500 font-semibold text-xs w-8">Cc</span>
                <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                  {ccChips.map(chip => (
                    <span key={chip} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1E232B] text-slate-300 text-xs font-bold border border-slate-700">
                      {chip} <button onClick={() => setCcChips(ccChips.filter(c => c !== chip))}><X className="w-3 h-3 hover:text-white" /></button>
                    </span>
                  ))}
                  <input type="text" value={ccInput} onChange={e => setCcInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddChip('cc', ccInput); } }} onBlur={() => handleAddChip('cc', ccInput)} className="flex-1 min-w-[120px] bg-transparent text-sm text-white outline-none" />
                </div>
              </div>
            )}
            {showBcc && (
              <div className="flex items-center gap-2 min-h-[36px] border-t border-[#1E232B]/50">
                <span className="text-slate-500 font-semibold text-xs w-8">Bcc</span>
                <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                  {bccChips.map(chip => (
                    <span key={chip} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1E232B] text-slate-300 text-xs font-bold border border-slate-700">
                      {chip} <button onClick={() => setBccChips(bccChips.filter(c => c !== chip))}><X className="w-3 h-3 hover:text-white" /></button>
                    </span>
                  ))}
                  <input type="text" value={bccInput} onChange={e => setBccInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddChip('bcc', bccInput); } }} onBlur={() => handleAddChip('bcc', bccInput)} className="flex-1 min-w-[120px] bg-transparent text-sm text-white outline-none" />
                </div>
              </div>
            )}
            {/* Subject */}
            <div className="border-t border-[#1E232B]/50 pt-2 pb-1">
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="w-full bg-transparent text-base font-bold text-white placeholder-slate-500 outline-none" />
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 flex flex-col p-4 min-h-0 relative">
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message..." className="flex-1 w-full bg-transparent text-sm text-slate-200 leading-relaxed outline-none resize-none custom-scrollbar" />
            
            {/* Drag Drop Attachments */}
            {attachments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#1E232B] flex flex-wrap gap-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#12141A] border border-[#1E232B] hover:border-[#2D5BFF]/50 transition-colors group cursor-default shadow-sm">
                    <FileDown className="w-4 h-4 text-[#2D5BFF]" />
                    <span className="text-xs font-bold text-white max-w-[150px] truncate">{att.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{Math.round(att.sizeBytes/1024)}KB</span>
                    <button onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))} className="ml-2 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toolbar & Send */}
          <div className="p-3 bg-[#12141A] border-t border-[#1E232B] flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Send Button Group */}
              <div className="relative inline-flex rounded-xl shadow-lg shadow-[#2D5BFF]/20">
                <button onClick={() => handleSend()} disabled={isSending} className="px-5 py-2.5 rounded-l-xl bg-[#2D5BFF] hover:bg-[#1E48E0] disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center gap-2">
                  <Send className="w-4 h-4" /> {isSending ? 'Sending...' : 'Send'}
                </button>
                <div className="w-[1px] bg-[#12141A]/30 z-10"></div>
                <button onClick={() => setIsScheduleOpen(!isScheduleOpen)} disabled={isSending} className="px-3 py-2.5 rounded-r-xl bg-[#2D5BFF] hover:bg-[#1E48E0] disabled:opacity-50 text-white transition-all">
                  <ChevronDown className="w-4 h-4" />
                </button>
                
                {isScheduleOpen && (
                  <div className="absolute left-0 bottom-[110%] w-56 bg-[#1E232B] border border-slate-700 rounded-xl shadow-2xl py-1 overflow-hidden z-50 animate-in slide-in-from-bottom-2">
                    <div className="px-3 py-2 text-xs font-bold text-slate-400 border-b border-slate-700/50">Schedule Send</div>
                    {[{label: 'Tomorrow morning', time: '8:00 AM', hrs: 24}, {label: 'Tomorrow afternoon', time: '1:00 PM', hrs: 29}].map(opt => (
                      <button key={opt.label} onClick={() => { const d = new Date(); d.setHours(d.getHours() + opt.hrs); handleSend(d); }} className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 flex justify-between items-center transition-colors">
                        <span>{opt.label}</span><span className="text-xs text-slate-400 font-mono">{opt.time}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Formatting & Tools */}
              <div className="flex items-center gap-1 bg-[#0A0C10] p-1 rounded-lg border border-[#1E232B]">
                <button className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1E232B]"><Type className="w-4 h-4" /></button>
                <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1E232B]"><Paperclip className="w-4 h-4" /></button>
                <button className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1E232B]"><Link2 className="w-4 h-4" /></button>
                <input type="file" multiple ref={fileInputRef} onChange={async (e) => {
                  const files = e.target.files;
                  if (!files) return;
                  const newAtts: ComposerAttachment[] = [];
                  for (let i=0; i<files.length; i++) {
                    const base64 = await readFileAsBase64(files[i]);
                    newAtts.push({ id: `att-${Date.now()}-${i}`, name: files[i].name, sizeBytes: files[i].size, dataBase64: base64, file: files[i] });
                  }
                  setAttachments([...attachments, ...newAtts]);
                }} className="hidden" />
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => setIsSecure(!isSecure)} className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${isSecure ? 'bg-[#14B8A6]/20 text-[#14B8A6]' : 'text-slate-400 hover:bg-[#1E232B] hover:text-white'}`}>
                  {isSecure ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isSecure ? 'E2EE On' : 'Encrypt'}</span>
                </button>
                
                <button onClick={() => setIsAiOpen(!isAiOpen)} className="p-2 rounded-lg text-purple-400 hover:bg-purple-500/10 transition-colors flex items-center gap-1.5 text-xs font-bold">
                  <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">AI Assist</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <button onClick={() => onClose()} className="p-2 rounded-lg hover:text-rose-400 hover:bg-rose-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
          
          {/* AI Writer Panel (Expandable) */}
          {isAiOpen && (
            <div className="absolute bottom-16 right-4 w-80 bg-[#1E232B] border border-purple-500/30 rounded-xl shadow-2xl p-4 animate-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5"/> Write with AI</span>
                <button onClick={() => setIsAiOpen(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <textarea placeholder="Tell AI what to write about..." rows={3} className="w-full bg-[#12141A] border border-[#2A313C] rounded-lg p-3 text-sm text-white resize-none outline-none focus:border-purple-500/50" />
              <button className="w-full mt-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-sm hover:opacity-90">Generate Draft</button>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
