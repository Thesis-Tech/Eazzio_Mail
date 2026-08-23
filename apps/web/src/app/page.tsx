'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ThreadList } from '../components/mail/ThreadList';
import { ConversationViewer } from '../components/mail/ConversationViewer';
import { MailComposer, ComposeEmailPayload } from '../components/mail/MailComposer';
import { SettingsModal } from '../components/settings/SettingsModal';
import { ThreadSummary, MessageDetail, FolderItem, LabelItem, FilterRule, UserPreferences } from '../types/mail';
import { Mail, Sparkles, X, Search, RefreshCw, Paperclip, Star, ChevronDown } from 'lucide-react';
import { parseSearchQuery } from '../components/search/SearchBar';
import { realtimeClient, RealtimeMailEvent } from '../lib/websocket-client';
import { ToastContainer, ToastNotification } from '../components/notification/ToastContainer';
import { AuthStore } from '../lib/auth-store';

const initialFolders: FolderItem[] = [
  { id: 'fld-inbox', name: 'Inbox', slug: 'inbox', type: 'system', unreadCount: 0, totalCount: 0 },
  { id: 'fld-starred', name: 'Starred', slug: 'starred', type: 'system', unreadCount: 0, totalCount: 0 },
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
  defaultMailbox: 'rahulkumar@eazzio.com',
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
  const [composeInitialData, setComposeInitialData] = useState<{ to?: string[]; subject?: string; body?: string }>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [folders, setFolders] = useState<FolderItem[]>(initialFolders);
  const [labels, setLabels] = useState<LabelItem[]>(initialLabels);
  const [filterRules, setFilterRules] = useState<FilterRule[]>(initialFilters);
  const [preferences, setPreferences] = useState<UserPreferences>(initialPreferences);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [conversationMap, setConversationMap] = useState<Record<string, MessageDetail[]>>({});

  // Helper to resolve folder slug from ID
  const getFolderSlug = useCallback((folderId: string) => {
    const f = folders.find((item) => item.id === folderId);
    return f?.slug || folderId.replace('fld-', '');
  }, [folders]);

  // Fetch real messages from API for active folder
  const loadMessages = useCallback(async (folderId: string) => {
    setIsLoading(true);
    const slug = getFolderSlug(folderId);

    try {
      const authState = AuthStore.getState();
      const token = authState.token || 'default-token';
      const senderEmail = authState.user?.email || 'rahulkumar@eazzio.com';

      let res: Response | null = null;
      try {
        res = await fetch(`/api/messages?folder=${slug}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-user-email': senderEmail,
          },
        });

        if (res && !res.ok && res.status === 502) {
          // Automatic retry if backend service was restarting
          await new Promise((r) => setTimeout(r, 1500));
          res = await fetch(`/api/messages?folder=${slug}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'x-user-email': senderEmail,
            },
          });
        }
      } catch (fetchErr) {
        console.warn('Network error reaching /api/messages, using cached/local state:', fetchErr);
        return;
      }

      if (!res || !res.ok) {
        console.warn(`Messages endpoint responded with status ${res?.status}`);
        return;
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
            bodyText: msg.body_text || msg.bodyText || msg.snippet || '',
            bodyHtml: msg.body_html || msg.bodyHtml || (msg.body_text ? `<p>${msg.body_text.replace(/\n/g, '<br>')}</p>` : `<p>${(msg.snippet || '').replace(/\n/g, '<br>')}</p>`),
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
            listUnsubscribe: msg.auth_results?.listUnsubscribe || msg.listUnsubscribe || null,
            listId: msg.auth_results?.listId || msg.listId || null,
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
  }, [getFolderSlug]);

  // Initial load and folder switch
  useEffect(() => {
    loadMessages(activeFolderId);
  }, [activeFolderId, loadMessages]);

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
          to: [{ name: 'You', email: AuthStore.getState().user?.email || 'rahulkumar@eazzio.com' }],
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

        if (activeFolderId === 'fld-inbox') {
          setThreads((prev) => [newThread, ...prev]);
        }

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
  }, [activeFolderId]);

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
    if (activeFolderId === 'fld-drafts') {
      // If clicking a draft, open composer with draft contents to edit/send
      const msgs = conversationMap[threadId] || [];
      const current = msgs[0];
      setComposeInitialData({
        to: current?.to.map((r) => r.email) || [],
        subject: current?.subject || '',
        body: current?.bodyText || '',
      });
      setIsComposeOpen(true);
      return;
    }

    setSelectedThreadId(threadId);
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, isUnread: false } : t))
    );
  };

  // Toggle Star / Mark Important in real backend
  const handleToggleStar = async (threadId: string) => {
    const thread = threads.find((t) => t.id === threadId);
    const newStarred = !thread?.isStarred;

    // Optimistically update UI
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, isStarred: newStarred } : t))
    );

    setConversationMap((prev) => {
      const current = prev[threadId] || [];
      return {
        ...prev,
        [threadId]: current.map((m) => ({ ...m, isStarred: newStarred })),
      };
    });

    try {
      const authState = AuthStore.getState();
      const token = authState.token || 'default-token';
      const senderEmail = authState.user?.email || 'rahulkumar@eazzio.com';

      // Call API to persist star state
      const targetMsgId = (thread as any)?.messageId || threadId;
      await fetch(`/api/messages/${targetMsgId}/star`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-email': senderEmail,
        },
        body: JSON.stringify({ isStarred: newStarred }),
      });

      // If in Starred folder and unstarred, remove from view
      if (activeFolderId === 'fld-starred' && !newStarred) {
        setThreads((prev) => prev.filter((t) => t.id !== threadId));
        if (selectedThreadId === threadId) setSelectedThreadId(null);
      }
    } catch (err) {
      console.error('Failed to toggle star in backend:', err);
    }
  };

  const handleBulkDelete = async (threadIds: string[]) => {
    const idSet = new Set(threadIds);
    setThreads((prev) => prev.filter((t) => !idSet.has(t.id)));
    if (selectedThreadId && idSet.has(selectedThreadId)) {
      setSelectedThreadId(null);
    }

    try {
      const authState = AuthStore.getState();
      const token = authState.token || 'default-token';
      const senderEmail = authState.user?.email || 'rahulkumar@eazzio.com';

      const isTrash = activeFolderId === 'fld-trash';
      await fetch('/api/messages/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-email': senderEmail,
        },
        body: JSON.stringify({
          action: isTrash ? 'delete' : 'trash',
          threadIds,
        }),
      });

      setToasts((prev) => [
        {
          id: `toast-${Date.now()}`,
          title: isTrash ? 'Deleted Permanently' : 'Moved to Trash',
          senderName: 'Eazzio Mailbox',
          message: `${threadIds.length} conversation(s) ${isTrash ? 'deleted permanently' : 'moved to Trash'}.`,
          timestamp: 'Just now',
        },
        ...prev,
      ]);
    } catch (err) {
      console.error('Failed to execute bulk delete:', err);
    }
  };

  const handleBulkArchive = async (threadIds: string[]) => {
    const idSet = new Set(threadIds);
    setThreads((prev) => prev.filter((t) => !idSet.has(t.id)));
    if (selectedThreadId && idSet.has(selectedThreadId)) {
      setSelectedThreadId(null);
    }

    try {
      const authState = AuthStore.getState();
      const token = authState.token || 'default-token';
      const senderEmail = authState.user?.email || 'rahulkumar@eazzio.com';

      await fetch('/api/messages/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-email': senderEmail,
        },
        body: JSON.stringify({
          action: 'archive',
          threadIds,
        }),
      });

      setToasts((prev) => [
        {
          id: `toast-${Date.now()}`,
          title: 'Moved to Archive',
          senderName: 'Eazzio Mailbox',
          message: `${threadIds.length} conversation(s) moved to Archive.`,
          timestamp: 'Just now',
        },
        ...prev,
      ]);
    } catch (err) {
      console.error('Failed to execute bulk archive:', err);
    }
  };

  const handleBulkMarkRead = async (threadIds: string[], isRead: boolean) => {
    const idSet = new Set(threadIds);
    setThreads((prev) =>
      prev.map((t) => (idSet.has(t.id) ? { ...t, isUnread: !isRead } : t))
    );

    try {
      const authState = AuthStore.getState();
      const token = authState.token || 'default-token';
      const senderEmail = authState.user?.email || 'rahulkumar@eazzio.com';

      await fetch('/api/messages/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-email': senderEmail,
        },
        body: JSON.stringify({
          action: isRead ? 'read' : 'unread',
          threadIds,
        }),
      });
    } catch (err) {
      console.error('Failed to mark read/unread:', err);
    }
  };

  const handleSendReply = (threadId: string, replyText: string) => {
    const activeMessages = conversationMap[threadId] || [];
    const newMsg: MessageDetail = {
      id: `msg-${Date.now()}`,
      threadId,
      mailboxId: 'mbx-primary',
      folderId: activeFolderId,
      from: { name: 'You', email: AuthStore.getState().user?.email || 'rahulkumar@eazzio.com' },
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

  // Save as Draft Handler
  const handleSaveDraft = async (payload: ComposeEmailPayload) => {
    try {
      const authState = AuthStore.getState();
      const token = authState.token || 'default-token';
      const senderEmail = authState.user?.email || 'rahulkumar@eazzio.com';

      const response = await fetch('/api/messages/draft', {
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

      const res = await response.json();
      if (res.success) {
        setToasts((prev) => [
          {
            id: `toast-${Date.now()}`,
            title: 'Draft Saved',
            senderName: 'Eazzio Mailbox',
            message: `Draft "${payload.subject || 'No Subject'}" saved in Drafts folder.`,
            timestamp: 'Just now',
          },
          ...prev,
        ]);

        if (activeFolderId === 'fld-drafts') {
          loadMessages('fld-drafts');
        }
      }
    } catch (err: any) {
      console.error('Failed to save draft:', err);
    }
  };

  // Send Outbound Email Handler
  const handleSendComposeEmail = async (payload: ComposeEmailPayload) => {
    let assignedMessageId = `msg-${Date.now()}`;

    try {
      const authState = AuthStore.getState();
      const token = authState.token || 'default-token';
      const senderEmail = authState.user?.email || 'rahulkumar@eazzio.com';

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

        if (activeFolderId === 'fld-sent') {
          loadMessages('fld-sent');
        }
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
  };

  const handleToastClick = (threadId?: string) => {
    if (threadId) {
      setSelectedThreadId(threadId);
    }
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
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
      onOpenCompose={() => {
        setComposeInitialData({});
        setIsComposeOpen(true);
      }}
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

          {/* Gmail-Style Filter Chips Bar */}
          <div className="px-4 py-2 border-b border-[#22262E] bg-[#16181D] flex items-center gap-2 overflow-x-auto text-xs shrink-0 custom-scrollbar">
            {/* From ▾ */}
            <button
              onClick={() => setSearchQuery(searchQuery.includes('from:') ? '' : 'from: ')}
              className="px-3 py-1 rounded-lg border border-[#2A2E37] bg-[#111317] hover:bg-[#1E232B] text-slate-300 flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <span>From</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Any time ▾ */}
            <button
              className="px-3 py-1 rounded-lg border border-[#2A2E37] bg-[#111317] hover:bg-[#1E232B] text-slate-300 flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <span>Any time</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Has attachment */}
            <button
              onClick={() => setSearchQuery(searchQuery.includes('has:attachment') ? searchQuery.replace('has:attachment', '').trim() : `${searchQuery} has:attachment`.trim())}
              className={`px-3 py-1 rounded-lg border flex items-center gap-1.5 shrink-0 transition-colors ${
                searchQuery.includes('has:attachment')
                  ? 'border-[#2D5BFF] bg-[#2D5BFF]/20 text-[#2D5BFF] font-semibold'
                  : 'border-[#2A2E37] bg-[#111317] hover:bg-[#1E232B] text-slate-300'
              }`}
            >
              <span>Has attachment</span>
            </button>

            {/* To ▾ */}
            <button
              onClick={() => setSearchQuery(searchQuery.includes('to:') ? '' : 'to: ')}
              className="px-3 py-1 rounded-lg border border-[#2A2E37] bg-[#111317] hover:bg-[#1E232B] text-slate-300 flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <span>To</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Exclude Social */}
            <button
              onClick={() => setSearchQuery(searchQuery.includes('-label:social') ? searchQuery.replace('-label:social', '').trim() : `${searchQuery} -label:social`.trim())}
              className={`px-3 py-1 rounded-lg border flex items-center gap-1.5 shrink-0 transition-colors ${
                searchQuery.includes('-label:social')
                  ? 'border-[#2D5BFF] bg-[#2D5BFF]/20 text-[#2D5BFF] font-semibold'
                  : 'border-[#2A2E37] bg-[#111317] hover:bg-[#1E232B] text-slate-300'
              }`}
            >
              <span>Exclude Social</span>
            </button>

            {/* Is unread */}
            <button
              onClick={() => setSearchQuery(searchQuery.includes('is:unread') ? searchQuery.replace('is:unread', '').trim() : `${searchQuery} is:unread`.trim())}
              className={`px-3 py-1 rounded-lg border flex items-center gap-1.5 shrink-0 transition-colors ${
                searchQuery.includes('is:unread')
                  ? 'border-[#2D5BFF] bg-[#2D5BFF]/20 text-[#2D5BFF] font-semibold'
                  : 'border-[#2A2E37] bg-[#111317] hover:bg-[#1E232B] text-slate-300'
              }`}
            >
              <span>Is unread</span>
            </button>

            {/* Advanced search */}
            <button
              onClick={() => setSearchQuery('is:unread has:attachment')}
              className="ml-auto text-xs text-[#2D5BFF] hover:underline font-medium shrink-0"
            >
              Advanced search
            </button>
          </div>

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
                {displayedThreads.length === 0
                  ? `No messages in ${getFolderSlug(activeFolderId)}`
                  : 'Select a conversation'}
              </h3>
              <p className="text-xs text-[#94A3B8] max-w-sm mb-4">
                {displayedThreads.length === 0
                  ? `Your ${getFolderSlug(activeFolderId)} folder is clean and synced with PostgreSQL.`
                  : 'Choose an email thread from the list on the left to view messages, attachments, and quick replies.'}
              </p>
              <button
                onClick={() => loadMessages(activeFolderId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16181D] border border-[#2A2E37] text-xs text-[#94A3B8] hover:text-white hover:border-[#2D5BFF] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Folder
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
        onSaveDraft={handleSaveDraft}
        initialTo={composeInitialData.to}
        initialSubject={composeInitialData.subject}
        initialBody={composeInitialData.body}
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
