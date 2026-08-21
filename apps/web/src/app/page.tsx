'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ThreadList } from '../components/mail/ThreadList';
import { ConversationViewer } from '../components/mail/ConversationViewer';
import { MailComposer, ComposeEmailPayload } from '../components/mail/MailComposer';
import { SettingsModal } from '../components/settings/SettingsModal';
import { ThreadSummary, MessageDetail, FolderItem, LabelItem, FilterRule, UserPreferences } from '../types/mail';
import { Mail, Sparkles, X, Search, RefreshCw } from 'lucide-react';
import { parseSearchQuery } from '../components/search/SearchBar';
import { realtimeClient, RealtimeMailEvent } from '../lib/websocket-client';
import { ToastContainer, ToastNotification } from '../components/notification/ToastContainer';
import { AuthStore } from '../lib/auth-store';

const initialFolders: FolderItem[] = [
  { id: 'fld-inbox', name: 'Inbox', slug: 'inbox', type: 'system', unreadCount: 0, totalCount: 0 },
  { id: 'fld-sent', name: 'Sent', slug: 'sent', type: 'system', unreadCount: 0, totalCount: 0 },
  { id: 'fld-drafts', name: 'Drafts', slug: 'drafts', type: 'system', unreadCount: 0, totalCount: 0 },
  { id: 'fld-spam', name: 'Spam', slug: 'spam', type: 'system', unreadCount: 0, totalCount: 0 },
  { id: 'fld-trash', name: 'Trash', slug: 'trash', type: 'system', unreadCount: 0, totalCount: 0 },
  { id: 'fld-archive', name: 'Archive', slug: 'archive', type: 'system', unreadCount: 0, totalCount: 0 },
];

const initialLabels: LabelItem[] = [
  { id: 'lbl-work', name: 'Work', color: '#2D5BFF' },
  { id: 'lbl-finance', name: 'Finance', color: '#10B981' },
  { id: 'lbl-urgent', name: 'Urgent', color: '#EF4444' },
];

const initialFilters: FilterRule[] = [
  {
    id: 'rule-1',
    name: 'Auto-tag Security Alerts',
    field: 'subject',
    operator: 'contains',
    value: 'Security',
    action: 'apply_label',
    actionValue: 'Work',
    isEnabled: true,
  },
];

const initialPreferences: UserPreferences = {
  defaultMailbox: 'user@eazzio.com',
  signature: 'Best regards,\nEazzio Mail User',
  autoSummarizeWithAI: true,
  soundNotifications: true,
  theme: 'dark',
};

export default function MailDashboardPage() {
  const [activeFolderId, setActiveFolderId] = useState('fld-inbox');
  const [activeLabelId, setActiveLabelId] = useState<string | undefined>();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [folders, setFolders] = useState<FolderItem[]>(initialFolders);
  const [labels, setLabels] = useState<LabelItem[]>(initialLabels);
  const [filterRules, setFilterRules] = useState<FilterRule[]>(initialFilters);
  const [preferences, setPreferences] = useState<UserPreferences>(initialPreferences);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [conversationMap, setConversationMap] = useState<Record<string, MessageDetail[]>>({});

  // Helper to resolve folder slug from ID
  const getFolderSlug = (folderId: string) => {
    const f = folders.find((item) => item.id === folderId);
    return f?.slug || folderId.replace('fld-', '');
  };

  // Fetch real messages from API
  const loadMessages = useCallback(async (folderId: string) => {
    setIsLoading(true);
    const slug = getFolderSlug(folderId);

    try {
      const authState = AuthStore.getState();
      const token = authState.token || 'default-token';
      const senderEmail = authState.user?.email || 'user@eazzio.com';

      const res = await fetch(`/api/messages?folder=${slug}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-email': senderEmail,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch messages: ${res.statusText}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        const fetchedThreads: ThreadSummary[] = json.data.threads || [];
        const rawMessages: any[] = json.data.messages || [];

        setThreads(fetchedThreads);

        // Update conversationMap
        const newMap: Record<string, MessageDetail[]> = {};
        for (const msg of rawMessages) {
          const tId = msg.thread_id || msg.id;
          const detail: MessageDetail = {
            id: msg.id,
            threadId: tId,
            mailboxId: msg.mailbox_id,
            folderId: folderId,
            from: { name: msg.from_address.split('@')[0], email: msg.from_address },
            to: [{ name: 'You', email: senderEmail }],
            subject: msg.subject || '(No Subject)',
            snippet: msg.snippet || '',
            bodyText: msg.snippet || '',
            bodyHtml: `<p>${(msg.snippet || '').replace(/\n/g, '<br>')}</p>`,
            receivedAt: new Date(msg.received_at).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            isRead: Boolean(msg.is_read),
            isStarred: Boolean(msg.is_starred),
            security: {
              spf: 'pass',
              dkim: 'pass',
              dmarc: 'pass',
              clamavStatus: 'clean',
              spamScore: 0.0,
            },
            attachments: [],
          };

          if (!newMap[tId]) {
            newMap[tId] = [detail];
          } else {
            newMap[tId].push(detail);
          }
        }

        setConversationMap((prev) => ({ ...prev, ...newMap }));

        // Auto-select first thread if available
        if (fetchedThreads.length > 0) {
          setSelectedThreadId((prev) => (prev && fetchedThreads.some((t) => t.id === prev) ? prev : fetchedThreads[0].id));
        } else {
          setSelectedThreadId(null);
        }

        // Update folder counts
        setFolders((prev) =>
          prev.map((f) =>
            f.id === folderId
              ? {
                  ...f,
                  totalCount: fetchedThreads.length,
                  unreadCount: fetchedThreads.filter((t) => t.isUnread).length,
                }
              : f
          )
        );
      }
    } catch (err) {
      console.error('Error loading messages from backend:', err);
    } finally {
      setIsLoading(false);
    }
  }, [folders]);

  // Initial load and folder switch
  useEffect(() => {
    loadMessages(activeFolderId);
  }, [activeFolderId]);

  // Realtime WebSocket Subscription
  useEffect(() => {
    realtimeClient.connect();

    const unsubscribe = realtimeClient.subscribe('*', (event: RealtimeMailEvent) => {
      if (event.type === 'mail.received') {
        const data = event.data;
        const newThreadId = data.threadId || `th-live-${Date.now()}`;
        const newThread: ThreadSummary = {
          id: newThreadId,
          mailboxId: event.mailboxId,
          subject: data.subject || 'Incoming Transmission',
          snippet: data.snippet || 'You have received a new message.',
          sender: data.from || { name: 'External Relay', email: 'relay@eazzio.com' },
          lastMessageAt: data.receivedAt || 'Just now',
          messageCount: 1,
          isUnread: true,
          isStarred: false,
          hasAttachments: data.hasAttachments || false,
          labels: data.labels || ['Inbox'],
        };

        const newMsg: MessageDetail = {
          id: data.messageId || `msg-live-${Date.now()}`,
          threadId: newThreadId,
          mailboxId: event.mailboxId,
          folderId: 'fld-inbox',
          from: data.from || { name: 'External Relay', email: 'relay@eazzio.com' },
          to: [{ name: 'You', email: AuthStore.getState().user?.email || 'user@eazzio.com' }],
          subject: data.subject || 'Incoming Transmission',
          snippet: data.snippet || 'You have received a new message.',
          bodyText: data.snippet || 'Message received via live WebSocket pipeline.',
          bodyHtml: `<p>${data.snippet || 'Message received via live WebSocket pipeline.'}</p>`,
          receivedAt: data.receivedAt || 'Just now',
          isRead: false,
          isStarred: false,
          security: {
            spf: 'pass',
            dkim: 'pass',
            dmarc: 'pass',
            clamavStatus: 'clean',
            spamScore: 0.0,
          },
          attachments: [],
        };

        setConversationMap((prev) => ({
          ...prev,
          [newThreadId]: [newMsg],
        }));

        setThreads((prev) => [newThread, ...prev]);

        // Add toast notification
        setToasts((prev) => [
          {
            id: `toast-${Date.now()}`,
            title: data.subject || 'New Incoming Email',
            senderName: data.from?.name || 'Incoming Sender',
            message: data.snippet || 'Click to view conversation.',
            threadId: newThreadId,
            timestamp: 'Just now',
          },
          ...prev.slice(0, 4),
        ]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const parsedFilters = parseSearchQuery(searchQuery);
  const displayedThreads = threads.filter((t) => {
    if (
      parsedFilters.from &&
      !t.sender.email.toLowerCase().includes(parsedFilters.from) &&
      !t.sender.name.toLowerCase().includes(parsedFilters.from)
    ) {
      return false;
    }
    if (
      parsedFilters.subject &&
      !t.subject.toLowerCase().includes(parsedFilters.subject)
    ) {
      return false;
    }
    if (parsedFilters.hasAttachment && !t.hasAttachments) {
      return false;
    }
    if (parsedFilters.isUnread && !t.isUnread) {
      return false;
    }
    if (parsedFilters.isStarred && !t.isStarred) {
      return false;
    }
    if (
      parsedFilters.label &&
      !t.labels?.some((l) => l.toLowerCase().includes(parsedFilters.label!))
    ) {
      return false;
    }
    if (parsedFilters.textTerms.length > 0) {
      const matchAll = parsedFilters.textTerms.every(
        (term) =>
          t.subject.toLowerCase().includes(term) ||
          t.snippet.toLowerCase().includes(term) ||
          t.sender.name.toLowerCase().includes(term) ||
          t.sender.email.toLowerCase().includes(term)
      );
      if (!matchAll) return false;
    }
    return true;
  });

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, isUnread: false } : t))
    );
  };

  const handleToggleStar = (threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, isStarred: !t.isStarred } : t))
    );
  };

  const handleBulkDelete = (threadIds: string[]) => {
    const idSet = new Set(threadIds);
    setThreads((prev) => prev.filter((t) => !idSet.has(t.id)));
    if (selectedThreadId && idSet.has(selectedThreadId)) {
      setSelectedThreadId(null);
    }
  };

  const handleBulkArchive = (threadIds: string[]) => {
    const idSet = new Set(threadIds);
    setThreads((prev) => prev.filter((t) => !idSet.has(t.id)));
    if (selectedThreadId && idSet.has(selectedThreadId)) {
      setSelectedThreadId(null);
    }
  };

  const handleBulkMarkRead = (threadIds: string[], isRead: boolean) => {
    const idSet = new Set(threadIds);
    setThreads((prev) =>
      prev.map((t) => (idSet.has(t.id) ? { ...t, isUnread: !isRead } : t))
    );
  };

  const handleSendReply = (threadId: string, replyText: string) => {
    const activeMessages = conversationMap[threadId] || [];
    const newMsg: MessageDetail = {
      id: `msg-${Date.now()}`,
      threadId,
      mailboxId: 'mbx-primary',
      folderId: activeFolderId,
      from: { name: 'You', email: AuthStore.getState().user?.email || 'user@eazzio.com' },
      to: [{ name: 'Sender', email: activeMessages[0]?.from.email || 'sender@eazzio.com' }],
      subject: `Re: ${activeMessages[0]?.subject || 'Conversation'}`,
      snippet: replyText.slice(0, 80),
      bodyText: replyText,
      bodyHtml: `<p>${replyText}</p>`,
      receivedAt: 'Just now',
      isRead: true,
      isStarred: false,
      security: {
        spf: 'pass',
        dkim: 'pass',
        dmarc: 'pass',
        clamavStatus: 'clean',
        spamScore: 0.0,
      },
      attachments: [],
    };

    setConversationMap((prev) => ({
      ...prev,
      [threadId]: [...(prev[threadId] || []), newMsg],
    }));

    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              messageCount: t.messageCount + 1,
              snippet: replyText.slice(0, 80),
              lastMessageAt: 'Just now',
            }
          : t
      )
    );
  };

  const selectedThread = threads.find((t) => t.id === selectedThreadId);
  const currentMessages = selectedThreadId ? conversationMap[selectedThreadId] || [] : [];

  const handleSendComposeEmail = async (payload: ComposeEmailPayload) => {
    let assignedMessageId = `msg-${Date.now()}`;

    try {
      const authState = AuthStore.getState();
      const token = authState.token || 'default-token';
      const senderEmail = authState.user?.email || 'user@eazzio.com';

      // 1. Dispatch through internal Eazzio Outbound Mail Pipeline
      const response = await fetch('/api/messages/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-email': senderEmail,
        },
        body: JSON.stringify({
          to: payload.to,
          cc: payload.cc,
          bcc: payload.bcc,
          subject: payload.subject,
          bodyText: payload.body,
          bodyHtml: `<p>${payload.body.replace(/\n/g, '<br>')}</p>`,
        }),
      });

      const result = await response.json();
      if (result.success) {
        assignedMessageId = result.messageId || assignedMessageId;
        setToasts((prev) => [
          {
            id: `toast-${Date.now()}`,
            title: 'Message Queued for Delivery',
            senderName: 'Outbound Mail Pipeline',
            message: `Delivering to ${payload.to.join(', ')} via Eazzio Outbound Transport`,
            timestamp: 'Just now',
          },
          ...prev,
        ]);
      } else {
        const errorText =
          typeof result.error === 'string'
            ? result.error
            : result.error?.message ||
              result.details?.error ||
              'Transmission deferral recorded.';
        setToasts((prev) => [
          {
            id: `toast-${Date.now()}`,
            title: 'Outbound Delivery Notice',
            senderName: 'Outbound Pipeline',
            message: errorText,
            timestamp: 'Just now',
          },
          ...prev,
        ]);
      }
    } catch (apiErr: any) {
      console.error('Failed to trigger outbound mail API:', apiErr);
      const errMsg = apiErr?.message || 'Could not connect to internal outbound service.';
      setToasts((prev) => [
        {
          id: `toast-${Date.now()}`,
          title: 'Outbound Transmission Error',
          senderName: 'Outbound Pipeline',
          message: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg),
          timestamp: 'Just now',
        },
        ...prev,
      ]);
    }

    const newThreadId = `th-${Date.now()}`;
    const newThread: ThreadSummary = {
      id: newThreadId,
      mailboxId: 'mbx-primary',
      subject: payload.subject,
      snippet: payload.body.slice(0, 80) || '(No Body)',
      sender: { name: 'You', email: AuthStore.getState().user?.email || 'user@eazzio.com' },
      lastMessageAt: 'Just now',
      messageCount: 1,
      isUnread: false,
      isStarred: false,
      hasAttachments: (payload.attachments && payload.attachments.length > 0) || false,
      labels: ['Sent'],
    };

    const newMsg: MessageDetail = {
      id: assignedMessageId,
      threadId: newThreadId,
      mailboxId: 'mbx-primary',
      folderId: 'fld-sent',
      from: { name: 'You', email: AuthStore.getState().user?.email || 'user@eazzio.com' },
      to: payload.to.map((email) => ({ name: email.split('@')[0], email })),
      cc: payload.cc?.map((email) => ({ name: email.split('@')[0], email })),
      bcc: payload.bcc?.map((email) => ({ name: email.split('@')[0], email })),
      subject: payload.subject,
      snippet: payload.body.slice(0, 80),
      bodyText: payload.body,
      bodyHtml: `<p>${payload.body.replace(/\n/g, '<br>')}</p>`,
      receivedAt: 'Just now',
      isRead: true,
      isStarred: false,
      security: {
        spf: 'pass',
        dkim: 'pass',
        dmarc: 'pass',
        clamavStatus: 'clean',
        spamScore: 0.0,
      },
      attachments: (payload.attachments || []).map((a) => ({
        id: a.id,
        filename: a.name,
        contentType: 'application/octet-stream',
        sizeBytes: a.sizeBytes,
        antivirusStatus: 'clean' as const,
      })),
    };

    setConversationMap((prev) => ({
      ...prev,
      [newThreadId]: [newMsg],
    }));

    if (activeFolderId === 'fld-sent') {
      setThreads((prev) => [newThread, ...prev]);
      setSelectedThreadId(newThreadId);
    }
  };

  const handleToastClick = (threadId?: string) => {
    if (threadId) {
      setSelectedThreadId(threadId);
    }
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Label Management Handlers
  const handleCreateLabel = (label: Omit<LabelItem, 'id'>) => {
    const newId = `lbl-${Date.now()}`;
    setLabels((prev) => [...prev, { ...label, id: newId }]);
  };

  const handleUpdateLabel = (id: string, updates: Partial<LabelItem>) => {
    setLabels((prev) =>
      prev.map((lbl) => (lbl.id === id ? { ...lbl, ...updates } : lbl))
    );
  };

  const handleDeleteLabel = (id: string) => {
    setLabels((prev) => prev.filter((lbl) => lbl.id !== id));
    if (activeLabelId === id) {
      setActiveLabelId(undefined);
    }
  };

  // Folder Management Handlers
  const handleCreateFolder = (folder: Omit<FolderItem, 'id' | 'type' | 'unreadCount' | 'totalCount'>) => {
    const newId = `fld-${Date.now()}`;
    setFolders((prev) => [
      ...prev,
      {
        ...folder,
        id: newId,
        type: 'custom',
        unreadCount: 0,
        totalCount: 0,
      },
    ]);
  };

  const handleUpdateFolder = (id: string, updates: Partial<FolderItem>) => {
    setFolders((prev) =>
      prev.map((fld) => (fld.id === id ? { ...fld, ...updates } : fld))
    );
  };

  const handleDeleteFolder = (id: string) => {
    setFolders((prev) => prev.filter((fld) => fld.id !== id));
    if (activeFolderId === id) {
      setActiveFolderId('fld-inbox');
    }
  };

  // Filter Rule Handlers
  const handleCreateFilter = (rule: Omit<FilterRule, 'id'>) => {
    const newId = `rule-${Date.now()}`;
    setFilterRules((prev) => [...prev, { ...rule, id: newId }]);
  };

  const handleUpdateFilter = (id: string, updates: Partial<FilterRule>) => {
    setFilterRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule))
    );
  };

  const handleDeleteFilter = (id: string) => {
    setFilterRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  return (
    <DashboardLayout
      activeFolderId={activeFolderId}
      activeLabelId={activeLabelId}
      onSelectFolder={(folderId) => {
        setActiveFolderId(folderId);
        setActiveLabelId(undefined);
      }}
      onSelectLabel={(labelId) => {
        setActiveLabelId(labelId);
      }}
      customFolders={folders}
      customLabels={labels}
      onSearch={setSearchQuery}
      onOpenCompose={() => setIsComposeOpen(true)}
      onOpenSettings={() => setIsSettingsOpen(true)}
    >
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Thread List */}
        <div className="w-80 lg:w-96 border-r border-[#2A2E37] flex flex-col bg-[#0F1115]">
          {/* Active Search Term Filter Chip Bar */}
          {(parsedFilters.from ||
            parsedFilters.subject ||
            parsedFilters.hasAttachment ||
            parsedFilters.isUnread ||
            parsedFilters.isStarred ||
            parsedFilters.label) && (
            <div className="px-4 py-2 border-b border-[#2A2E37] bg-[#16181D] flex flex-wrap items-center gap-1.5 text-xs text-[#94A3B8]">
              <span className="font-semibold text-white mr-1 flex items-center gap-1">
                <Search className="w-3 h-3 text-[#2D5BFF]" /> Active Filters:
              </span>
              {parsedFilters.from && (
                <span className="px-2 py-0.5 rounded bg-[#2D5BFF]/10 text-[#2D5BFF] border border-[#2D5BFF]/20">
                  from:{parsedFilters.from}
                </span>
              )}
              {parsedFilters.subject && (
                <span className="px-2 py-0.5 rounded bg-[#2D5BFF]/10 text-[#2D5BFF] border border-[#2D5BFF]/20">
                  subject:{parsedFilters.subject}
                </span>
              )}
              {parsedFilters.hasAttachment && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  has:attachment
                </span>
              )}
              {parsedFilters.isUnread && (
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  is:unread
                </span>
              )}
              {parsedFilters.isStarred && (
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  is:starred
                </span>
              )}
              {parsedFilters.label && (
                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  label:{parsedFilters.label}
                </span>
              )}
              <button
                onClick={() => setSearchQuery('')}
                className="ml-auto text-[11px] text-[#94A3B8] hover:text-white flex items-center gap-0.5 underline decoration-dotted"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            </div>
          )}

          <div className="flex-1 overflow-hidden relative">
            <ThreadList
              threads={displayedThreads}
              selectedThreadId={selectedThreadId}
              onSelectThread={handleSelectThread}
              onToggleStar={handleToggleStar}
              onBulkDelete={handleBulkDelete}
              onBulkArchive={handleBulkArchive}
              onBulkMarkRead={handleBulkMarkRead}
              folderName={getFolderSlug(activeFolderId).toUpperCase()}
              onRefresh={() => loadMessages(activeFolderId)}
            />
          </div>
        </div>

        {/* Right Column: Conversation Viewer or Empty State */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0F1115]">
          {selectedThread ? (
            <ConversationViewer
              threadId={selectedThread.id}
              subject={selectedThread.subject}
              messages={currentMessages}
              onSendReply={(threadId, replyText) => handleSendReply(threadId, replyText)}
              onArchive={(threadId) => handleBulkArchive([threadId])}
              onDelete={(threadId) => handleBulkDelete([threadId])}
              onToggleStar={(threadId) => handleToggleStar(threadId)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-[#16181D] border border-[#2A2E37] flex items-center justify-center mb-4 text-[#2D5BFF] shadow-lg shadow-black/40">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                {displayedThreads.length === 0 ? 'No messages in this folder' : 'Select a conversation'}
              </h3>
              <p className="text-xs text-[#94A3B8] max-w-sm mb-4">
                {displayedThreads.length === 0
                  ? 'Your encrypted mailbox is synced with the PostgreSQL server.'
                  : 'Choose an email thread from the list on the left to view messages, attachments, and quick replies.'}
              </p>
              <button
                onClick={() => loadMessages(activeFolderId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16181D] border border-[#2A2E37] text-xs text-[#94A3B8] hover:text-white hover:border-[#2D5BFF] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Mailbox
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Realtime Toasts */}
      <ToastContainer
        toasts={toasts}
        onClickToast={(threadId) => handleToastClick(threadId)}
        onDismiss={handleDismissToast}
      />

      {/* Modal: Compose Email */}
      <MailComposer
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleSendComposeEmail}
      />

      {/* Modal: Settings, Labels, Filters & Preferences */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        labels={labels}
        folders={folders}
        filterRules={filterRules}
        preferences={preferences}
        onUpdateFolders={setFolders}
        onUpdateLabels={setLabels}
        onUpdateFilterRules={setFilterRules}
        onUpdatePreferences={setPreferences}
      />
    </DashboardLayout>
  );
}
