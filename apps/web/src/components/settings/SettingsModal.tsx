'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Tag,
  Folder,
  Sliders,
  User,
  Plus,
  Trash2,
  Edit2,
  Check,
  ToggleLeft,
  ToggleRight,
  Shield,
  Sparkles,
  Volume2,
  Palette,
  Globe,
  Copy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  ShieldCheck,
  Loader2,
  ExternalLink,
  Inbox,
  Mail,
  Star,
  Clock,
  Send,
  FileText,
  AlertOctagon,
  Archive,
  Users,
  Bell,
  Lock,
  Radio,
  SlidersHorizontal,
  Server,
  Layers,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

import { FolderItem, LabelItem, FilterRule, UserPreferences } from '../../types/mail';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderItem[];
  labels: LabelItem[];
  filterRules: FilterRule[];
  preferences: UserPreferences;
  onUpdateFolders: (folders: FolderItem[]) => void;
  onUpdateLabels: (labels: LabelItem[]) => void;
  onUpdateFilterRules: (rules: FilterRule[]) => void;
  onUpdatePreferences: (preferences: UserPreferences) => void;
}

const PRESET_COLORS = [
  '#2D5BFF', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

const THEMES = [
  { id: 'dark-oled', name: 'Default Dark', bg: '#0A0C10', accent: '#2D5BFF', border: '#1E232B' },
  { id: 'midnight', name: 'Midnight Blue', bg: '#070D18', accent: '#38BDF8', border: '#1E3B68' },
  { id: 'emerald', name: 'Cyber Emerald', bg: '#030E0B', accent: '#10B981', border: '#103F31' },
  { id: 'purple', name: 'Deep Amethyst', bg: '#0D0716', accent: '#A855F7', border: '#3D1C63' },
  { id: 'graphite', name: 'Graphite Slate', bg: '#111113', accent: '#14B8A6', border: '#2E2E38' },
  { id: 'sunset', name: 'Crimson Dusk', bg: '#120609', accent: '#F43F5E', border: '#4D1627' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  folders,
  labels,
  filterRules,
  preferences,
  onUpdateFolders,
  onUpdateLabels,
  onUpdateFilterRules,
  onUpdatePreferences,
}) => {
  const [activeTab, setActiveTab] = useState<
    'general' | 'labels' | 'inbox' | 'accounts' | 'filters' | 'forwarding' | 'themes'
  >('general');

  // General Settings State
  const [pageSize, setPageSize] = useState<number>(50);
  const [undoSendTime, setUndoSendTime] = useState<number>(10);
  const [defaultReplyBehavior, setDefaultReplyBehavior] = useState<'reply' | 'reply_all'>('reply');
  const [hoverActions, setHoverActions] = useState<boolean>(true);
  const [sendAndArchive, setSendAndArchive] = useState<boolean>(false);
  const [externalImages, setExternalImages] = useState<'always' | 'ask'>('always');
  const [smartCompose, setSmartCompose] = useState<boolean>(true);
  const [conversationView, setConversationView] = useState<boolean>(true);
  const [desktopNotifications, setDesktopNotifications] = useState<'all' | 'important' | 'off'>('all');
  const [starPreset, setStarPreset] = useState<'1star' | '4stars' | 'all'>('1star');
  const [signatureText, setSignatureText] = useState<string>(preferences.signature || '');
  const [signatureForNew, setSignatureForNew] = useState<string>('default');
  const [signatureForReply, setSignatureForReply] = useState<string>('default');
  
  // Vacation Responder State
  const [vacationEnabled, setVacationEnabled] = useState<boolean>(false);
  const [vacationStartDate, setVacationStartDate] = useState<string>('2026-08-31');
  const [vacationEndDate, setVacationEndDate] = useState<string>('');
  const [vacationSubject, setVacationSubject] = useState<string>('Out of Office');
  const [vacationBody, setVacationBody] = useState<string>('I am currently out of office with limited access to email. I will respond to your message upon my return.');
  const [vacationContactsOnly, setVacationContactsOnly] = useState<boolean>(false);

  // Inbox Settings State
  const [inboxType, setInboxType] = useState<'default' | 'important' | 'unread' | 'starred' | 'priority'>('default');
  const [categories, setCategories] = useState<Record<string, boolean>>({
    primary: true,
    promotions: true,
    social: true,
    updates: true,
    forums: false,
  });
  const [readingPanePos, setReadingPanePos] = useState<'none' | 'right' | 'below'>('right');
  const [importanceMarkers, setImportanceMarkers] = useState<boolean>(true);

  // Domain Management State
  const [domains, setDomains] = useState<any[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [newDomainInput, setNewDomainInput] = useState('');
  const [creatingDomain, setCreatingDomain] = useState(false);
  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null);
  const [expandedDomainId, setExpandedDomainId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);

  // Blocked Addresses State
  const [blockedAddresses, setBlockedAddresses] = useState<string[]>([
    'spam@promotions-bulk.com',
    'newsletter@unsolicited-marketing.net',
    'scam@fake-invoice-billing.org',
  ]);

  // Labels Tab State
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0]!);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editLabelName, setEditLabelName] = useState('');
  const [editLabelColor, setEditLabelColor] = useState(PRESET_COLORS[0]!);

  // Filter Rules Tab State
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleField, setNewRuleField] = useState<'from' | 'to' | 'subject' | 'body'>('from');
  const [newRuleOperator, setNewRuleOperator] = useState<'contains' | 'equals' | 'starts_with'>('contains');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleAction, setNewRuleAction] = useState<'apply_label' | 'move_to_folder' | 'mark_read' | 'star'>('apply_label');
  const [newRuleActionValue, setNewRuleActionValue] = useState('');

  // Forwarding & POP/IMAP State
  const [forwardingAddress, setForwardingAddress] = useState('');
  const [popEnabled, setPopEnabled] = useState(false);
  const [imapEnabled, setImapEnabled] = useState(true);
  const [imapExpunge, setImapExpunge] = useState<'auto' | 'manual'>('auto');
  const [imapFolderLimit, setImapFolderLimit] = useState<number>(1000);

  // Load Preferences & Domains on Open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings/preferences')
        .then((res) => res.json())
        .then((json) => {
          if (json.data) {
            const p = json.data;
            if (p.signature?.text) setSignatureText(p.signature.text);
            if (p.autoReply?.enabled !== undefined) setVacationEnabled(p.autoReply.enabled);
            if (p.autoReply?.subject) setVacationSubject(p.autoReply.subject);
            if (p.autoReply?.body) setVacationBody(p.autoReply.body);
            if (p.inboxType) setInboxType(p.inboxType);
            if (p.readingPane) setReadingPanePos(p.readingPane);
            if (p.conversationView !== undefined) setConversationView(p.conversationView);
          }
        })
        .catch(() => {});

      fetchDomains();
    }
  }, [isOpen]);

  const fetchDomains = async () => {
    try {
      setLoadingDomains(true);
      setDomainError(null);
      const res = await fetch('/api/domains');
      if (res.ok) {
        const json = await res.json();
        setDomains(json.data || []);
        if (json.data && json.data.length > 0 && !expandedDomainId) {
          setExpandedDomainId(json.data[0].id);
        }
      }
    } catch (_) {
      setDomainError('Failed to load custom domains');
    } finally {
      setLoadingDomains(false);
    }
  };

  const handleSaveGeneral = async () => {
    try {
      const payload = {
        pageSize,
        undoSendTime,
        defaultReplyBehavior,
        hoverActions,
        sendAndArchive,
        conversationView,
        signature: { text: signatureText, enabled: Boolean(signatureText.trim()) },
        autoReply: {
          enabled: vacationEnabled,
          subject: vacationSubject,
          body: vacationBody,
          startDate: vacationStartDate,
          endDate: vacationEndDate || null,
        },
        inboxType,
        readingPane: readingPanePos,
      };

      await fetch('/api/settings/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      onUpdatePreferences({
        ...preferences,
        signature: signatureText,
      });

      onClose();
    } catch (_) {}
  };

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;

    try {
      const res = await fetch('/api/settings/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLabelName.trim(), color: newLabelColor }),
      });
      if (res.ok) {
        const json = await res.json();
        onUpdateLabels([...labels, json.data]);
        setNewLabelName('');
      }
    } catch (_) {}
  };

  const handleDeleteLabel = async (id: string) => {
    try {
      await fetch(`/api/settings/labels/${id}`, { method: 'DELETE' });
      onUpdateLabels(labels.filter((l) => l.id !== id));
    } catch (_) {}
  };

  const handleCreateFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newRuleValue.trim()) return;

    try {
      const res = await fetch('/api/settings/filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRuleName.trim(),
          field: newRuleField,
          operator: newRuleOperator,
          value: newRuleValue.trim(),
          action: newRuleAction,
          actionValue: newRuleActionValue.trim(),
          isEnabled: true,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        onUpdateFilterRules([...filterRules, json.data]);
        setNewRuleName('');
        setNewRuleValue('');
      }
    } catch (_) {}
  };

  const handleDeleteFilter = async (id: string) => {
    try {
      await fetch(`/api/settings/filters/${id}`, { method: 'DELETE' });
      onUpdateFilterRules(filterRules.filter((f) => f.id !== id));
    } catch (_) {}
  };

  const handleUnblock = (addr: string) => {
    setBlockedAddresses(blockedAddresses.filter((a) => a !== addr));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal Box */}
      <div 
        style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)', borderColor: 'var(--theme-border, #1E232B)' }}
        className="relative w-full max-w-5xl h-[92vh] max-h-[850px] rounded-2xl border shadow-2xl flex flex-col z-10 overflow-hidden text-slate-200 font-sans"
      >
        {/* Modal Header */}
        <div 
          style={{ backgroundColor: 'var(--theme-bg-header, #0A0C10)', borderColor: 'var(--theme-border, #1E232B)' }}
          className="h-16 px-6 border-b flex items-center justify-between shrink-0"
        >
          <div className="flex items-center gap-3">
            <div 
              style={{ background: 'linear-gradient(135deg, var(--theme-accent, #2D5BFF), #14B8A6)' }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
            >
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Settings</h2>
              <p className="text-xs text-slate-400">Configure your inbox preferences, labels, filters, and custom domains</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gmail Navigation Tabs Bar */}
        <div 
          style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
          className="flex items-center px-6 border-b overflow-x-auto custom-scrollbar no-scrollbar shrink-0 text-xs font-semibold gap-1"
        >
          {[
            { id: 'general', label: 'General' },
            { id: 'labels', label: 'Labels' },
            { id: 'inbox', label: 'Inbox' },
            { id: 'accounts', label: 'Accounts & Custom Domains' },
            { id: 'filters', label: 'Filters and Blocked Addresses' },
            { id: 'forwarding', label: 'Forwarding and POP/IMAP' },
            { id: 'themes', label: 'Themes' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={isActive ? { color: 'var(--theme-accent, #2D5BFF)' } : undefined}
                className={`py-3.5 px-4 transition-all whitespace-nowrap relative font-medium ${
                  isActive ? 'font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <div 
                    style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }}
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  ></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div 
          style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)' }}
          className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs"
        >
          
          {/* ========================================================= */}
          {/* 1. GENERAL TAB */}
          {/* ========================================================= */}
          {activeTab === 'general' && (
            <div className="space-y-6 divide-y divide-white/5">
              
              {/* Language */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="font-semibold text-slate-300">Language:</div>
                <div className="md:col-span-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">Eazzio Mail display language:</span>
                    <select 
                      style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                      className="px-3 py-1.5 rounded-lg border text-white outline-none"
                    >
                      <option>English (US)</option>
                      <option>English (UK)</option>
                      <option>Hindi (हिन्दी)</option>
                      <option>Spanish (Español)</option>
                      <option>French (Français)</option>
                      <option>German (Deutsch)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Maximum Page Size */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-semibold text-slate-300">Maximum page size:</div>
                <div className="md:col-span-3 flex items-center gap-3">
                  <span className="text-slate-400">Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                    className="px-3 py-1.5 rounded-lg border text-white outline-none"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-slate-400">conversations per page</span>
                </div>
              </div>

              {/* Undo Send */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-semibold text-slate-300">Undo Send:</div>
                <div className="md:col-span-3 flex items-center gap-3">
                  <span className="text-slate-400">Send cancellation period:</span>
                  <select
                    value={undoSendTime}
                    onChange={(e) => setUndoSendTime(Number(e.target.value))}
                    style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                    className="px-3 py-1.5 rounded-lg border text-white outline-none"
                  >
                    <option value={5}>5 seconds</option>
                    <option value={10}>10 seconds</option>
                    <option value={20}>20 seconds</option>
                    <option value={30}>30 seconds</option>
                  </select>
                </div>
              </div>

              {/* Default Reply Behavior */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-semibold text-slate-300">Default reply behavior:</div>
                <div className="md:col-span-3 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="replyBehavior"
                      checked={defaultReplyBehavior === 'reply'}
                      onChange={() => setDefaultReplyBehavior('reply')}
                      className="accent-[#2D5BFF]"
                    />
                    <span className="text-slate-200">Reply</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="replyBehavior"
                      checked={defaultReplyBehavior === 'reply_all'}
                      onChange={() => setDefaultReplyBehavior('reply_all')}
                      className="accent-[#2D5BFF]"
                    />
                    <span className="text-slate-200">Reply all</span>
                  </label>
                </div>
              </div>

              {/* Hover Actions */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-semibold text-slate-300">Hover actions:</div>
                <div className="md:col-span-3 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="hoverActions"
                      checked={hoverActions}
                      onChange={() => setHoverActions(true)}
                      className="accent-[#2D5BFF]"
                    />
                    <span className="text-slate-200">Enable hover actions — Quickly access archive, delete, mark read, and snooze</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="hoverActions"
                      checked={!hoverActions}
                      onChange={() => setHoverActions(false)}
                      className="accent-[#2D5BFF]"
                    />
                    <span className="text-slate-200">Disable hover actions</span>
                  </label>
                </div>
              </div>

              {/* Conversation View */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-semibold text-slate-300">Conversation View:</div>
                <div className="md:col-span-3 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="convView"
                      checked={conversationView}
                      onChange={() => setConversationView(true)}
                      className="accent-[#2D5BFF]"
                    />
                    <span className="text-slate-200">Conversation view on — Group messages with the same subject together</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="convView"
                      checked={!conversationView}
                      onChange={() => setConversationView(false)}
                      className="accent-[#2D5BFF]"
                    />
                    <span className="text-slate-200">Conversation view off</span>
                  </label>
                </div>
              </div>

              {/* Desktop Notifications */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-semibold text-slate-300">Desktop notifications:</div>
                <div className="md:col-span-3 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="notifications"
                      checked={desktopNotifications === 'all'}
                      onChange={() => setDesktopNotifications('all')}
                      className="accent-[#2D5BFF]"
                    />
                    <span className="text-slate-200">New mail notifications on — Notify me when any new message arrives</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="notifications"
                      checked={desktopNotifications === 'important'}
                      onChange={() => setDesktopNotifications('important')}
                      className="accent-[#2D5BFF]"
                    />
                    <span className="text-slate-200">Important mail notifications on — Notify me only for important emails</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="notifications"
                      checked={desktopNotifications === 'off'}
                      onChange={() => setDesktopNotifications('off')}
                      className="accent-[#2D5BFF]"
                    />
                    <span className="text-slate-200">Mail notifications off</span>
                  </label>
                </div>
              </div>

              {/* Stars Preset */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-semibold text-slate-300">Stars:</div>
                <div className="md:col-span-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Presets:</span>
                    <button onClick={() => setStarPreset('1star')} className={`px-2.5 py-1 rounded-md border ${starPreset === '1star' ? 'bg-[#2D5BFF]/20 border-[#2D5BFF] text-[#2D5BFF]' : 'border-white/10 text-slate-400'}`}>1 star</button>
                    <button onClick={() => setStarPreset('4stars')} className={`px-2.5 py-1 rounded-md border ${starPreset === '4stars' ? 'bg-[#2D5BFF]/20 border-[#2D5BFF] text-[#2D5BFF]' : 'border-white/10 text-slate-400'}`}>4 stars</button>
                    <button onClick={() => setStarPreset('all')} className={`px-2.5 py-1 rounded-md border ${starPreset === 'all' ? 'bg-[#2D5BFF]/20 border-[#2D5BFF] text-[#2D5BFF]' : 'border-white/10 text-slate-400'}`}>all stars</button>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    {starPreset !== '1star' && (
                      <>
                        <Star className="w-5 h-5 fill-blue-400 text-blue-400" />
                        <Star className="w-5 h-5 fill-emerald-400 text-emerald-400" />
                        <Star className="w-5 h-5 fill-purple-400 text-purple-400" />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Outbound Signature Builder */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-semibold text-slate-300">Signature:</div>
                <div className="md:col-span-3 space-y-3">
                  <div 
                    style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                    className="p-4 rounded-xl border space-y-3"
                  >
                    <textarea
                      value={signatureText}
                      onChange={(e) => setSignatureText(e.target.value)}
                      rows={4}
                      placeholder="Best Regards,&#10;Your Name&#10;Company"
                      className="w-full bg-transparent text-white text-xs outline-none resize-none border-b border-white/10 pb-2"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[11px] text-slate-400">
                      <div>
                        <label className="block mb-1 font-semibold text-slate-300">FOR NEW EMAILS USE</label>
                        <select 
                          value={signatureForNew} 
                          onChange={(e) => setSignatureForNew(e.target.value)}
                          style={{ backgroundColor: 'var(--theme-bg-sidebar, #090A0D)', borderColor: 'var(--theme-border, #1E232B)' }}
                          className="w-full p-2 rounded-lg border text-white"
                        >
                          <option value="default">Default Signature</option>
                          <option value="none">No signature</option>
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1 font-semibold text-slate-300">ON REPLY / FORWARD USE</label>
                        <select 
                          value={signatureForReply} 
                          onChange={(e) => setSignatureForReply(e.target.value)}
                          style={{ backgroundColor: 'var(--theme-bg-sidebar, #090A0D)', borderColor: 'var(--theme-border, #1E232B)' }}
                          className="w-full p-2 rounded-lg border text-white"
                        >
                          <option value="default">Default Signature</option>
                          <option value="none">No signature</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vacation Responder / Auto-Reply */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-semibold text-slate-300">Vacation responder:</div>
                <div className="md:col-span-3 space-y-3">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="vacation"
                        checked={!vacationEnabled}
                        onChange={() => setVacationEnabled(false)}
                        className="accent-[#2D5BFF]"
                      />
                      <span>Vacation responder off</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="vacation"
                        checked={vacationEnabled}
                        onChange={() => setVacationEnabled(true)}
                        className="accent-[#2D5BFF]"
                      />
                      <span>Vacation responder on</span>
                    </label>
                  </div>

                  {vacationEnabled && (
                    <div 
                      style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                      className="p-4 rounded-xl border space-y-3 animate-in fade-in"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">First day</label>
                          <input
                            type="date"
                            value={vacationStartDate}
                            onChange={(e) => setVacationStartDate(e.target.value)}
                            style={{ backgroundColor: 'var(--theme-bg-sidebar, #090A0D)', borderColor: 'var(--theme-border, #1E232B)' }}
                            className="w-full p-2 rounded-lg border text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Last day (optional)</label>
                          <input
                            type="date"
                            value={vacationEndDate}
                            onChange={(e) => setVacationEndDate(e.target.value)}
                            style={{ backgroundColor: 'var(--theme-bg-sidebar, #090A0D)', borderColor: 'var(--theme-border, #1E232B)' }}
                            className="w-full p-2 rounded-lg border text-white outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Subject</label>
                        <input
                          type="text"
                          value={vacationSubject}
                          onChange={(e) => setVacationSubject(e.target.value)}
                          style={{ backgroundColor: 'var(--theme-bg-sidebar, #090A0D)', borderColor: 'var(--theme-border, #1E232B)' }}
                          className="w-full p-2 rounded-lg border text-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Message</label>
                        <textarea
                          rows={3}
                          value={vacationBody}
                          onChange={(e) => setVacationBody(e.target.value)}
                          style={{ backgroundColor: 'var(--theme-bg-sidebar, #090A0D)', borderColor: 'var(--theme-border, #1E232B)' }}
                          className="w-full p-2 rounded-lg border text-white outline-none resize-none"
                        />
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                        <input
                          type="checkbox"
                          checked={vacationContactsOnly}
                          onChange={(e) => setVacationContactsOnly(e.target.checked)}
                          className="accent-[#2D5BFF]"
                        />
                        <span>Only send a response to people in my Contacts</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. LABELS TAB */}
          {/* ========================================================= */}
          {activeTab === 'labels' && (
            <div className="space-y-6">
              
              {/* System Labels Visibility Table */}
              <div>
                <h3 className="text-sm font-bold text-white mb-3">System Labels</h3>
                <div 
                  style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                  className="rounded-xl border overflow-hidden divide-y divide-white/5"
                >
                  <div className="grid grid-cols-3 p-3 font-semibold text-slate-400 bg-white/[0.02]">
                    <div>Label Name</div>
                    <div>Show in label list</div>
                    <div>IMAP Sync</div>
                  </div>
                  {[
                    { name: 'Inbox', slug: 'inbox' },
                    { name: 'Starred', slug: 'starred' },
                    { name: 'Snoozed', slug: 'snoozed' },
                    { name: 'Important', slug: 'important' },
                    { name: 'Sent', slug: 'sent' },
                    { name: 'Scheduled', slug: 'scheduled' },
                    { name: 'Drafts', slug: 'drafts' },
                    { name: 'All Mail', slug: 'all-mail' },
                    { name: 'Spam', slug: 'spam' },
                    { name: 'Trash', slug: 'trash' },
                  ].map((sys) => (
                    <div key={sys.slug} className="grid grid-cols-3 p-3 items-center">
                      <div className="font-medium text-white">{sys.name}</div>
                      <div className="flex items-center gap-3 text-slate-400">
                        <button className="hover:text-white font-semibold text-[#2D5BFF]">show</button>
                        <span>|</span>
                        <button className="hover:text-white">hide</button>
                      </div>
                      <div className="text-emerald-400 font-mono text-[11px] flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Show in IMAP
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Labels Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">Custom Labels</h3>
                </div>

                {/* Create Label Form */}
                <form onSubmit={handleCreateLabel} className="p-4 bg-white/[0.02] border border-white/10 rounded-xl flex items-center gap-3 mb-4">
                  <input
                    type="text"
                    placeholder="New label name (e.g. Work, Project Alpha)"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                    className="flex-1 p-2.5 rounded-lg border text-white outline-none"
                  />
                  <div className="flex items-center gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewLabelColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full transition-transform ${newLabelColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70'}`}
                      />
                    ))}
                  </div>
                  <button
                    type="submit"
                    disabled={!newLabelName.trim()}
                    style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }}
                    className="px-4 py-2.5 rounded-lg text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Label
                  </button>
                </form>

                {/* Labels List */}
                <div 
                  style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                  className="rounded-xl border divide-y divide-white/5"
                >
                  {labels.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">No custom labels created yet.</div>
                  ) : (
                    labels.map((l) => (
                      <div key={l.id} className="p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                          <span className="font-semibold text-white">{l.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleDeleteLabel(l.id)} className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. INBOX TAB */}
          {/* ========================================================= */}
          {activeTab === 'inbox' && (
            <div className="space-y-6 divide-y divide-white/5">
              
              {/* Inbox Type */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="font-semibold text-slate-300">Inbox type:</div>
                <div className="md:col-span-3 space-y-2">
                  {[
                    { id: 'default', label: 'Default', desc: 'Categorized tabs: Primary, Promotions, Social, Updates' },
                    { id: 'important', label: 'Important first', desc: 'Prioritizes flagged and important emails at the top' },
                    { id: 'unread', label: 'Unread first', desc: 'Displays all unread emails in a top pane' },
                    { id: 'starred', label: 'Starred first', desc: 'Displays all starred messages first' },
                    { id: 'priority', label: 'Priority Inbox', desc: 'Intelligent multi-section inbox with custom sorting' },
                  ].map((t) => (
                    <label key={t.id} className="flex items-start gap-3 p-3 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/[0.02] cursor-pointer">
                      <input
                        type="radio"
                        name="inboxType"
                        checked={inboxType === t.id}
                        onChange={() => setInboxType(t.id as any)}
                        className="mt-0.5 accent-[#2D5BFF]"
                      />
                      <div>
                        <div className="font-bold text-white">{t.label}</div>
                        <div className="text-slate-400 text-[11px]">{t.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-semibold text-slate-300">Categories:</div>
                <div className="md:col-span-3 space-y-2">
                  <p className="text-slate-400 text-[11px] mb-2">Choose which message categories to show as inbox tabs.</p>
                  {['Primary', 'Promotions', 'Social', 'Updates', 'Forums'].map((cat) => {
                    const key = cat.toLowerCase();
                    return (
                      <label key={cat} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={categories[key] ?? false}
                          disabled={key === 'primary'}
                          onChange={(e) => setCategories({ ...categories, [key]: e.target.checked })}
                          className="accent-[#2D5BFF]"
                        />
                        <span className={`text-slate-200 ${key === 'primary' ? 'font-bold text-white' : ''}`}>{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Reading Pane */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-semibold text-slate-300">Reading pane:</div>
                <div className="md:col-span-3 space-y-2">
                  <p className="text-slate-400 text-[11px] mb-2">Provides a way to read mail right next to your list of conversations.</p>
                  {[
                    { id: 'none', label: 'No split' },
                    { id: 'right', label: 'Right of inbox' },
                    { id: 'below', label: 'Below inbox' },
                  ].map((p) => (
                    <label key={p.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="readingPane"
                        checked={readingPanePos === p.id}
                        onChange={() => setReadingPanePos(p.id as any)}
                        className="accent-[#2D5BFF]"
                      />
                      <span className="text-slate-200">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. ACCOUNTS & CUSTOM DOMAINS TAB */}
          {/* ========================================================= */}
          {activeTab === 'accounts' && (
            <div className="space-y-6">
              
              {/* Send Mail As */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                <h3 className="text-sm font-bold text-white">Send Mail As</h3>
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                  <div>
                    <span className="font-bold text-white">Rahul Kumar</span>{' '}
                    <span className="text-slate-400">&lt;rahul@eazzio.com&gt;</span>
                    <span className="ml-2 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">Default</span>
                  </div>
                  <button className="text-[#2D5BFF] hover:underline font-semibold">edit info</button>
                </div>
              </div>

              {/* Custom Domains Wizard */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[#2D5BFF]" />
                      <span>Custom Domains & DNS Verification Wizard</span>
                    </h3>
                    <p className="text-slate-400 text-[11px]">Connect your business domain with DKIM RSA-2048, SPF, DMARC, and MX records.</p>
                  </div>
                </div>

                {/* Add domain form */}
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newDomainInput.trim()) return;
                    setCreatingDomain(true);
                    try {
                      const res = await fetch('/api/domains', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ domain: newDomainInput.trim() }),
                      });
                      if (res.ok) {
                        setNewDomainInput('');
                        fetchDomains();
                      }
                    } catch (_) {}
                    setCreatingDomain(false);
                  }}
                  className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.02]"
                >
                  <input
                    type="text"
                    placeholder="e.g. acme.com or mail.startup.io"
                    value={newDomainInput}
                    onChange={(e) => setNewDomainInput(e.target.value)}
                    style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                    className="flex-1 p-2.5 rounded-lg border text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={creatingDomain || !newDomainInput.trim()}
                    style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }}
                    className="px-5 py-2.5 rounded-lg text-white font-bold disabled:opacity-50 flex items-center gap-2"
                  >
                    {creatingDomain ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>Add Domain</span>
                  </button>
                </form>

                {/* Domains List */}
                <div className="space-y-3">
                  {domains.map((dom) => (
                    <div 
                      key={dom.id}
                      style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                      className="p-4 rounded-xl border space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Globe className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold text-white text-sm">{dom.name || dom.domain}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${dom.isVerified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {dom.isVerified ? 'Verified Active' : 'Pending DNS'}
                          </span>
                        </div>
                        <button
                          onClick={async () => {
                            setVerifyingDomainId(dom.id);
                            await fetch(`/api/domains/${dom.id}/verify`, { method: 'POST' });
                            fetchDomains();
                            setVerifyingDomainId(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-semibold flex items-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${verifyingDomainId === dom.id ? 'animate-spin' : ''}`} />
                          Verify DNS
                        </button>
                      </div>

                      {/* DNS Table */}
                      <div className="p-3 bg-black/40 rounded-lg border border-white/5 text-[11px] font-mono space-y-2">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>MX: mail.eazzio.com (Priority 10)</span>
                          <span className="text-emerald-400">Active</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>TXT (SPF): v=spf1 include:_spf.eazzio.com ~all</span>
                          <span className="text-emerald-400">Active</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>TXT (DKIM): eazzio._domainkey.yourdomain.com</span>
                          <span className="text-emerald-400">RSA-2048</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. FILTERS & BLOCKED ADDRESSES TAB */}
          {/* ========================================================= */}
          {activeTab === 'filters' && (
            <div className="space-y-6">
              
              {/* Automation Filters Section */}
              <div>
                <h3 className="text-sm font-bold text-white mb-2">Applied Filters</h3>
                <p className="text-slate-400 text-[11px] mb-3">The following filters are applied to all incoming mail:</p>

                {/* Create Filter Form */}
                <form onSubmit={handleCreateFilter} className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3 mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Filter Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Work emails filter"
                        value={newRuleName}
                        onChange={(e) => setNewRuleName(e.target.value)}
                        style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                        className="w-full p-2 rounded-lg border text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Match Field & Value</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={newRuleField}
                          onChange={(e) => setNewRuleField(e.target.value as any)}
                          style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                          className="p-2 rounded-lg border text-white outline-none"
                        >
                          <option value="from">From</option>
                          <option value="to">To</option>
                          <option value="subject">Subject</option>
                          <option value="body">Body</option>
                        </select>
                        <input
                          type="text"
                          placeholder="e.g. @company.com"
                          value={newRuleValue}
                          onChange={(e) => setNewRuleValue(e.target.value)}
                          style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                          className="flex-1 p-2 rounded-lg border text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">Action:</span>
                      <select
                        value={newRuleAction}
                        onChange={(e) => setNewRuleAction(e.target.value as any)}
                        style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                        className="p-2 rounded-lg border text-white outline-none"
                      >
                        <option value="apply_label">Apply Label</option>
                        <option value="star">Star it</option>
                        <option value="mark_read">Mark as Read</option>
                        <option value="move_to_folder">Move to Archive/Trash</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={!newRuleName.trim() || !newRuleValue.trim()}
                      style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }}
                      className="px-4 py-2 rounded-lg text-white font-bold disabled:opacity-50"
                    >
                      Create filter
                    </button>
                  </div>
                </form>

                {/* Filters Table */}
                <div 
                  style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                  className="rounded-xl border divide-y divide-white/5"
                >
                  {filterRules.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">No active filter rules.</div>
                  ) : (
                    filterRules.map((rule) => (
                      <div key={rule.id} className="p-3.5 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white">{rule.name}</div>
                          <div className="text-slate-400 text-[11px]">
                            Matches: <span className="text-slate-200 font-mono">{rule.field} {rule.operator} "{rule.value}"</span> ➔ {rule.action} {rule.actionValue ? `("${rule.actionValue}")` : ''}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteFilter(rule.id)} className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Blocked Addresses Section */}
              <div>
                <h3 className="text-sm font-bold text-white mb-2">Blocked Email Addresses</h3>
                <p className="text-slate-400 text-[11px] mb-3">Messages from these addresses will appear in Spam:</p>

                <div 
                  style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                  className="rounded-xl border divide-y divide-white/5"
                >
                  {blockedAddresses.map((addr) => (
                    <div key={addr} className="p-3.5 flex items-center justify-between">
                      <span className="font-mono text-slate-300">{addr}</span>
                      <button onClick={() => handleUnblock(addr)} className="text-[#2D5BFF] hover:underline font-semibold">
                        unblock
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 6. FORWARDING AND POP/IMAP TAB */}
          {/* ========================================================= */}
          {activeTab === 'forwarding' && (
            <div className="space-y-6 divide-y divide-white/5">
              
              {/* Forwarding */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="font-semibold text-slate-300">Forwarding:</div>
                <div className="md:col-span-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="email"
                      placeholder="forward-to@example.com"
                      value={forwardingAddress}
                      onChange={(e) => setForwardingAddress(e.target.value)}
                      style={{ backgroundColor: 'var(--theme-bg-card, #12141A)', borderColor: 'var(--theme-border, #1E232B)' }}
                      className="p-2 rounded-lg border text-white outline-none flex-1 max-w-sm"
                    />
                    <button style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }} className="px-4 py-2 rounded-lg text-white font-bold">
                      Add forwarding address
                    </button>
                  </div>
                  <p className="text-slate-400 text-[11px]">Tip: You can also forward only some of your mail by creating a filter.</p>
                </div>
              </div>

              {/* POP Download */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-semibold text-slate-300">POP download:</div>
                <div className="md:col-span-3 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="popStatus"
                      checked={!popEnabled}
                      onChange={() => setPopEnabled(false)}
                      className="accent-[#2D5BFF]"
                    />
                    <span className="text-slate-200">Status: POP is disabled</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="popStatus"
                      checked={popEnabled}
                      onChange={() => setPopEnabled(true)}
                      className="accent-[#2D5BFF]"
                    />
                    <span className="text-slate-200">Enable POP for all mail</span>
                  </label>
                </div>
              </div>

              {/* IMAP Access */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-semibold text-slate-300">IMAP access:</div>
                <div className="md:col-span-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">Status: IMAP is enabled</span>
                  </div>
                  <div className="space-y-2">
                    <div className="font-semibold text-slate-300">When I mark a message in IMAP as deleted:</div>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="imapExpunge"
                        checked={imapExpunge === 'auto'}
                        onChange={() => setImapExpunge('auto')}
                        className="accent-[#2D5BFF]"
                      />
                      <span>Auto-Expunge on — Immediately update the server (default)</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="imapExpunge"
                        checked={imapExpunge === 'manual'}
                        onChange={() => setImapExpunge('manual')}
                        className="accent-[#2D5BFF]"
                      />
                      <span>Auto-Expunge off — Wait for client to update</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 7. THEMES TAB */}
          {/* ========================================================= */}
          {activeTab === 'themes' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Visual Themes Gallery</h3>
                <p className="text-slate-400 text-[11px]">Select a color theme to transform your entire mail workspace in real time.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {THEMES.map((th) => (
                  <button
                    key={th.id}
                    onClick={() => {
                      try {
                        localStorage.setItem('eazzio_theme', th.id);
                        fetch('/api/settings/preferences', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ theme: th.id }),
                        }).catch(() => {});
                      } catch (_) {}
                    }}
                    style={{ backgroundColor: th.bg, borderColor: th.border }}
                    className="p-4 rounded-2xl border text-left flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform relative group shadow-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: th.accent }} />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{th.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{th.bg}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div 
          style={{ backgroundColor: 'var(--theme-bg-header, #0A0C10)', borderColor: 'var(--theme-border, #1E232B)' }}
          className="h-16 px-6 border-t flex items-center justify-between shrink-0"
        >
          <div className="text-[11px] text-slate-500 font-mono">
            0% of 5,120 GB used · Eazzio Mail v2.4.0 Enterprise
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveGeneral}
              style={{ backgroundColor: 'var(--theme-accent, #2D5BFF)' }}
              className="px-6 py-2 rounded-xl text-white font-bold shadow-lg hover:brightness-110 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
