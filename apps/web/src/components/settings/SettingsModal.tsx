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
  Wand2,
} from 'lucide-react';

import { FolderItem, LabelItem, FilterRule, UserPreferences } from '../../types/mail';
import { AuthStore } from '../../lib/auth-store';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'general' | 'labels' | 'inbox' | 'accounts' | 'filters' | 'forwarding' | 'themes';
  folders: FolderItem[];
  labels: LabelItem[];
  filterRules: FilterRule[];
  preferences: UserPreferences;
  currentThemeId?: string;
  onThemeChange?: (themeId: string) => void;
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

const PRESET_THEMES = [
  { id: 'eazzio-teal', name: 'Eazzio Light (Default)', bg: '#F8FAFC', accent: '#14B8A6', border: '#CBD5E1', desc: 'Official Eazzio clean light canvas with cyber teal accents', isLight: true },
  { id: 'dark-oled', name: 'Royal Dark', bg: '#0A0C10', accent: '#2D5BFF', border: '#1E232B', desc: 'Deep black with electric royal blue accents' },
  { id: 'midnight', name: 'Midnight Blue', bg: '#070D18', accent: '#38BDF8', border: '#1E3B68', desc: 'Navy night canvas with vivid sky blue' },
  { id: 'emerald', name: 'Cyber Emerald', bg: '#030E0B', accent: '#10B981', border: '#103F31', desc: 'Futuristic matrix black with neon mint glow' },
  { id: 'purple', name: 'Deep Amethyst', bg: '#0D0716', accent: '#A855F7', border: '#3D1C63', desc: 'Royal dark purple with neon violet radiance' },
  { id: 'graphite', name: 'Graphite Slate', bg: '#111113', accent: '#14B8A6', border: '#2E2E38', desc: 'Industrial neutral zinc with cyber teal' },
  { id: 'sunset', name: 'Crimson Dusk', bg: '#120609', accent: '#F43F5E', border: '#4D1627', desc: 'Dark burgundy canvas with glowing coral rose' },
  { id: 'cyberpunk', name: 'Cyberpunk Gold', bg: '#0B0B08', accent: '#EAB308', border: '#4A4214', desc: 'Obsidian charcoal with high-voltage yellow' },
  { id: 'ocean', name: 'Deep Ocean', bg: '#040C12', accent: '#06B6D4', border: '#13476E', desc: 'Abyssal navy with brilliant cyan highlights' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'general',
  folders,
  labels,
  filterRules,
  preferences,
  currentThemeId = 'eazzio-teal',
  onThemeChange,
  onUpdateFolders,
  onUpdateLabels,
  onUpdateFilterRules,
  onUpdatePreferences,
}) => {
  const [activeTab, setActiveTab] = useState<
    'general' | 'labels' | 'inbox' | 'accounts' | 'filters' | 'forwarding' | 'themes'
  >(initialTab);

  // Sync initialTab when modal opens
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // General Settings State
  const [pageSize, setPageSize] = useState<number>(50);
  const [undoSendTime, setUndoSendTime] = useState<number>(10);
  const [defaultReplyBehavior, setDefaultReplyBehavior] = useState<'reply' | 'reply_all'>('reply');
  const [hoverActions, setHoverActions] = useState<boolean>(true);
  const [sendAndArchive, setSendAndArchive] = useState<boolean>(false);
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

  // Domain Management State
  const [domains, setDomains] = useState<any[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [newDomainInput, setNewDomainInput] = useState('');
  const [creatingDomain, setCreatingDomain] = useState(false);
  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null);

  // Blocked Addresses State
  const [blockedAddresses, setBlockedAddresses] = useState<string[]>([
    'spam@promotions-bulk.com',
    'newsletter@unsolicited-marketing.net',
    'scam@fake-invoice-billing.org',
  ]);

  // Labels Tab State
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0]!);

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

  // Custom Theme Builder State
  const [selectedThemeId, setSelectedThemeId] = useState<string>(currentThemeId);
  const [customThemeName, setCustomThemeName] = useState('My Custom Theme');
  const [customBgMain, setCustomBgMain] = useState('#080B10');
  const [customBgSidebar, setCustomBgSidebar] = useState('#05070A');
  const [customBgCard, setCustomBgCard] = useState('#10141E');
  const [customAccent, setCustomAccent] = useState('#6366F1');
  const [customBorder, setCustomBorder] = useState('#1E293B');

  // Load Preferences & Domains on Open
  useEffect(() => {
    if (isOpen) {
      setSelectedThemeId(currentThemeId);

      let auth = AuthStore.getState();
      let storedEmail = auth.user?.email;
      let storedToken = auth.token;
      if (!storedEmail || !storedToken) {
        try {
          const userStr = localStorage.getItem('eazzio_user');
          if (userStr) storedEmail = JSON.parse(userStr).email;
          if (!storedToken) storedToken = localStorage.getItem('eazzio_token');
        } catch (_) {}
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      if (storedEmail) headers['x-user-email'] = storedEmail;

      fetch('/api/settings/preferences', { headers })
        .then((res) => res.json())
        .then((json) => {
          if (json.data) {
            const p = json.data;
            if (p.pageSize !== undefined) setPageSize(p.pageSize);
            if (p.undoSendTime !== undefined) setUndoSendTime(p.undoSendTime);
            if (p.defaultReplyBehavior) setDefaultReplyBehavior(p.defaultReplyBehavior);
            if (p.hoverActions !== undefined) setHoverActions(p.hoverActions);
            if (p.sendAndArchive !== undefined) setSendAndArchive(p.sendAndArchive);
            if (p.desktopNotifications) setDesktopNotifications(p.desktopNotifications);
            if (p.starPreset) setStarPreset(p.starPreset);
            if (p.signature?.text) setSignatureText(p.signature.text);
            if (p.signature?.forNew) setSignatureForNew(p.signature.forNew);
            if (p.signature?.forReply) setSignatureForReply(p.signature.forReply);
            if (p.autoReply?.enabled !== undefined) setVacationEnabled(p.autoReply.enabled);
            if (p.autoReply?.subject) setVacationSubject(p.autoReply.subject);
            if (p.autoReply?.body) setVacationBody(p.autoReply.body);
            if (p.autoReply?.startDate) setVacationStartDate(p.autoReply.startDate.split('T')[0]);
            if (p.autoReply?.endDate) setVacationEndDate(p.autoReply.endDate.split('T')[0]);
            if (p.autoReply?.contactsOnly !== undefined) setVacationContactsOnly(p.autoReply.contactsOnly);
            if (p.inboxType) setInboxType(p.inboxType);
            if (p.categories) setCategories(p.categories);
            if (p.readingPane) setReadingPanePos(p.readingPane);
            if (p.conversationView !== undefined) setConversationView(p.conversationView);
            if (p.forwardingAddress !== undefined) setForwardingAddress(p.forwardingAddress);
            if (p.popEnabled !== undefined) setPopEnabled(p.popEnabled);
            if (p.imapEnabled !== undefined) setImapEnabled(p.imapEnabled);
            if (p.imapExpunge) setImapExpunge(p.imapExpunge);
            if (Array.isArray(p.blockedAddresses)) setBlockedAddresses(p.blockedAddresses);
            if (p.theme) setSelectedThemeId(p.theme);
          }
        })
        .catch(() => {});

      fetchDomains(headers);
    }
  }, [isOpen, currentThemeId]);

  const fetchDomains = async (customHeaders?: Record<string, string>) => {
    try {
      setLoadingDomains(true);
      let headers = customHeaders;
      if (!headers) {
        const auth = AuthStore.getState();
        headers = { 'Content-Type': 'application/json' };
        if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
        if (auth.user?.email) headers['x-user-email'] = auth.user.email;
      }
      const res = await fetch('/api/domains', { headers });
      if (res.ok) {
        const json = await res.json();
        setDomains(json.data || []);
      }
    } catch (_) {
    } finally {
      setLoadingDomains(false);
    }
  };

  const handleApplyTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
    if (onThemeChange) {
      onThemeChange(themeId);
    }
    try {
      localStorage.setItem('eazzio_theme', themeId);
      const auth = AuthStore.getState();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      if (auth.user?.email) headers['x-user-email'] = auth.user.email;

      fetch('/api/settings/preferences', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ theme: themeId }),
      }).catch(() => {});
    } catch (_) {}
  };

  const handleCreateCustomTheme = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `custom-${Date.now()}`;
    const customConfig = {
      id,
      name: customThemeName.trim() || 'Custom Theme',
      bgMain: customBgMain,
      bgSidebar: customBgSidebar,
      bgHeader: customBgMain,
      bgCard: customBgCard,
      bgHover: `${customBgCard}cc`,
      border: customBorder,
      accent: customAccent,
      accentHover: customAccent,
      accentBg: `${customAccent}26`,
      accentGlow: `${customAccent}55`,
    };

    try {
      localStorage.setItem(`eazzio_custom_theme_${id}`, JSON.stringify(customConfig));
      localStorage.setItem('eazzio_theme', id);
      setSelectedThemeId(id);
      if (onThemeChange) {
        onThemeChange(id);
      }
      const auth = AuthStore.getState();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      if (auth.user?.email) headers['x-user-email'] = auth.user.email;

      fetch('/api/settings/preferences', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ theme: id }),
      }).catch(() => {});
    } catch (_) {}
  };

  const handleSaveGeneral = async () => {
    try {
      let auth = AuthStore.getState();
      let storedEmail = auth.user?.email;
      let storedToken = auth.token;
      if (!storedEmail || !storedToken) {
        try {
          const userStr = localStorage.getItem('eazzio_user');
          if (userStr) storedEmail = JSON.parse(userStr).email;
          if (!storedToken) storedToken = localStorage.getItem('eazzio_token');
        } catch (_) {}
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      if (storedEmail) headers['x-user-email'] = storedEmail;

      const payload = {
        pageSize,
        undoSendTime,
        defaultReplyBehavior,
        hoverActions,
        sendAndArchive,
        conversationView,
        desktopNotifications,
        starPreset,
        theme: selectedThemeId,
        signature: {
          text: signatureText,
          enabled: Boolean(signatureText.trim()),
          forNew: signatureForNew,
          forReply: signatureForReply,
        },
        autoReply: {
          enabled: vacationEnabled,
          subject: vacationSubject,
          body: vacationBody,
          startDate: vacationStartDate ? new Date(vacationStartDate).toISOString() : null,
          endDate: vacationEndDate ? new Date(vacationEndDate).toISOString() : null,
          contactsOnly: vacationContactsOnly,
        },
        inboxType,
        categories,
        readingPane: readingPanePos,
        forwardingAddress,
        popEnabled,
        imapEnabled,
        imapExpunge,
        blockedAddresses,
      };

      await fetch('/api/settings/preferences', {
        method: 'PUT',
        headers,
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

  const handleUnblock = async (addr: string) => {
    const updated = blockedAddresses.filter((a) => a !== addr);
    setBlockedAddresses(updated);
    try {
      let auth = AuthStore.getState();
      let storedEmail = auth.user?.email;
      let storedToken = auth.token;
      if (!storedEmail || !storedToken) {
        try {
          const userStr = localStorage.getItem('eazzio_user');
          if (userStr) storedEmail = JSON.parse(userStr).email;
          if (!storedToken) storedToken = localStorage.getItem('eazzio_token');
        } catch (_) {}
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      if (storedEmail) headers['x-user-email'] = storedEmail;

      await fetch('/api/settings/preferences', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ blockedAddresses: updated }),
      });
    } catch (_) {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Box */}
      <div 
        style={{
          backgroundColor: 'var(--theme-bg-sidebar, #FFFFFF)',
          borderColor: 'var(--theme-border, #E2E8F0)',
        }}
        className="relative w-full max-w-5xl h-[92vh] max-h-[850px] rounded-2xl border shadow-2xl flex flex-col z-10 overflow-hidden font-sans"
      >
        {/* Modal Header */}
        <div 
          style={{
            backgroundColor: 'var(--theme-bg-header, #F8FAFC)',
            borderColor: 'var(--theme-border, #E2E8F0)',
          }}
          className="h-16 px-6 border-b flex items-center justify-between shrink-0"
        >
          <div className="flex items-center gap-3">
            <div 
              style={{
                backgroundColor: 'var(--theme-accent, #14B8A6)',
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
            >
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Settings</h2>
              <p className="text-xs opacity-60">Configure your inbox preferences, labels, filters, custom themes, and domains</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gmail Navigation Tabs Bar */}
        <div 
          style={{
            backgroundColor: 'var(--theme-bg-sidebar, #FFFFFF)',
            borderColor: 'var(--theme-border, #E2E8F0)',
          }}
          className="flex items-center px-6 border-b overflow-x-auto custom-scrollbar no-scrollbar shrink-0 text-xs font-semibold gap-1"
        >
          {[
            { id: 'general', label: 'General' },
            { id: 'labels', label: 'Labels' },
            { id: 'inbox', label: 'Inbox' },
            { id: 'accounts', label: 'Accounts & Custom Domains' },
            { id: 'filters', label: 'Filters and Blocked Addresses' },
            { id: 'forwarding', label: 'Forwarding and POP/IMAP' },
            { id: 'themes', label: 'Themes & Custom Colors' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={isActive ? {
                  color: 'var(--theme-accent, #0F766E)',
                } : undefined}
                className={`py-3.5 px-4 transition-all whitespace-nowrap relative font-medium ${
                  isActive ? 'font-bold' : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <div 
                    style={{ backgroundColor: 'var(--theme-accent, #14B8A6)' }}
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div 
          style={{
            backgroundColor: 'var(--theme-bg-main, #F8FAFC)',
          }}
          className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs"
        >
          
          {/* ========================================================= */}
          {/* 1. GENERAL TAB */}
          {/* ========================================================= */}
          {activeTab === 'general' && (
            <div style={{ borderColor: 'var(--theme-border, #E2E8F0)' }} className="space-y-6 divide-y">
              
              {/* Language */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="font-bold text-[#0F172A]">Language:</div>
                <div className="md:col-span-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[#475569]">Eazzio Mail display language:</span>
                    <select 
                      className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-medium outline-none shadow-xs focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6]"
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
                <div className="font-bold text-[#0F172A]">Maximum page size:</div>
                <div className="md:col-span-3 flex items-center gap-3">
                  <span className="text-[#475569]">Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-medium outline-none shadow-xs focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6]"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-[#475569]">conversations per page</span>
                </div>
              </div>

              {/* Undo Send */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-bold text-[#0F172A]">Undo Send:</div>
                <div className="md:col-span-3 flex items-center gap-3">
                  <span className="text-[#475569]">Send cancellation period:</span>
                  <select
                    value={undoSendTime}
                    onChange={(e) => setUndoSendTime(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-medium outline-none shadow-xs focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6]"
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
                <div className="font-bold text-[#0F172A]">Default reply behavior:</div>
                <div className="md:col-span-3 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="replyBehavior"
                      checked={defaultReplyBehavior === 'reply'}
                      onChange={() => setDefaultReplyBehavior('reply')}
                      className="accent-[#14B8A6] w-4 h-4"
                    />
                    <span className="text-[#1E293B] font-medium">Reply</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="replyBehavior"
                      checked={defaultReplyBehavior === 'reply_all'}
                      onChange={() => setDefaultReplyBehavior('reply_all')}
                      className="accent-[#14B8A6] w-4 h-4"
                    />
                    <span className="text-[#1E293B] font-medium">Reply all</span>
                  </label>
                </div>
              </div>

              {/* Hover Actions */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-bold text-[#0F172A]">Hover actions:</div>
                <div className="md:col-span-3 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="hoverActions"
                      checked={hoverActions}
                      onChange={() => setHoverActions(true)}
                      className="accent-[#14B8A6] w-4 h-4"
                    />
                    <span className="text-[#1E293B] font-medium">Enable hover actions — Quickly access archive, delete, mark read, and snooze</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="hoverActions"
                      checked={!hoverActions}
                      onChange={() => setHoverActions(false)}
                      className="accent-[#14B8A6] w-4 h-4"
                    />
                    <span className="text-[#1E293B] font-medium">Disable hover actions</span>
                  </label>
                </div>
              </div>

              {/* Conversation View */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-bold text-[#0F172A]">Conversation View:</div>
                <div className="md:col-span-3 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="convView"
                      checked={conversationView}
                      onChange={() => setConversationView(true)}
                      className="accent-[#14B8A6] w-4 h-4"
                    />
                    <span className="text-[#1E293B] font-medium">Conversation view on — Group messages with the same subject together</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="convView"
                      checked={!conversationView}
                      onChange={() => setConversationView(false)}
                      className="accent-[#14B8A6] w-4 h-4"
                    />
                    <span className="text-[#1E293B] font-medium">Conversation view off</span>
                  </label>
                </div>
              </div>

              {/* Desktop Notifications */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-bold text-[#0F172A]">Desktop notifications:</div>
                <div className="md:col-span-3 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="notifications"
                      checked={desktopNotifications === 'all'}
                      onChange={() => setDesktopNotifications('all')}
                      className="accent-[#14B8A6] w-4 h-4"
                    />
                    <span className="text-[#1E293B] font-medium">New mail notifications on — Notify me when any new message arrives</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="notifications"
                      checked={desktopNotifications === 'important'}
                      onChange={() => setDesktopNotifications('important')}
                      className="accent-[#14B8A6] w-4 h-4"
                    />
                    <span className="text-[#1E293B] font-medium">Important mail notifications on — Notify me only for important emails</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="notifications"
                      checked={desktopNotifications === 'off'}
                      onChange={() => setDesktopNotifications('off')}
                      className="accent-[#14B8A6] w-4 h-4"
                    />
                    <span className="text-[#1E293B] font-medium">Mail notifications off</span>
                  </label>
                </div>
              </div>

              {/* Stars Preset */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-bold text-[#0F172A]">Stars:</div>
                <div className="md:col-span-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[#475569]">Presets:</span>
                    <button onClick={() => setStarPreset('1star')} className={`px-3 py-1 rounded-xl border text-xs font-semibold ${starPreset === '1star' ? 'bg-[#F0FDFA] border-[#14B8A6] text-[#0F766E]' : 'border-[#CBD5E1] bg-white text-[#475569]'}`}>1 star</button>
                    <button onClick={() => setStarPreset('4stars')} className={`px-3 py-1 rounded-xl border text-xs font-semibold ${starPreset === '4stars' ? 'bg-[#F0FDFA] border-[#14B8A6] text-[#0F766E]' : 'border-[#CBD5E1] bg-white text-[#475569]'}`}>4 stars</button>
                    <button onClick={() => setStarPreset('all')} className={`px-3 py-1 rounded-xl border text-xs font-semibold ${starPreset === 'all' ? 'bg-[#F0FDFA] border-[#14B8A6] text-[#0F766E]' : 'border-[#CBD5E1] bg-white text-[#475569]'}`}>all stars</button>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    {starPreset !== '1star' && (
                      <>
                        <Star className="w-5 h-5 fill-blue-500 text-blue-500" />
                        <Star className="w-5 h-5 fill-emerald-500 text-emerald-500" />
                        <Star className="w-5 h-5 fill-purple-500 text-purple-500" />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Outbound Signature Builder */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-bold text-[#0F172A]">Signature:</div>
                <div className="md:col-span-3 space-y-3">
                  <div 
                    className="p-4 rounded-xl border border-[#CBD5E1] bg-white shadow-xs space-y-3"
                  >
                    <textarea
                      value={signatureText}
                      onChange={(e) => setSignatureText(e.target.value)}
                      rows={4}
                      placeholder="Best Regards,&#10;Your Name&#10;Company"
                      className="w-full bg-transparent text-[#0F172A] text-xs outline-none resize-none border-b border-[#E2E8F0] pb-2 font-medium"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[11px] text-[#475569]">
                      <div>
                        <label className="block mb-1 font-bold text-[#0F172A]">FOR NEW EMAILS USE</label>
                        <select 
                          value={signatureForNew} 
                          onChange={(e) => setSignatureForNew(e.target.value)}
                          className="w-full p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-medium"
                        >
                          <option value="default">Default Signature</option>
                          <option value="none">No signature</option>
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1 font-bold text-[#0F172A]">ON REPLY / FORWARD USE</label>
                        <select 
                          value={signatureForReply} 
                          onChange={(e) => setSignatureForReply(e.target.value)}
                          className="w-full p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-medium"
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
                <div className="font-bold text-[#0F172A]">Vacation responder:</div>
                <div className="md:col-span-3 space-y-3">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="vacation"
                        checked={!vacationEnabled}
                        onChange={() => setVacationEnabled(false)}
                        className="accent-[#14B8A6] w-4 h-4"
                      />
                      <span className="text-[#1E293B] font-medium">Vacation responder off</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="vacation"
                        checked={vacationEnabled}
                        onChange={() => setVacationEnabled(true)}
                        className="accent-[#14B8A6] w-4 h-4"
                      />
                      <span className="text-[#1E293B] font-medium">Vacation responder on</span>
                    </label>
                  </div>

                  {vacationEnabled && (
                    <div 
                      className="p-4 rounded-xl border border-[#CBD5E1] bg-white shadow-xs space-y-3 animate-in fade-in"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#475569] mb-1">First day</label>
                          <input
                            type="date"
                            value={vacationStartDate}
                            onChange={(e) => setVacationStartDate(e.target.value)}
                            className="w-full p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#475569] mb-1">Last day (optional)</label>
                          <input
                            type="date"
                            value={vacationEndDate}
                            onChange={(e) => setVacationEndDate(e.target.value)}
                            className="w-full p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#475569] mb-1">Subject</label>
                        <input
                          type="text"
                          value={vacationSubject}
                          onChange={(e) => setVacationSubject(e.target.value)}
                          className="w-full p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#475569] mb-1">Message</label>
                        <textarea
                          rows={3}
                          value={vacationBody}
                          onChange={(e) => setVacationBody(e.target.value)}
                          className="w-full p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] outline-none resize-none font-medium"
                        />
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer text-[#475569]">
                        <input
                          type="checkbox"
                          checked={vacationContactsOnly}
                          onChange={(e) => setVacationContactsOnly(e.target.checked)}
                          className="accent-[#14B8A6] w-4 h-4"
                        />
                        <span className="text-[#1E293B] font-medium">Only send a response to people in my Contacts</span>
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
                <h3 className="text-sm font-bold text-[#0F172A] mb-3">System Labels</h3>
                <div 
                  className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden divide-y divide-[#E2E8F0] shadow-xs"
                >
                  <div className="grid grid-cols-3 p-3 font-bold text-[#475569] bg-[#F8FAFC] text-xs">
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
                    <div key={sys.slug} className="grid grid-cols-3 p-3 items-center text-xs">
                      <div className="font-semibold text-[#0F172A]">{sys.name}</div>
                      <div className="flex items-center gap-3 text-[#64748B]">
                        <button className="text-[#0F766E] hover:underline font-bold">show</button>
                        <span>|</span>
                        <button className="hover:text-[#0F172A]">hide</button>
                      </div>
                      <div className="text-[#0F766E] font-medium text-[11px] flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#14B8A6]" /> Show in IMAP
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Labels Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[#0F172A]">Custom Labels</h3>
                </div>

                {/* Create Label Form */}
                <form onSubmit={handleCreateLabel} className="p-4 bg-white border border-[#CBD5E1] rounded-2xl shadow-xs flex items-center gap-3 mb-4">
                  <input
                    type="text"
                    placeholder="New label name (e.g. Work, Project Alpha)"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="flex-1 p-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] outline-none font-medium text-xs focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6]"
                  />
                  <div className="flex items-center gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewLabelColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full transition-transform ${newLabelColor === c ? 'scale-125 ring-2 ring-[#0F172A]' : 'opacity-70 hover:opacity-100'}`}
                      />
                    ))}
                  </div>
                  <button
                    type="submit"
                    disabled={!newLabelName.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold disabled:opacity-50 flex items-center gap-1.5 text-xs shadow-xs transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add Label
                  </button>
                </form>

                {/* Labels List */}
                <div 
                  className="rounded-2xl border border-[#E2E8F0] bg-white divide-y divide-[#E2E8F0] shadow-xs overflow-hidden"
                >
                  {labels.length === 0 ? (
                    <div className="p-6 text-center text-[#64748B] font-medium">No custom labels created yet.</div>
                  ) : (
                    labels.map((l) => (
                      <div key={l.id} className="p-3.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                          <span className="font-bold text-[#0F172A]">{l.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleDeleteLabel(l.id)} className="p-1.5 text-[#64748B] hover:text-rose-600 transition-colors">
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
            <div className="space-y-6 divide-y divide-[#E2E8F0]">
              
              {/* Inbox Type */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="font-bold text-[#0F172A]">Inbox type:</div>
                <div className="md:col-span-3 space-y-2">
                  {[
                    { id: 'default', label: 'Default', desc: 'Categorized tabs: Primary, Promotions, Social, Updates' },
                    { id: 'important', label: 'Important first', desc: 'Prioritizes flagged and important emails at the top' },
                    { id: 'unread', label: 'Unread first', desc: 'Displays all unread emails in a top pane' },
                    { id: 'starred', label: 'Starred first', desc: 'Displays all starred messages first' },
                    { id: 'priority', label: 'Priority Inbox', desc: 'Intelligent multi-section inbox with custom sorting' },
                  ].map((t) => (
                    <label key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${inboxType === t.id ? 'border-[#14B8A6] bg-[#F0FDFA]' : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'}`}>
                      <input
                        type="radio"
                        name="inboxType"
                        checked={inboxType === t.id}
                        onChange={() => setInboxType(t.id as any)}
                        className="accent-[#14B8A6] w-4 h-4 mt-0.5"
                      />
                      <div>
                        <div className="font-bold text-[#0F172A] text-xs">{t.label}</div>
                        <div className="text-[#64748B] text-[11px] font-medium">{t.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-bold text-[#0F172A]">Categories:</div>
                <div className="md:col-span-3 space-y-2">
                  <p className="text-[#64748B] text-[11px] mb-2 font-medium">Choose which message categories to show as inbox tabs.</p>
                  {['Primary', 'Promotions', 'Social', 'Updates', 'Forums'].map((cat) => {
                    const key = cat.toLowerCase();
                    return (
                      <label key={cat} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={categories[key] ?? false}
                          disabled={key === 'primary'}
                          onChange={(e) => setCategories({ ...categories, [key]: e.target.checked })}
                          className="accent-[#14B8A6] w-4 h-4"
                        />
                        <span className={`text-xs ${key === 'primary' ? 'font-bold text-[#0F172A]' : 'font-medium text-[#1E293B]'}`}>{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Reading Pane */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-bold text-[#0F172A]">Reading pane:</div>
                <div className="md:col-span-3 space-y-2">
                  <p className="text-[#64748B] text-[11px] mb-2 font-medium">Provides a way to read mail right next to your list of conversations.</p>
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
                        className="accent-[#14B8A6] w-4 h-4"
                      />
                      <span className="text-[#1E293B] font-medium text-xs">{p.label}</span>
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
              
              {/* Send Mail As & Email Aliases (FE-003) */}
              <div className="p-5 rounded-2xl border border-[#CBD5E1] bg-white shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">Send Mail As & Email Aliases</h3>
                    <p className="text-[#64748B] text-[11px] font-medium">Create extra addresses that route to your primary inbox.</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div>
                    <span className="font-bold text-[#0F172A]">Primary Mailbox</span>{' '}
                    <span className="text-[#64748B] font-mono text-xs">&lt;kumarrahul0@eazzio.com&gt;</span>
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-[#F0FDFA] border border-[#CCFBF1] text-[#0F766E] text-[10px] font-bold">Primary</span>
                  </div>
                  <span className="text-emerald-600 font-bold text-xs">Active</span>
                </div>

                {/* Email Aliases */}
                <div className="pt-2 space-y-2">
                  <div className="text-xs font-bold text-[#0F172A]">Domain Aliases</div>
                  {[
                    { alias: 'support@thesistech.com', desc: 'Customer support inquiries' },
                    { alias: 'billing@thesistech.com', desc: 'Invoices and receipts' },
                  ].map((al) => (
                    <div key={al.alias} className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] bg-white">
                      <div>
                        <span className="text-xs font-mono font-bold text-[#0F172A]">{al.alias}</span>
                        <span className="text-[11px] text-slate-500 ml-2">→ Deliver to Primary</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">Routing Active</span>
                    </div>
                  ))}

                  {/* Catch-All Setting */}
                  <div className="mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#0F172A]">Catch-All Routing</div>
                      <div className="text-[11px] text-slate-500">Route all emails sent to any undefined address at your domains to your inbox.</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#14B8A6]"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Custom Domains Wizard */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[#14B8A6]" />
                      <span>Custom Domains & DNS Verification Wizard</span>
                    </h3>
                    <p className="text-[#64748B] text-[11px] font-medium">Connect your business domain with DKIM RSA-2048, SPF, DMARC, and MX records.</p>
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
                  className="flex items-center gap-3 p-4 rounded-2xl border border-[#CBD5E1] bg-white shadow-xs"
                >
                  <input
                    type="text"
                    placeholder="e.g. acme.com or mail.startup.io"
                    value={newDomainInput}
                    onChange={(e) => setNewDomainInput(e.target.value)}
                    className="flex-1 p-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] text-xs font-medium outline-none focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6]"
                  />
                  <button
                    type="submit"
                    disabled={creatingDomain || !newDomainInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold disabled:opacity-50 flex items-center gap-2 text-xs shadow-xs transition-all"
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
                      className="p-4 rounded-2xl border border-[#E2E8F0] bg-white shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Globe className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-[#0F172A] text-sm">{dom.name || dom.domain}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${dom.isVerified ? 'bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
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
                          className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#334155] font-semibold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${verifyingDomainId === dom.id ? 'animate-spin text-[#14B8A6]' : ''}`} />
                          Verify DNS
                        </button>
                      </div>

                      {/* DNS Table */}
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-[11px] font-mono space-y-2 text-[#334155]">
                        <div className="flex items-center justify-between">
                          <span>MX: mail.eazzio.com (Priority 10)</span>
                          <span className="text-emerald-600 font-bold">Active</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>TXT (SPF): v=spf1 include:_spf.eazzio.com ~all</span>
                          <span className="text-emerald-600 font-bold">Active</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>TXT (DKIM): eazzio._domainkey.yourdomain.com</span>
                          <span className="text-emerald-600 font-bold">RSA-2048</span>
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
                <h3 className="text-sm font-bold text-[#0F172A] mb-2">Applied Filters</h3>
                <p className="text-[#64748B] text-[11px] mb-3 font-medium">The following filters are applied to all incoming mail:</p>

                {/* Create Filter Form */}
                <form onSubmit={handleCreateFilter} className="p-4 rounded-2xl border border-[#CBD5E1] bg-white shadow-xs space-y-3 mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#475569] mb-1 font-semibold text-xs">Filter Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Work emails filter"
                        value={newRuleName}
                        onChange={(e) => setNewRuleName(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] text-xs font-medium outline-none focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#475569] mb-1 font-semibold text-xs">Match Field & Value</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={newRuleField}
                          onChange={(e) => setNewRuleField(e.target.value as any)}
                          className="p-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] text-xs font-medium outline-none"
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
                          className="flex-1 p-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] text-xs font-medium outline-none focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[#475569] font-medium text-xs">Action:</span>
                      <select
                        value={newRuleAction}
                        onChange={(e) => setNewRuleAction(e.target.value as any)}
                        className="p-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] text-xs font-medium outline-none"
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
                      className="px-5 py-2.5 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold disabled:opacity-50 text-xs shadow-xs transition-all"
                    >
                      Create filter
                    </button>
                  </div>
                </form>

                {/* Filters Table */}
                <div 
                  className="rounded-2xl border border-[#E2E8F0] bg-white divide-y divide-[#E2E8F0] shadow-xs overflow-hidden"
                >
                  {filterRules.length === 0 ? (
                    <div className="p-6 text-center text-[#64748B] font-medium text-xs">No active filter rules.</div>
                  ) : (
                    filterRules.map((rule) => (
                      <div key={rule.id} className="p-3.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-[#0F172A]">{rule.name}</div>
                          <div className="text-[#64748B] text-[11px]">
                            Matches: <span className="text-[#0F172A] font-mono font-semibold">{rule.field} {rule.operator} "{rule.value}"</span> ➔ {rule.action} {rule.actionValue ? `("${rule.actionValue}")` : ''}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteFilter(rule.id)} className="p-1.5 text-[#64748B] hover:text-rose-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Blocked Addresses Section */}
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] mb-2">Blocked Email Addresses</h3>
                <p className="text-[#64748B] text-[11px] mb-3 font-medium">Messages from these addresses will appear in Spam:</p>

                <div 
                  className="rounded-2xl border border-[#E2E8F0] bg-white divide-y divide-[#E2E8F0] shadow-xs overflow-hidden"
                >
                  {blockedAddresses.map((addr) => (
                    <div key={addr} className="p-3.5 flex items-center justify-between text-xs">
                      <span className="font-mono text-[#0F172A] font-medium">{addr}</span>
                      <button onClick={() => handleUnblock(addr)} className="text-[#0F766E] hover:underline font-bold">
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
            <div className="space-y-6 divide-y divide-[#E2E8F0]">
              
              {/* Forwarding */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="font-bold text-[#0F172A]">Forwarding:</div>
                <div className="md:col-span-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="email"
                      placeholder="forward-to@example.com"
                      value={forwardingAddress}
                      onChange={(e) => setForwardingAddress(e.target.value)}
                      className="p-2.5 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] outline-none flex-1 max-w-sm text-xs font-medium"
                    />
                    <button className="px-4 py-2.5 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold text-xs shadow-xs transition-all">
                      Add forwarding address
                    </button>
                  </div>
                  <p className="text-[#64748B] text-[11px] font-medium">Tip: You can also forward only some of your mail by creating a filter.</p>
                </div>
              </div>

              {/* POP Download */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-bold text-[#0F172A]">POP download:</div>
                <div className="md:col-span-3 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="popStatus"
                      checked={!popEnabled}
                      onChange={() => setPopEnabled(false)}
                      className="accent-[#14B8A6] w-4 h-4"
                    />
                    <span className="text-[#1E293B] font-medium text-xs">Status: POP is disabled</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="popStatus"
                      checked={popEnabled}
                      onChange={() => setPopEnabled(true)}
                      className="accent-[#14B8A6] w-4 h-4"
                    />
                    <span className="text-[#1E293B] font-medium text-xs">Enable POP for all mail</span>
                  </label>
                </div>
              </div>

              {/* IMAP Access */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="font-bold text-[#0F172A]">IMAP access:</div>
                <div className="md:col-span-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold text-xs flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" /> Status: IMAP is enabled</span>
                  </div>
                  <div className="space-y-2">
                    <div className="font-bold text-[#0F172A] text-xs">When I mark a message in IMAP as deleted:</div>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="imapExpunge"
                        checked={imapExpunge === 'auto'}
                        onChange={() => setImapExpunge('auto')}
                        className="accent-[#14B8A6] w-4 h-4"
                      />
                      <span className="text-[#1E293B] font-medium text-xs">Auto-Expunge on — Immediately update the server (default)</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="imapExpunge"
                        checked={imapExpunge === 'manual'}
                        onChange={() => setImapExpunge('manual')}
                        className="accent-[#14B8A6] w-4 h-4"
                      />
                      <span className="text-[#1E293B] font-medium text-xs">Auto-Expunge off — Wait for client to update</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 7. THEMES TAB (Preset Gallery + Custom Theme Creator) */}
          {/* ========================================================= */}
          {activeTab === 'themes' && (
            <div className="space-y-8">
              
              {/* Preset Gallery */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#14B8A6]" />
                    <span>Visual Themes Gallery</span>
                  </h3>
                  <span className="text-[11px] text-[#64748B] font-medium">Click any preset to apply instantly across the entire interface</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  {PRESET_THEMES.map((th) => {
                    const isSelected = selectedThemeId === th.id;
                    return (
                      <button
                        key={th.id}
                        onClick={() => handleApplyTheme(th.id)}
                        style={{ 
                          backgroundColor: th.bg, 
                          borderColor: isSelected ? th.accent : th.border,
                        }}
                        className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between h-36 transition-all duration-200 relative group shadow-sm hover:scale-[1.02] ${
                          isSelected ? 'ring-2 ring-offset-2 ring-offset-white' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="w-4 h-4 rounded-full shadow-md" style={{ backgroundColor: th.accent }} />
                          {isSelected && (
                            <div 
                              style={{ backgroundColor: th.accent }}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className={`font-bold text-sm ${th.isLight ? 'text-[#0F172A]' : 'text-white'}`}>{th.name}</div>
                          <div className={`text-[10px] mt-0.5 line-clamp-1 ${th.isLight ? 'text-[#64748B]' : 'text-slate-300'}`}>{th.desc}</div>
                          <div className={`text-[9px] font-mono mt-1 ${th.isLight ? 'text-[#94A3B8]' : 'text-slate-400'}`}>{th.bg}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Theme Creator */}
              <div 
                className="p-5 rounded-2xl border border-[#CBD5E1] bg-white shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-[#14B8A6]" />
                    <h3 className="text-sm font-bold text-[#0F172A]">Create Custom Theme</h3>
                  </div>
                  <span className="text-[11px] text-[#64748B] font-medium">Design your own bespoke palette with full color control</span>
                </div>

                <form onSubmit={handleCreateCustomTheme} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Theme Name */}
                    <div>
                      <label className="block text-[#475569] mb-1 font-semibold text-xs">Theme Name</label>
                      <input
                        type="text"
                        value={customThemeName}
                        onChange={(e) => setCustomThemeName(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] text-xs font-medium outline-none focus:border-[#14B8A6]"
                        placeholder="e.g. Neon Cyber"
                      />
                    </div>

                    {/* Main Background */}
                    <div>
                      <label className="block text-[#475569] mb-1 font-semibold text-xs">Main Background</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customBgMain}
                          onChange={(e) => setCustomBgMain(e.target.value)}
                          className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customBgMain}
                          onChange={(e) => setCustomBgMain(e.target.value)}
                          className="w-full p-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] font-mono text-xs uppercase"
                        />
                      </div>
                    </div>

                    {/* Accent Color */}
                    <div>
                      <label className="block text-[#475569] mb-1 font-semibold text-xs">Accent / Brand Glow</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customAccent}
                          onChange={(e) => setCustomAccent(e.target.value)}
                          className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customAccent}
                          onChange={(e) => setCustomAccent(e.target.value)}
                          className="w-full p-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] font-mono text-xs uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Sidebar Background */}
                    <div>
                      <label className="block text-[#475569] mb-1 font-semibold text-xs">Sidebar / Drawer</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customBgSidebar}
                          onChange={(e) => setCustomBgSidebar(e.target.value)}
                          className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customBgSidebar}
                          onChange={(e) => setCustomBgSidebar(e.target.value)}
                          className="w-full p-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] font-mono text-xs uppercase"
                        />
                      </div>
                    </div>

                    {/* Card / Panel Background */}
                    <div>
                      <label className="block text-[#475569] mb-1 font-semibold text-xs">Card / Modal Surface</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customBgCard}
                          onChange={(e) => setCustomBgCard(e.target.value)}
                          className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customBgCard}
                          onChange={(e) => setCustomBgCard(e.target.value)}
                          className="w-full p-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] font-mono text-xs uppercase"
                        />
                      </div>
                    </div>

                    {/* Border Color */}
                    <div>
                      <label className="block text-[#475569] mb-1 font-semibold text-xs">Border Lines</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customBorder}
                          onChange={(e) => setCustomBorder(e.target.value)}
                          className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customBorder}
                          onChange={(e) => setCustomBorder(e.target.value)}
                          className="w-full p-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] font-mono text-xs uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Preview & Submit */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
                    {/* Live Preview Card */}
                    <div 
                      style={{ backgroundColor: customBgMain, borderColor: customBorder }}
                      className="p-3 rounded-xl border flex items-center gap-3 w-72 shadow-sm"
                    >
                      <div style={{ backgroundColor: customAccent }} className="w-3.5 h-3.5 rounded-full shadow-xs" />
                      <div className="flex-1">
                        <div className="font-bold text-[#0F172A] text-[11px] truncate">{customThemeName || 'Preview'}</div>
                        <div style={{ color: customAccent }} className="text-[9px] font-semibold">Active Palette</div>
                      </div>
                      <div 
                        style={{ backgroundColor: customBgCard, borderColor: customBorder }}
                        className="px-2 py-0.5 rounded border text-[9px] text-[#475569]"
                      >
                        Card
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold shadow-xs transition-all flex items-center gap-2 text-xs"
                    >
                      <Wand2 className="w-4 h-4" />
                      <span>Save & Apply Custom Theme</span>
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div 
          style={{
            backgroundColor: 'var(--theme-bg-header, #F8FAFC)',
            borderColor: 'var(--theme-border, #E2E8F0)',
          }}
          className="h-16 px-6 border-t flex items-center justify-between shrink-0"
        >
          <div className="text-[11px] opacity-60 font-mono">
            Eazzio Mail v2.4.0 Enterprise · 500 MB Free Tier (Cloudinary Multi-Account Pooled)
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'var(--theme-bg-card, #FFFFFF)',
                borderColor: 'var(--theme-border, #CBD5E1)',
              }}
              className="px-4 py-2 rounded-xl border opacity-80 hover:opacity-100 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveGeneral}
              style={{
                backgroundColor: 'var(--theme-accent, #14B8A6)',
              }}
              className="px-6 py-2 rounded-xl text-white font-bold text-xs shadow-sm transition-all hover:brightness-95"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
