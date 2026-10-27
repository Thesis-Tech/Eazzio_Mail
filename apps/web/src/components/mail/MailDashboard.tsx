'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { DashboardLayout } from '../layout/DashboardLayout';
import { SplitSlider } from '../layout/SplitSlider';
import { ThreadList } from './ThreadList';
import { ConversationViewer } from './ConversationViewer';
import { ThreadSummary, MessageDetail, FolderItem, LabelItem, FilterRule, UserPreferences, ComposeEmailPayload, ComposerAttachment } from '../../types/mail';
import { Mail, Search, RefreshCw, ChevronDown, X } from 'lucide-react';

const MailComposer = dynamic(
  () => import('./MailComposer').then((mod) => mod.MailComposer),
  { ssr: false }
);

const SettingsModal = dynamic(
  () => import('../settings/SettingsModal').then((mod) => mod.SettingsModal),
  { ssr: false }
);

const SnoozeModal = dynamic(
  () => import('./SnoozeModal').then((mod) => mod.SnoozeModal),
  { ssr: false }
);
import { parseSearchQuery } from '../search/SearchBar';
import { realtimeClient, RealtimeMailEvent } from '../../lib/websocket-client';
import { ToastContainer, ToastNotification } from '../notification/ToastContainer';
import { AuthStore } from '../../lib/auth-store';

const initialFolders: FolderItem[] = [
  { id: 'fld-inbox', name: 'Inbox', slug: 'inbox', type: 'system', unreadCount: 0, totalCount: 0 },
  { id: 'fld-starred', name: 'Starred', slug: 'starred', type: 'system', unreadCount: 0, totalCount: 0 },
  { id: 'fld-snoozed', name: 'Snoozed', slug: 'snoozed', type: 'system', unreadCount: 0, totalCount: 0 },
  { id: 'fld-sent', name: 'Sent', slug: 'sent', type: 'system', unreadCount: 0, totalCount: 0 },
  { id: 'fld-scheduled', name: 'Scheduled', slug: 'scheduled', type: 'system', unreadCount: 0, totalCount: 0 },
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
  defaultMailbox: '',
  signature: 'Best regards,\nEazzio User',
  autoSummarizeWithAI: true,
  soundNotifications: true,
  theme: 'eazzio-teal',
};

// Stable folder slug resolver
const getFolderSlug = (folderId: string) => folderId.replace('fld-', '');

export function MailDashboardPage({ 
  initialFolder = 'fld-inbox',
  initialSettingsOpen = false,
  initialSettingsTab = 'general',
}: { 
  initialFolder?: string;
  initialSettingsOpen?: boolean;
  initialSettingsTab?: 'general' | 'labels' | 'inbox' | 'accounts' | 'filters' | 'forwarding' | 'themes';
}) {
  const [activeFolderId, setActiveFolderId] = useState(initialFolder);
  const [activeLabelId, setActiveLabelId] = useState<string | undefined>();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeInitialData, setComposeInitialData] = useState<{
    from?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body?: string;
    attachments?: ComposerAttachment[];
  }>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(initialSettingsOpen);
  const [isSnoozeModalOpen, setIsSnoozeModalOpen] = useState(false);
  const [snoozeTargetThreadIds, setSnoozeTargetThreadIds] = useState<string[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>(initialFolders);
  const [labels, setLabels] = useState<LabelItem[]>(initialLabels);
  const [filterRules, setFilterRules] = useState<FilterRule[]>(initialFilters);
  const [preferences, setPreferences] = useState<UserPreferences>(initialPreferences);
  const [density, setDensity] = useState<'default' | 'comfortable' | 'compact'>('default');
  const [settingsTab, setSettingsTab] = useState<'general' | 'labels' | 'inbox' | 'accounts' | 'filters' | 'forwarding' | 'themes'>(initialSettingsTab);
  const [readingPane, setReadingPane] = useState<'none' | 'right' | 'below'>('none');
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [conversationMap, setConversationMap] = useState<Record<string, MessageDetail[]>>({});
  const [mutedThreadIds, setMutedThreadIds] = useState<Set<string>>(new Set());

  // FE-005 Undo Send Pending Queue
  const pendingSendsRef = useRef<Map<string, { timeoutId: NodeJS.Timeout; payload: ComposeEmailPayload }>>(new Map());

  // Resizable Slider Width between Thread List & Conversation Viewer
  const [threadListWidth, setThreadListWidth] = useState<number>(384);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const isResizingRef = useRef(false);
  const startPosRef = useRef({ x: 0, width: 384 });

  // Restore persisted width & reading pane from localStorage on mount & handle URL query parameters (e.g. ?composeTo=...)
  useEffect(() => {
    try {
      const savedWidth = localStorage.getItem('eazzio_thread_list_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= 240 && parsed <= 850) {
          setThreadListWidth(parsed);
        }
      }
      const savedPane = localStorage.getItem('eazzio_reading_pane') as 'none' | 'right' | 'below';
      if (savedPane && ['none', 'right', 'below'].includes(savedPane)) {
        setReadingPane(savedPane);
      }

      // Check if URL parameters contain composeTo
      if (typeof window !== 'undefined' && window.location.search) {
        const searchParams = new URLSearchParams(window.location.search);
        const composeTo = searchParams.get('composeTo');
        const composeSubject = searchParams.get('composeSubject') || searchParams.get('subject');
        if (composeTo) {
          setComposeInitialData(prev => ({
            ...prev,
            to: [composeTo],
            subject: composeSubject || prev.subject || '',
          }));
          setIsComposeOpen(true);
        }
      }
    } catch (_) {}
  }, []);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    startPosRef.current = { x: e.clientX, width: threadListWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleTouchStartResize = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      isResizingRef.current = true;
      setIsResizing(true);
      startPosRef.current = { x: e.touches[0].clientX, width: threadListWidth };
      document.body.style.userSelect = 'none';
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = e.clientX - startPosRef.current.x;
      const newWidth = Math.max(260, Math.min(Math.min(800, window.innerWidth - 360), startPosRef.current.width + delta));
      setThreadListWidth(newWidth);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isResizingRef.current || e.touches.length === 0) return;
      const delta = e.touches[0].clientX - startPosRef.current.x;
      const newWidth = Math.max(260, Math.min(Math.min(800, window.innerWidth - 360), startPosRef.current.width + delta));
      setThreadListWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        try {
          localStorage.setItem('eazzio_thread_list_width', String(threadListWidth));
        } catch (_) {}
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [threadListWidth]);

  const handleResetResize = () => {
    setThreadListWidth(384);
    try {
      localStorage.setItem('eazzio_thread_list_width', '384');
    } catch (_) {}
  };

  // Request generation token to prevent out-of-order race conditions when switching folders
  const currentRequestIdRef = useRef<number>(0);

  // Fetch real messages from API for active folder (stable callback)
  const loadMessages = useCallback(async (folderId: string) => {
    const requestId = ++currentRequestIdRef.current;
    setIsLoading(true);
    setApiError(null);
    const slug = getFolderSlug(folderId);

    try {
      let authState = AuthStore.getState();
      if (!authState.user) {
        AuthStore.initFromStorage();
        authState = AuthStore.getState();
      }
      const token = authState.token || '';
      const senderEmail = authState.user?.email || '';

      const fetchHeaders: Record<string, string> = {};
      if (token) fetchHeaders['Authorization'] = `Bearer ${token}`;
      if (senderEmail) fetchHeaders['x-user-email'] = senderEmail;

      let res: Response | null = null;
      try {
        res = await fetch(`/api/messages?folder=${encodeURIComponent(slug)}`, {
          headers: fetchHeaders,
        });

        if (res && !res.ok && res.status === 502) {
          // Automatic retry if backend service was restarting
          await new Promise((r) => setTimeout(r, 1000));
          res = await fetch(`/api/messages?folder=${encodeURIComponent(slug)}`, {
            headers: fetchHeaders,
          });
        }
      } catch (fetchErr) {
        console.warn('Network error reaching /api/messages:', fetchErr);
        if (requestId === currentRequestIdRef.current) {
          setApiError('Unable to connect to the mail server. Check your connection.');
          setIsLoading(false);
        }
        return;
      }

      // Discard if another folder request was triggered in the meantime
      if (requestId !== currentRequestIdRef.current) {
        return;
      }

      if (!res || !res.ok) {
        const status = res?.status;
        console.warn(`Messages endpoint responded with status ${status}`);
        if (status === 401) {
          setApiError('Your session has expired. Please sign in again.');
        } else if (status === 429) {
          setApiError('Too many requests. Please wait a moment and try again.');
        } else if (status === 502) {
          setApiError('Mail service is temporarily unavailable. Please try again.');
        } else {
          setApiError(`Unable to load messages (${status || 'network error'})`);
        }
        setIsLoading(false);
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
          const rawRecipients = (Array.isArray(msg.recipients) && msg.recipients.length > 0)
            ? msg.recipients
            : (Array.isArray(msg.to) && msg.to.length > 0)
            ? msg.to
            : null;

          const toList = rawRecipients
            ? rawRecipients.map((r: any) => ({
                name: r.name || (r.email ? r.email.split('@')[0] : 'Recipient'),
                email: r.email || r.address || senderEmail,
              }))
            : msg.recipient_address
            ? [{ name: msg.recipient_address.split('@')[0], email: msg.recipient_address }]
            : (msg.direction === 'inbound' || slug === 'inbox')
            ? [{ name: 'You', email: senderEmail }]
            : [];

          const detail: MessageDetail = {
            id: msg.id,
            threadId: tId,
            mailboxId: msg.mailbox_id,
            folderId: folderId,
            from: { name: msg.from_address.split('@')[0], email: msg.from_address },
            to: toList,
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
          setSelectedThreadId(fetchedThreads[0].id);
        } else {
          setSelectedThreadId(null);
        }

        // Update active folder counts
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
      if (requestId === currentRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Sync background counts for all other folders (stable callback)
  const syncOtherFolderCounts = useCallback(async () => {
    try {
      const authState = AuthStore.getState();
      const token = authState.token || '';
      const senderEmail = authState.user?.email || '';

      const syncHeaders: Record<string, string> = {};
      if (token) syncHeaders['Authorization'] = `Bearer ${token}`;
      if (senderEmail) syncHeaders['x-user-email'] = senderEmail;

      const targetSlugs = ['inbox', 'starred', 'sent', 'drafts', 'spam', 'trash', 'archive'];
      for (const slug of targetSlugs) {
        try {
          const res = await fetch(`/api/messages?folder=${encodeURIComponent(slug)}`, {
            headers: syncHeaders,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data?.threads) {
              const ths: ThreadSummary[] = data.data.threads;
              setFolders((prev) =>
                prev.map((f) =>
                  f.slug === slug
                    ? {
                        ...f,
                        totalCount: ths.length,
                        unreadCount: ths.filter((t) => t.isUnread).length,
                      }
                    : f
                )
              );
            }
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Could not sync background folder counts:', err);
    }
  }, []);

  // Handle explicit folder selection
  const handleSelectFolder = (folderId: string) => {
    if (folderId === activeFolderId) return;

    // 1. Immediately reset dependent state to prevent stale data flashing
    setActiveFolderId(folderId);
    setActiveLabelId(undefined);
    setSelectedThreadId(null);
    setThreads([]);
    setIsLoading(true);
    setApiError(null);
    setApiError(null);

    const slug = getFolderSlug(folderId);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/mail/${slug}`);
    }

    // 2. Load fresh data for newly selected folder
    loadMessages(folderId);
  };

  // Initial load and prop synchronization
  useEffect(() => {
    const isAuth = AuthStore.initFromStorage();
    if (!isAuth && !AuthStore.getState().isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    setActiveFolderId(initialFolder);
    loadMessages(initialFolder);
    syncOtherFolderCounts();
  }, [initialFolder, loadMessages, syncOtherFolderCounts]);

  // Realtime WebSocket Subscription
  useEffect(() => {
    realtimeClient.connect();

    const unsubscribe = realtimeClient.subscribe('*', (event: RealtimeMailEvent) => {
      if (event.type === 'mail.received') {
        const data = event.data;
        const newThreadId = data?.threadId || `th-live-${Date.now()}`;
        const newThread: ThreadSummary = {
          id: newThreadId,
          mailboxId: event.mailboxId || 'primary',
          subject: data?.subject || 'Incoming Transmission',
          snippet: data?.snippet || 'You have received a new message.',
          sender: data?.from || { name: 'External Relay', email: 'relay@eazzio.com' },
          lastMessageAt: data?.receivedAt || 'Just now',
          messageCount: 1,
          isUnread: true,
          isStarred: false,
          hasAttachments: Boolean(data?.hasAttachments),
          labels: data?.labels || ['Inbox'],
        };

        const newMsg: MessageDetail = {
          id: data?.messageId || `msg-live-${Date.now()}`,
          threadId: newThreadId,
          mailboxId: event.mailboxId || 'primary',
          folderId: 'fld-inbox',
          from: data?.from || { name: 'External Relay', email: 'relay@eazzio.com' },
          to: [{ name: 'You', email: AuthStore.getState().user?.email || 'user@eazzio.com' }],
          subject: data?.subject || 'Incoming Transmission',
          snippet: data?.snippet || '',
          bodyText: data?.snippet || '',
          bodyHtml: `<p>${data?.snippet || ''}</p>`,
          receivedAt: 'Just now',
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

        // Increment Inbox folder counts
        setFolders((prev) =>
          prev.map((f) =>
            f.slug === 'inbox'
              ? {
                  ...f,
                  totalCount: f.totalCount + 1,
                  unreadCount: f.unreadCount + 1,
                }
              : f
          )
        );

        // Add toast notification
        setToasts((prev) => [
          {
            id: `toast-${Date.now()}`,
            title: data?.subject || 'New Incoming Email',
            senderName: data?.from?.name || 'Incoming Sender',
            message: data?.snippet || 'Click to view conversation.',
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
    setThreads((prev) => {
      const updated = prev.map((t) => (t.id === threadId ? { ...t, isUnread: false } : t));
      const unreadCount = updated.filter((t) => t.isUnread).length;
      setFolders((fPrev) =>
        fPrev.map((f) => (f.id === activeFolderId ? { ...f, unreadCount } : f))
      );
      return updated;
    });

    // Fetch authoritative message detail and recipients from backend
    const authState = AuthStore.getState();
    const token = authState.token || '';
    const senderEmail = authState.user?.email || '';

    fetch(`/api/messages/${threadId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-user-email': senderEmail,
      },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const detail: MessageDetail = res.data;
          setConversationMap((prev) => ({
            ...prev,
            [threadId]: [detail],
          }));
        }
      })
      .catch((err) => console.warn('Failed to fetch full message detail:', err));
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

    // Update Starred folder count in sidebar
    setFolders((prev) =>
      prev.map((f) =>
        f.slug === 'starred'
          ? {
              ...f,
              totalCount: Math.max(0, f.totalCount + (newStarred ? 1 : -1)),
            }
          : f
      )
    );

    try {
      const authState = AuthStore.getState();
      const token = authState.token || '';
      const senderEmail = authState.user?.email || '';

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
    setThreads((prev) => {
      const updated = prev.filter((t) => !idSet.has(t.id));
      setFolders((fPrev) =>
        fPrev.map((f) =>
          f.id === activeFolderId
            ? {
                ...f,
                totalCount: updated.length,
                unreadCount: updated.filter((t) => t.isUnread).length,
              }
            : f
        )
      );
      return updated;
    });

    if (selectedThreadId && idSet.has(selectedThreadId)) {
      setSelectedThreadId(null);
    }

    try {
      const authState = AuthStore.getState();
      const token = authState.token || '';
      const senderEmail = authState.user?.email || '';

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
    setThreads((prev) => {
      const updated = prev.filter((t) => !idSet.has(t.id));
      setFolders((fPrev) =>
        fPrev.map((f) =>
          f.id === activeFolderId
            ? {
                ...f,
                totalCount: updated.length,
                unreadCount: updated.filter((t) => t.isUnread).length,
              }
            : f
        )
      );
      return updated;
    });

    if (selectedThreadId && idSet.has(selectedThreadId)) {
      setSelectedThreadId(null);
    }

    try {
      const authState = AuthStore.getState();
      const token = authState.token || '';
      const senderEmail = authState.user?.email || '';

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

  const handleBulkUnarchive = async (threadIds: string[]) => {
    if (threadIds.length === 0) return;

    const idSet = new Set(threadIds);
    setThreads((prev) => {
      const updated = prev.filter((t) => !idSet.has(t.id));
      setFolders((fPrev) =>
        fPrev.map((f) =>
          f.id === activeFolderId
            ? {
                ...f,
                totalCount: updated.length,
                unreadCount: updated.filter((t) => t.isUnread).length,
              }
            : f
        )
      );
      return updated;
    });

    if (selectedThreadId && idSet.has(selectedThreadId)) {
      setSelectedThreadId(null);
    }

    try {
      const authState = AuthStore.getState();
      const token = authState.token || '';
      const senderEmail = authState.user?.email || '';

      await fetch('/api/messages/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-email': senderEmail,
        },
        body: JSON.stringify({
          action: 'unarchive',
          threadIds,
        }),
      });

      setToasts((prev) => [
        {
          id: `toast-${Date.now()}`,
          title: 'Restored to Inbox',
          senderName: 'Eazzio Mailbox',
          message: `${threadIds.length} conversation(s) moved back to Inbox.`,
          timestamp: 'Just now',
        },
        ...prev,
      ]);

      syncOtherFolderCounts();
    } catch (err) {
      console.error('Failed to execute unarchive:', err);
    }
  };

  const handleBulkCancelScheduled = async (threadIds: string[]) => {
    if (threadIds.length === 0) return;

    const idSet = new Set(threadIds);
    setThreads((prev) => {
      const updated = prev.filter((t) => !idSet.has(t.id));
      setFolders((fPrev) =>
        fPrev.map((f) =>
          f.id === activeFolderId
            ? {
                ...f,
                totalCount: updated.length,
                unreadCount: updated.filter((t) => t.isUnread).length,
              }
            : f
        )
      );
      return updated;
    });

    if (selectedThreadId && idSet.has(selectedThreadId)) {
      setSelectedThreadId(null);
    }

    try {
      const authState = AuthStore.getState();
      const token = authState.token || '';
      const senderEmail = authState.user?.email || '';

      await fetch('/api/messages/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-email': senderEmail,
        },
        body: JSON.stringify({
          action: 'cancel-scheduled',
          threadIds,
        }),
      });

      setToasts((prev) => [
        {
          id: `toast-${Date.now()}`,
          title: 'Scheduled Send Cancelled',
          senderName: 'Outbound Scheduler',
          message: `${threadIds.length} scheduled email(s) cancelled and moved to Drafts.`,
          timestamp: 'Just now',
        },
        ...prev,
      ]);

      syncOtherFolderCounts();
    } catch (err) {
      console.error('Failed to cancel scheduled send:', err);
    }
  };

  const handleBulkMarkRead = async (threadIds: string[], isRead: boolean) => {
    const idSet = new Set(threadIds);
    setThreads((prev) => {
      const updated = prev.map((t) => (idSet.has(t.id) ? { ...t, isUnread: !isRead } : t));
      const unreadCount = updated.filter((t) => t.isUnread).length;
      setFolders((fPrev) =>
        fPrev.map((f) => (f.id === activeFolderId ? { ...f, unreadCount } : f))
      );
      return updated;
    });

    try {
      const authState = AuthStore.getState();
      const token = authState.token || '';
      const senderEmail = authState.user?.email || '';

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

  const handleOpenSnooze = (threadIds: string[]) => {
    if (threadIds.length === 0) return;
    setSnoozeTargetThreadIds(threadIds);
    setIsSnoozeModalOpen(true);
  };

  const handleConfirmSnooze = async (snoozeDate: Date) => {
    const threadIds = snoozeTargetThreadIds;
    if (threadIds.length === 0) return;

    const idSet = new Set(threadIds);
    setThreads((prev) => prev.filter((t) => !idSet.has(t.id)));

    if (selectedThreadId && idSet.has(selectedThreadId)) {
      setSelectedThreadId(null);
    }

    try {
      const authState = AuthStore.getState();
      const token = authState.token || '';
      const senderEmail = authState.user?.email || '';

      for (const tId of threadIds) {
        await fetch(`/api/messages/${tId}/snooze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-user-email': senderEmail,
          },
          body: JSON.stringify({ snoozeUntil: snoozeDate.toISOString() }),
        });
      }

      setToasts((prev) => [
        {
          id: `toast-${Date.now()}`,
          title: 'Conversation Snoozed',
          senderName: 'Eazzio Mailbox',
          message: `${threadIds.length} conversation(s) snoozed until ${snoozeDate.toLocaleDateString([], { weekday: 'short' })} ${snoozeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          timestamp: 'Just now',
        },
        ...prev,
      ]);

      syncOtherFolderCounts();
    } catch (err) {
      console.error('Failed to snooze conversation:', err);
    }
  };

  const handleUnsnooze = async (threadId: string) => {
    try {
      const authState = AuthStore.getState();
      const token = authState.token || '';
      const senderEmail = authState.user?.email || '';

      await fetch(`/api/messages/${threadId}/unsnooze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-email': senderEmail,
        },
      });

      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (selectedThreadId === threadId) setSelectedThreadId(null);

      setToasts((prev) => [
        {
          id: `toast-${Date.now()}`,
          title: 'Unsnoozed',
          senderName: 'Eazzio Mailbox',
          message: 'Conversation restored to Inbox.',
          timestamp: 'Just now',
        },
        ...prev,
      ]);

      syncOtherFolderCounts();
    } catch (err) {
      console.error('Failed to unsnooze conversation:', err);
    }
  };

  const handleBulkSpam = async (threadIds: string[], isSpam: boolean) => {
    const idSet = new Set(threadIds);
    setThreads((prev) => {
      const updated = prev.filter((t) => !idSet.has(t.id));
      setFolders((fPrev) =>
        fPrev.map((f) =>
          f.id === activeFolderId
            ? {
                ...f,
                totalCount: updated.length,
                unreadCount: updated.filter((t) => t.isUnread).length,
              }
            : f
        )
      );
      return updated;
    });

    if (selectedThreadId && idSet.has(selectedThreadId)) {
      setSelectedThreadId(null);
    }

    try {
      const authState = AuthStore.getState();
      const token = authState.token || '';
      const senderEmail = authState.user?.email || '';

      await fetch('/api/messages/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-email': senderEmail,
        },
        body: JSON.stringify({
          action: isSpam ? 'spam' : 'not-spam',
          threadIds,
        }),
      });

      setToasts((prev) => [
        {
          id: `toast-${Date.now()}`,
          title: isSpam ? 'Reported as Spam' : 'Restored to Inbox',
          senderName: 'Eazzio Security',
          message: `${threadIds.length} conversation(s) ${isSpam ? 'moved to Spam and sender reputation adjusted' : 'moved back to Inbox'}.`,
          timestamp: 'Just now',
        },
        ...prev,
      ]);

      syncOtherFolderCounts();
    } catch (err) {
      console.error('Failed to update spam status:', err);
    }
  };

  // FE-006 Conversation Mute / Unmute
  const handleToggleMute = (threadId: string) => {
    const isCurrentlyMuted = mutedThreadIds.has(threadId);
    setMutedThreadIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyMuted) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });

    // Update in threads list
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, isMuted: !isCurrentlyMuted } : t))
    );

    setToasts((prev) => [
      {
        id: `toast-${Date.now()}`,
        title: isCurrentlyMuted ? 'Conversation Unmuted' : 'Conversation Muted',
        senderName: 'Eazzio Mailbox',
        message: isCurrentlyMuted
          ? 'New replies to this conversation will notify you and appear in your Inbox.'
          : 'New replies will automatically skip your Inbox and be archived.',
        timestamp: 'Just now',
      },
      ...prev,
    ]);
  };

  const handleEmptyFolder = async (folderSlug: string) => {
    const confirmMessage =
      folderSlug === 'trash'
        ? 'Are you sure you want to permanently delete all messages in Trash? This action cannot be undone.'
        : 'Are you sure you want to permanently delete all messages in Spam? This action cannot be undone.';

    if (!window.confirm(confirmMessage)) return;

    setThreads([]);
    setSelectedThreadId(null);

    setFolders((prev) =>
      prev.map((f) =>
        f.slug === folderSlug
          ? { ...f, totalCount: 0, unreadCount: 0 }
          : f
      )
    );

    try {
      const authState = AuthStore.getState();
      const token = authState.token || '';
      const senderEmail = authState.user?.email || '';

      await fetch(`/api/messages/${folderSlug}/empty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-email': senderEmail,
        },
      });

      setToasts((prev) => [
        {
          id: `toast-${Date.now()}`,
          title: `${folderSlug.toUpperCase()} Emptied`,
          senderName: 'Eazzio Mailbox',
          message: `All conversations in ${folderSlug} have been permanently deleted.`,
          timestamp: 'Just now',
        },
        ...prev,
      ]);

      syncOtherFolderCounts();
    } catch (err) {
      console.error(`Failed to empty ${folderSlug}:`, err);
    }
  };

  const handleSendReply = async (threadId: string, replyText: string) => {
    const activeMessages = conversationMap[threadId] || [];
    const latestMsg = activeMessages[activeMessages.length - 1];
    const currentUserEmail = AuthStore.getState().user?.email || 'user@eazzio.com';
    const targetRecipient = latestMsg?.from?.email || activeMessages[0]?.from?.email || 'sender@eazzio.com';

    const newMsg: MessageDetail = {
      id: `msg-${Date.now()}`,
      threadId,
      mailboxId: 'mbx-primary',
      folderId: activeFolderId,
      from: { name: 'You', email: currentUserEmail },
      to: [{ name: latestMsg?.from?.name || 'Recipient', email: targetRecipient }],
      subject: `Re: ${latestMsg?.subject || activeMessages[0]?.subject || 'Conversation'}`.replace(/^(Re:\s*)+/i, 'Re: '),
      snippet: replyText.replace(/<[^>]+>/g, '').slice(0, 80),
      bodyText: replyText.replace(/<[^>]+>/g, ''),
      bodyHtml: replyText.includes('<') ? replyText : `<p>${replyText.replace(/\n/g, '<br>')}</p>`,
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
              snippet: replyText.replace(/<[^>]+>/g, '').slice(0, 80),
              lastMessageAt: 'Just now',
            }
          : t
      )
    );

    // Persist reply to backend
    try {
      const authState = AuthStore.getState();
      const token = authState.token || '';
      await fetch('/api/messages/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-email': currentUserEmail,
        },
        body: JSON.stringify({
          to: [targetRecipient],
          subject: newMsg.subject,
          body: newMsg.bodyText,
          bodyHtml: newMsg.bodyHtml,
          bodyText: newMsg.bodyText,
          threadId,
        }),
      });
    } catch (err) {
      console.warn('Failed to persist reply to backend:', err);
    }
  };

  const handleReply = (msg: MessageDetail) => {
    const rawSubj = msg.subject || '';
    const cleanSubj = rawSubj.toLowerCase().startsWith('re:') ? rawSubj : `Re: ${rawSubj}`;
    const dateStr = msg.receivedAt || 'Recent';
    const authorStr = msg.from.name ? `${msg.from.name} <${msg.from.email}>` : msg.from.email;
    const origBodyHtml = msg.bodyHtml || `<p>${(msg.bodyText || msg.snippet || '').replace(/\n/g, '<br>')}</p>`;
    
    const quotedBody = `<br><br><div class="gmail_quote"><div class="gmail_attr">On ${dateStr}, ${authorStr} wrote:<br></div><blockquote class="gmail_quote" style="margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;">${origBodyHtml}</blockquote></div>`;

    setComposeInitialData({
      to: [msg.from.email],
      cc: [],
      bcc: [],
      subject: cleanSubj,
      body: quotedBody,
      attachments: [],
    });
    setIsComposeOpen(true);
  };

  const handleReplyAll = (msg: MessageDetail) => {
    const currentUserEmail = AuthStore.getState().user?.email?.toLowerCase() || '';
    const rawSubj = msg.subject || '';
    const cleanSubj = rawSubj.toLowerCase().startsWith('re:') ? rawSubj : `Re: ${rawSubj}`;
    const allTo = [
      msg.from.email,
      ...msg.to.map((t) => t.email).filter((e) => e && e.toLowerCase() !== currentUserEmail),
    ];
    const uniqueTo = Array.from(new Set(allTo.filter(Boolean)));
    const uniqueCc = msg.cc ? Array.from(new Set(msg.cc.map((c) => c.email).filter((e) => e && e.toLowerCase() !== currentUserEmail))) : [];
    
    const dateStr = msg.receivedAt || 'Recent';
    const authorStr = msg.from.name ? `${msg.from.name} <${msg.from.email}>` : msg.from.email;
    const origBodyHtml = msg.bodyHtml || `<p>${(msg.bodyText || msg.snippet || '').replace(/\n/g, '<br>')}</p>`;
    const quotedBody = `<br><br><div class="gmail_quote"><div class="gmail_attr">On ${dateStr}, ${authorStr} wrote:<br></div><blockquote class="gmail_quote" style="margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;">${origBodyHtml}</blockquote></div>`;

    setComposeInitialData({
      to: uniqueTo,
      cc: uniqueCc,
      bcc: [],
      subject: cleanSubj,
      body: quotedBody,
      attachments: [],
    });
    setIsComposeOpen(true);
  };

  const handleForward = (msg: MessageDetail) => {
    const rawSubj = msg.subject || '';
    const cleanSubj = rawSubj.toLowerCase().startsWith('fwd:') ? rawSubj : `Fwd: ${rawSubj}`;
    const origBodyHtml = msg.bodyHtml || `<p>${(msg.bodyText || msg.snippet || '').replace(/\n/g, '<br>')}</p>`;
    const fwdBody = `<br><br><div class="gmail_quote"><div class="gmail_attr">---------- Forwarded message ---------<br>From: <b>${msg.from.name || ''}</b> &lt;${msg.from.email}&gt;<br>Date: ${msg.receivedAt}<br>Subject: ${msg.subject}<br>To: ${msg.to.map((t) => t.email).join(', ')}<br><br></div><blockquote class="gmail_quote" style="margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;">${origBodyHtml}</blockquote></div>`;

    const composerAttachments: ComposerAttachment[] = (msg.attachments || []).map((att) => ({
      id: att.id,
      name: att.filename,
      sizeBytes: att.sizeBytes,
      contentType: att.contentType,
    }));

    setComposeInitialData({
      to: [],
      cc: [],
      bcc: [],
      subject: cleanSubj,
      body: fwdBody,
      attachments: composerAttachments,
    });
    setIsComposeOpen(true);
  };

  // Ensure selected thread is strictly from current filtered/fetched threads
  const selectedThread = threads.find((t) => t.id === selectedThreadId);
  const currentMessages = selectedThreadId ? conversationMap[selectedThreadId] || [] : [];

  // Save as Draft Handler
  const handleSaveDraft = async (payload: ComposeEmailPayload) => {
    try {
      const authState = AuthStore.getState();
      const token = authState.token || '';
      const senderEmail = authState.user?.email || '';

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

        // Increment Drafts folder count
        setFolders((prev) =>
          prev.map((f) =>
            f.slug === 'drafts'
              ? { ...f, totalCount: f.totalCount + 1 }
              : f
          )
        );

        if (activeFolderId === 'fld-drafts') {
          loadMessages('fld-drafts');
        }
      }
    } catch (err: any) {
      console.error('Failed to save draft:', err);
    }
  };

  // Actual dispatch outbound worker
  const dispatchOutboundEmail = async (payload: ComposeEmailPayload) => {
    let assignedMessageId = `msg-${Date.now()}`;

    try {
      const authState = AuthStore.getState();
      const token = authState.token || '';
      const senderEmail = authState.user?.email || '';

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
          from: payload.from,
          subject: payload.subject,
          bodyText: payload.body,
          bodyHtml: payload.bodyHtml || `<p>${payload.body.replace(/\n/g, '<br>')}</p>`,
          scheduledAt: payload.scheduledAt,
        }),
      });

      const result = await response.json();
      if (result.success) {
        assignedMessageId = result.messageId || assignedMessageId;
        const msgIdForCancel = result.id || result.queueIds?.[0] || assignedMessageId;
        const hasServerUndo = Boolean(result.undoGraceSeconds && result.undoGraceSeconds > 0 && !payload.scheduledAt);

        const successToastId = `toast-${Date.now()}`;
        setToasts((prev) => [
          {
            id: successToastId,
            title: payload.scheduledAt ? 'Message Scheduled' : 'Message Sent',
            senderName: 'Outbound Mail Pipeline',
            message: payload.scheduledAt 
              ? `Scheduled for delivery to ${payload.to.join(', ')}`
              : (hasServerUndo ? `Message queued for delivery. Undo available for ${result.undoGraceSeconds}s.` : `Delivered to ${payload.to.join(', ')}`),
            timestamp: 'Just now',
            actionLabel: hasServerUndo ? 'Undo' : undefined,
            onAction: hasServerUndo ? async () => {
              try {
                const cancelRes = await fetch(`/api/messages/outbound/${encodeURIComponent(msgIdForCancel)}/cancel`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    'x-user-email': senderEmail,
                  },
                });
                const cancelData = await cancelRes.json();
                if (cancelData.success) {
                  // Restore composer with draft
                  setComposeInitialData({
                    to: payload.to,
                    cc: payload.cc,
                    bcc: payload.bcc,
                    subject: payload.subject,
                    body: payload.body,
                    attachments: payload.attachments,
                  });
                  setIsComposeOpen(true);
                  setToasts((tp) => [
                    {
                      id: `toast-${Date.now()}`,
                      title: 'Send Cancelled',
                      senderName: 'Outbound Pipeline',
                      message: 'Message delivery aborted. Restored to draft.',
                      timestamp: 'Just now',
                    },
                    ...tp.filter((t) => t.id !== successToastId),
                  ]);
                } else {
                  alert(cancelData.error?.message || cancelData.error || 'Unable to abort sending: message already relayed.');
                }
              } catch (cancelErr: any) {
                console.error('Failed to cancel outbound sending:', cancelErr);
              }
            } : undefined,
          },
          ...prev,
        ]);

        // Increment Sent folder count
        setFolders((prev) =>
          prev.map((f) =>
            f.slug === 'sent'
              ? { ...f, totalCount: f.totalCount + 1 }
              : f
          )
        );

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

  // Send Outbound Email Handler (FE-005 Undo Send with 10s buffer)
  const handleSendComposeEmail = async (payload: ComposeEmailPayload) => {
    // If scheduled, dispatch directly
    if (payload.scheduledAt) {
      await dispatchOutboundEmail(payload);
      return;
    }

    const sendId = `send-${Date.now()}`;
    const undoTimeSeconds = 10;

    // Toast with interactive "Undo" button
    const toastId = `toast-undo-${Date.now()}`;
    
    const timeoutId = setTimeout(async () => {
      pendingSendsRef.current.delete(sendId);
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
      await dispatchOutboundEmail(payload);
    }, undoTimeSeconds * 1000);

    pendingSendsRef.current.set(sendId, { timeoutId, payload });

    setToasts((prev) => [
      {
        id: toastId,
        title: 'Sending message...',
        senderName: 'Outbound Queue',
        message: `Sending to ${payload.to.join(', ')} in ${undoTimeSeconds}s`,
        timestamp: 'Just now',
        actionLabel: 'Undo',
        onAction: () => {
          const pending = pendingSendsRef.current.get(sendId);
          if (pending) {
            clearTimeout(pending.timeoutId);
            pendingSendsRef.current.delete(sendId);
            // Re-open composer with existing draft
            setComposeInitialData({
              to: payload.to,
              cc: payload.cc,
              bcc: payload.bcc,
              subject: payload.subject,
              body: payload.body,
              attachments: payload.attachments,
            });
            setIsComposeOpen(true);
            setToasts((tp) => [
              {
                id: `toast-${Date.now()}`,
                title: 'Send Cancelled',
                senderName: 'Outbound Queue',
                message: 'Your email has been restored to draft.',
                timestamp: 'Just now',
              },
              ...tp.filter((t) => t.id !== toastId),
            ]);
          }
        },
      },
      ...prev,
    ]);
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
      onSelectFolder={handleSelectFolder}
      onSelectLabel={(labelId) => {
        setActiveLabelId(labelId);
      }}
      customFolders={folders}
      customLabels={labels}
      density={density}
      onDensityChange={setDensity}
      readingPane={readingPane}
      onReadingPaneChange={setReadingPane}
      onSearch={setSearchQuery}
      onOpenCompose={() => {
        setComposeInitialData({});
        setIsComposeOpen(true);
      }}
      onOpenSettings={(tab?: any) => {
        if (tab) setSettingsTab(tab);
        setIsSettingsOpen(true);
      }}
      onCreateLabel={async (name: string, color: string) => {
        try {
          const authState = AuthStore.getState();
          const token = authState.token || '';
          const senderEmail = authState.user?.email || '';

          const res = await fetch('/api/settings/labels', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              'x-user-email': senderEmail,
            },
            body: JSON.stringify({ name, color }),
          });

          if (res.ok) {
            const json = await res.json();
            const created = json.data || { id: `lbl-${Date.now()}`, name, color };
            setLabels((prev) => [...prev, created]);
            setToasts((prev) => [
              {
                id: `toast-${Date.now()}`,
                title: 'Label Created',
                senderName: 'Eazzio Mailbox',
                message: `Label "${name}" was created successfully.`,
                timestamp: 'Just now',
              },
              ...prev,
            ]);
          } else {
            // Local fallback
            const created = { id: `lbl-${Date.now()}`, name, color };
            setLabels((prev) => [...prev, created]);
          }
        } catch (err) {
          console.error('Failed to create label:', err);
          const created = { id: `lbl-${Date.now()}`, name, color };
          setLabels((prev) => [...prev, created]);
        }
      }}
    >
      <div 
        style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)' }}
        className={`flex-1 flex ${readingPane === 'below' && selectedThreadId ? 'flex-col' : 'flex-row'} overflow-hidden`}
      >
        {/* Column 1: Thread List */}
        <div
          style={{
            ...(readingPane === 'right' && selectedThreadId ? { width: `${threadListWidth}px` } : {}),
            ...(readingPane === 'below' && selectedThreadId ? { height: '50%' } : {}),
            backgroundColor: 'var(--theme-bg-main, #0A0C10)',
            borderColor: 'var(--theme-border, #1E232B)',
          }}
          className={`${
            readingPane === 'none' && selectedThreadId
              ? 'hidden'
              : readingPane === 'right' && selectedThreadId
              ? 'hidden md:flex shrink-0 border-r'
              : readingPane === 'below' && selectedThreadId
              ? 'flex shrink-0 border-b'
              : 'flex flex-1 w-full'
          } flex-col min-w-0`}
        >
          {/* Active Search Term Filter Chip Bar */}
          {(parsedFilters.from ||
            parsedFilters.subject ||
            parsedFilters.hasAttachment ||
            parsedFilters.isUnread ||
            parsedFilters.isStarred ||
            parsedFilters.label) && (
            <div 
              style={{ backgroundColor: 'var(--theme-bg-card, #FFFFFF)', borderColor: 'var(--theme-border, #E2E8F0)' }}
              className="px-4 py-2 border-b flex flex-wrap items-center gap-1.5 text-xs text-[var(--theme-text-secondary,#475569)]"
            >
              <span className="font-semibold mr-1 flex items-center gap-1 text-[var(--theme-text-primary,#0F172A)]">
                <Search style={{ color: 'var(--theme-accent, #14B8A6)' }} className="w-3 h-3" /> Active Filters:
              </span>
              {parsedFilters.from && (
                <span style={{ backgroundColor: 'var(--theme-accent-bg, rgba(20,184,166,0.1))', color: 'var(--theme-accent, #14B8A6)', borderColor: 'var(--theme-border, #E2E8F0)' }} className="px-2 py-0.5 rounded border">
                  from:{parsedFilters.from}
                </span>
              )}
              {parsedFilters.subject && (
                <span style={{ backgroundColor: 'var(--theme-accent-bg, rgba(20,184,166,0.1))', color: 'var(--theme-accent, #14B8A6)', borderColor: 'var(--theme-border, #E2E8F0)' }} className="px-2 py-0.5 rounded border">
                  subject:{parsedFilters.subject}
                </span>
              )}
              {parsedFilters.hasAttachment && (
                <span style={{ backgroundColor: 'var(--theme-accent-bg, rgba(20,184,166,0.1))', color: 'var(--theme-accent, #14B8A6)', borderColor: 'var(--theme-border, #E2E8F0)' }} className="px-2 py-0.5 rounded border">
                  has:attachment
                </span>
              )}
              {parsedFilters.isUnread && (
                <span style={{ backgroundColor: 'var(--theme-accent-bg, rgba(20,184,166,0.1))', color: 'var(--theme-accent, #14B8A6)', borderColor: 'var(--theme-border, #E2E8F0)' }} className="px-2 py-0.5 rounded border">
                  is:unread
                </span>
              )}
              {parsedFilters.isStarred && (
                <span style={{ backgroundColor: 'var(--theme-accent-bg, rgba(20,184,166,0.1))', color: 'var(--theme-accent, #14B8A6)', borderColor: 'var(--theme-border, #E2E8F0)' }} className="px-2 py-0.5 rounded border">
                  is:starred
                </span>
              )}
              {parsedFilters.label && (
                <span style={{ backgroundColor: 'var(--theme-accent-bg, rgba(20,184,166,0.1))', color: 'var(--theme-accent, #14B8A6)', borderColor: 'var(--theme-border, #E2E8F0)' }} className="px-2 py-0.5 rounded border">
                  label:{parsedFilters.label}
                </span>
              )}
              <button
                onClick={() => setSearchQuery('')}
                className="ml-auto text-xs opacity-70 hover:opacity-100 flex items-center gap-0.5 transition-opacity"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            </div>
          )}

          {/* Filter Chips Bar */}
          <div 
            style={{
              backgroundColor: 'var(--theme-bg-header, #FFFFFF)',
              borderColor: 'var(--theme-border, #E2E8F0)',
            }}
            className="px-4 py-2 border-b flex items-center gap-2 overflow-x-auto text-xs shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {/* From ▾ */}
            <button
              onClick={() => setSearchQuery(searchQuery.includes('from:') ? '' : 'from: ')}
              style={{
                backgroundColor: 'var(--theme-bg-card, #FFFFFF)',
                borderColor: 'var(--theme-border, #CBD5E1)',
              }}
              className="px-3 py-1.5 rounded-xl border hover:opacity-90 font-medium flex items-center gap-1.5 shrink-0 transition-all text-xs shadow-xs"
            >
              <span>From</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Any time ▾ */}
            <button
              style={{
                backgroundColor: 'var(--theme-bg-card, #FFFFFF)',
                borderColor: 'var(--theme-border, #CBD5E1)',
              }}
              className="px-3 py-1.5 rounded-xl border hover:opacity-90 font-medium flex items-center gap-1.5 shrink-0 transition-all text-xs shadow-xs"
            >
              <span>Any time</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Has attachment */}
            <button
              onClick={() => setSearchQuery(searchQuery.includes('has:attachment') ? searchQuery.replace('has:attachment', '').trim() : `${searchQuery} has:attachment`.trim())}
              style={{
                backgroundColor: searchQuery.includes('has:attachment') ? 'var(--theme-accent-bg, #F0FDFA)' : 'var(--theme-bg-card, #FFFFFF)',
                borderColor: searchQuery.includes('has:attachment') ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #CBD5E1)',
                color: searchQuery.includes('has:attachment') ? 'var(--theme-accent, #0F766E)' : undefined,
              }}
              className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shrink-0 transition-all text-xs font-medium shadow-xs"
            >
              <span>Has attachment</span>
            </button>

            {/* To ▾ */}
            <button
              onClick={() => setSearchQuery(searchQuery.includes('to:') ? '' : 'to: ')}
              style={{
                backgroundColor: 'var(--theme-bg-card, #FFFFFF)',
                borderColor: 'var(--theme-border, #CBD5E1)',
              }}
              className="px-3 py-1.5 rounded-xl border hover:opacity-90 font-medium flex items-center gap-1.5 shrink-0 transition-all text-xs shadow-xs"
            >
              <span>To</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Exclude Social */}
            <button
              onClick={() => setSearchQuery(searchQuery.includes('-label:social') ? searchQuery.replace('-label:social', '').trim() : `${searchQuery} -label:social`.trim())}
              style={{
                backgroundColor: searchQuery.includes('-label:social') ? 'var(--theme-accent-bg, #F0FDFA)' : 'var(--theme-bg-card, #FFFFFF)',
                borderColor: searchQuery.includes('-label:social') ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #CBD5E1)',
                color: searchQuery.includes('-label:social') ? 'var(--theme-accent, #0F766E)' : undefined,
              }}
              className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shrink-0 transition-all text-xs font-medium shadow-xs"
            >
              <span>Exclude Social</span>
            </button>

            {/* Is unread */}
            <button
              onClick={() => setSearchQuery(searchQuery.includes('is:unread') ? searchQuery.replace('is:unread', '').trim() : `${searchQuery} is:unread`.trim())}
              style={{
                backgroundColor: searchQuery.includes('is:unread') ? 'var(--theme-accent-bg, #F0FDFA)' : 'var(--theme-bg-card, #FFFFFF)',
                borderColor: searchQuery.includes('is:unread') ? 'var(--theme-accent, #14B8A6)' : 'var(--theme-border, #CBD5E1)',
                color: searchQuery.includes('is:unread') ? 'var(--theme-accent, #0F766E)' : undefined,
              }}
              className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shrink-0 transition-all text-xs font-medium shadow-xs"
            >
              <span>Is unread</span>
            </button>

            {/* Advanced search */}
            <button
              onClick={() => setSearchQuery('is:unread has:attachment')}
              style={{ color: 'var(--theme-accent, #0F766E)' }}
              className="ml-auto text-xs font-semibold hover:underline shrink-0 transition-colors"
            >
              Advanced search
            </button>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {isLoading ? (
              <div className="p-4 space-y-3 divide-y divide-[var(--theme-border,#1E232B)]/40 overflow-hidden">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="pt-3 first:pt-0 flex items-center gap-3 animate-pulse">
                    <div className="w-4 h-4 rounded bg-[var(--theme-border,#CBD5E1)]/40 shrink-0" />
                    <div className="w-4 h-4 rounded bg-[var(--theme-border,#CBD5E1)]/30 shrink-0" />
                    <div className="w-8 h-8 rounded-full bg-[var(--theme-border,#CBD5E1)]/50 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="h-3.5 bg-[var(--theme-border,#CBD5E1)]/60 rounded w-1/4" />
                        <div className="h-3 bg-[var(--theme-border,#CBD5E1)]/40 rounded w-16" />
                      </div>
                      <div className="h-3 bg-[var(--theme-border,#CBD5E1)]/50 rounded w-3/4" />
                      <div className="h-2.5 bg-[var(--theme-border,#CBD5E1)]/30 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : apiError ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                <div
                  style={{
                    backgroundColor: 'var(--theme-bg-card, #FFFFFF)',
                    borderColor: 'var(--theme-border, #E2E8F0)',
                  }}
                  className="w-16 h-16 rounded-3xl border flex items-center justify-center mb-4 shadow-sm"
                >
                  <RefreshCw className="w-7 h-7 opacity-50" />
                </div>
                <p className="text-sm font-semibold mb-1 tracking-tight">{apiError}</p>
                <p className="text-xs opacity-50 mb-4 max-w-xs">
                  {apiError.includes('session') ? 'Your credentials may have expired.' : 'There was a problem connecting to your mailbox.'}
                </p>
                {apiError.includes('session') ? (
                  <button
                    onClick={() => { window.location.href = '/login'; }}
                    style={{ backgroundColor: 'var(--theme-accent, #14B8A6)' }}
                    className="px-4 py-2 rounded-lg text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    Sign in again
                  </button>
                ) : (
                  <button
                    onClick={() => loadMessages(activeFolderId)}
                    style={{ backgroundColor: 'var(--theme-accent, #14B8A6)' }}
                    className="px-4 py-2 rounded-lg text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                )}
              </div>
            ) : (
              <ThreadList
                threads={displayedThreads}
                selectedThreadId={selectedThreadId}
                onSelectThread={handleSelectThread}
                onToggleStar={handleToggleStar}
                onBulkDelete={handleBulkDelete}
                onBulkArchive={handleBulkArchive}
                onBulkUnarchive={handleBulkUnarchive}
                onBulkMarkRead={handleBulkMarkRead}
                onSnooze={handleOpenSnooze}
                onToggleMute={handleToggleMute}
                onBulkSpam={handleBulkSpam}
                onCancelScheduled={handleBulkCancelScheduled}
                onEmptyFolder={handleEmptyFolder}
                folderName={getFolderSlug(activeFolderId).toUpperCase()}
                totalThreadsCount={displayedThreads.length}
                onRefresh={() => loadMessages(activeFolderId)}
                isSplitView={readingPane !== 'none' && Boolean(selectedThreadId)}
                density={density}
              />
            )}
          </div>
        </div>

        {/* Resizable Split Slider Divider (only active in 'right' reading pane mode) */}
        {readingPane === 'right' && selectedThreadId && (
          <SplitSlider
            isDragging={isResizing}
            currentWidth={threadListWidth}
            onMouseDown={handleMouseDownResize}
            onTouchStart={handleTouchStartResize}
            onDoubleClick={handleResetResize}
          />
        )}

        {/* Active Conversation Viewer */}
        {selectedThreadId && selectedThread && (
          <div 
            style={{ backgroundColor: 'var(--theme-bg-main, #0A0C10)' }}
            className={`flex flex-1 flex-col overflow-hidden min-w-0 ${
              readingPane === 'none' ? 'w-full' : ''
            }`}
          >
            <ConversationViewer
              threadId={selectedThread.id}
              subject={selectedThread.subject}
              messages={currentMessages}
              folderName={getFolderSlug(activeFolderId)}
              labels={selectedThread.labels}
              onSendReply={(threadId, replyText) => handleSendReply(threadId, replyText)}
              onReply={handleReply}
              onReplyAll={handleReplyAll}
              onForward={handleForward}
              onArchive={(threadId) => handleBulkArchive([threadId])}
              onUnarchive={(threadId) => handleBulkUnarchive([threadId])}
              onDelete={(threadId) => handleBulkDelete([threadId])}
              onToggleStar={(threadId) => handleToggleStar(threadId)}
              onSnooze={(threadId) => handleOpenSnooze([threadId])}
              onSpam={(threadId, isSpam) => handleBulkSpam([threadId], isSpam)}
              onCancelScheduled={(threadId) => handleBulkCancelScheduled([threadId])}
              onClose={() => setSelectedThreadId(null)}
            />
          </div>
        )}
      </div>

      {/* Snooze Picker Modal */}
      <SnoozeModal
        isOpen={isSnoozeModalOpen}
        onClose={() => setIsSnoozeModalOpen(false)}
        onSnooze={handleConfirmSnooze}
        targetCount={snoozeTargetThreadIds.length}
      />

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
        initialFrom={composeInitialData.from}
        initialTo={composeInitialData.to}
        initialCc={composeInitialData.cc}
        initialBcc={composeInitialData.bcc}
        initialSubject={composeInitialData.subject}
        initialBody={composeInitialData.body}
        initialAttachments={composeInitialData.attachments}
      />

      {/* Modal: Settings, Labels, Filters & Preferences */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
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

export const MailDashboard = MailDashboardPage;
export default MailDashboardPage;
