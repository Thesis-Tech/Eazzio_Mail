'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ThreadList } from '../components/mail/ThreadList';
import { ConversationViewer } from '../components/mail/ConversationViewer';
import { MailComposer, ComposeEmailPayload } from '../components/mail/MailComposer';
import { ThreadSummary, MessageDetail } from '../types/mail';
import { Mail, Sparkles, X, Search } from 'lucide-react';
import { parseSearchQuery } from '../components/search/SearchBar';
import { realtimeClient, RealtimeMailEvent } from '../lib/websocket-client';
import { ToastContainer, ToastNotification } from '../components/notification/ToastContainer';

const initialThreads: ThreadSummary[] = [
  {
    id: 'th-101',
    mailboxId: 'mbx-primary',
    subject: 'Q3 Infrastructure Security Audit Report',
    snippet: 'Please find the finalized security audit overview for the inbound mail daemon and LMTP delivery...',
    sender: { name: 'Security Operations', email: 'security@eazzio.com' },
    lastMessageAt: '10:42 AM',
    messageCount: 2,
    isUnread: true,
    isStarred: false,
    hasAttachments: true,
    labels: ['Security'],
  },
  {
    id: 'th-102',
    mailboxId: 'mbx-primary',
    subject: 'Valkey Cache & OpenSearch Cluster Scale Out',
    snippet: 'Cluster nodes have been scaled horizontally across availability zones with automatic failover.',
    sender: { name: 'DevOps Engineering', email: 'devops@eazzio.com' },
    lastMessageAt: 'Yesterday',
    messageCount: 3,
    isUnread: false,
    isStarred: true,
    hasAttachments: false,
    labels: ['Infrastructure'],
  },
  {
    id: 'th-103',
    mailboxId: 'mbx-primary',
    subject: 'Argon2id Identity & Better Auth Migration',
    snippet: 'The authentication service now uses modern Argon2id password hashing and session tokens.',
    sender: { name: 'Identity Team', email: 'auth@eazzio.com' },
    lastMessageAt: 'Aug 19',
    messageCount: 1,
    isUnread: true,
    isStarred: false,
    hasAttachments: false,
    labels: ['Auth'],
  },
];

const mockConversationMap: Record<string, MessageDetail[]> = {
  'th-101': [
    {
      id: 'msg-101-1',
      threadId: 'th-101',
      mailboxId: 'mbx-primary',
      folderId: 'fld-inbox',
      from: { name: 'Security Operations', email: 'security@eazzio.com' },
      to: [{ name: 'Alex Rivers', email: 'alex@eazzio.com' }],
      subject: 'Q3 Infrastructure Security Audit Report',
      snippet: 'Initial findings on LMTP and Rspamd integration...',
      bodyText: `Hello Alex,\n\nWe have completed the Q3 automated vulnerability assessment and configuration audit for the Eazzio Mail platform.\n\nSummary of Checks:\n1. Strict TLS and Postfix LMTP transport isolation: PASS\n2. ClamAV streaming malware scan: PASS (0 threats found)\n3. SPF/DKIM/DMARC 4-check DNS alignment: 100% compliant\n\nPlease let us know if any further security assertions are required.`,
      bodyHtml: '<p>Security audit overview complete.</p>',
      receivedAt: 'Aug 21, 10:15 AM',
      isRead: true,
      isStarred: false,
      security: {
        spf: 'pass',
        dkim: 'pass',
        dmarc: 'pass',
        clamavStatus: 'clean',
        spamScore: 0.1,
      },
      attachments: [
        {
          id: 'att-1',
          filename: 'Security_Audit_Report_Q3.pdf',
          contentType: 'application/pdf',
          sizeBytes: 142000,
          antivirusStatus: 'clean',
        },
      ],
    },
    {
      id: 'msg-101-2',
      threadId: 'th-101',
      mailboxId: 'mbx-primary',
      folderId: 'fld-inbox',
      from: { name: 'Security Operations', email: 'security@eazzio.com' },
      to: [{ name: 'Alex Rivers', email: 'alex@eazzio.com' }],
      subject: 'Re: Q3 Infrastructure Security Audit Report',
      snippet: 'Action items attached for the team.',
      bodyText: `Hi Alex,\n\nFollowing up on the audit, the final sign-off is ready. You may proceed with the next deployment phase.`,
      bodyHtml: '<p>Final sign-off complete.</p>',
      receivedAt: 'Aug 21, 10:42 AM',
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
    },
  ],
  'th-102': [
    {
      id: 'msg-102-1',
      threadId: 'th-102',
      mailboxId: 'mbx-primary',
      folderId: 'fld-inbox',
      from: { name: 'DevOps Engineering', email: 'devops@eazzio.com' },
      to: [{ name: 'Alex Rivers', email: 'alex@eazzio.com' }],
      subject: 'Valkey Cache & OpenSearch Cluster Scale Out',
      snippet: 'Cluster nodes have been scaled horizontally...',
      bodyText: `Team,\n\nWe have expanded the search and caching infrastructure across all nodes.\n- Valkey latency: <1ms p99\n- OpenSearch query index: 320ms p95\n\nAll systems operational.`,
      bodyHtml: '<p>All systems operational.</p>',
      receivedAt: 'Aug 20, 04:30 PM',
      isRead: true,
      isStarred: true,
      security: {
        spf: 'pass',
        dkim: 'pass',
        dmarc: 'pass',
        clamavStatus: 'clean',
        spamScore: 0.0,
      },
      attachments: [],
    },
  ],
  'th-103': [
    {
      id: 'msg-103-1',
      threadId: 'th-103',
      mailboxId: 'mbx-primary',
      folderId: 'fld-inbox',
      from: { name: 'Identity Team', email: 'auth@eazzio.com' },
      to: [{ name: 'Alex Rivers', email: 'alex@eazzio.com' }],
      subject: 'Argon2id Identity & Better Auth Migration',
      snippet: 'The authentication service now uses modern Argon2id...',
      bodyText: `Hello Alex,\n\nThe new password hashing engine with memory-hard Argon2id parameters (64MB memory, 3 iterations) is now live in production.`,
      bodyHtml: '<p>Argon2id is live.</p>',
      receivedAt: 'Aug 19, 02:15 PM',
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
    },
  ],
};

export default function MailDashboardPage() {
  const [activeFolderId, setActiveFolderId] = useState('fld-inbox');
  const [activeLabelId, setActiveLabelId] = useState<string | undefined>();
  const [threads, setThreads] = useState<ThreadSummary[]>(initialThreads);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>('th-101');
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

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
          to: [{ name: 'You', email: 'user@eazzio.com' }],
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

        mockConversationMap[newThreadId] = [newMsg];
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
    // Mark thread as read when clicked
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
    const activeMessages = mockConversationMap[threadId] || [];
    const newMsg: MessageDetail = {
      id: `msg-${Date.now()}`,
      threadId,
      mailboxId: 'mbx-primary',
      folderId: activeFolderId,
      from: { name: 'You', email: 'user@eazzio.com' },
      to: [{ name: 'Sender', email: 'sender@eazzio.com' }],
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

    mockConversationMap[threadId] = [...activeMessages, newMsg];
    // Update thread message count & snippet
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              messageCount: t.messageCount + 1,
              snippet: `You: ${replyText.slice(0, 60)}...`,
              lastMessageAt: 'Just now',
            }
          : t
      )
    );
  };

  const selectedThread = threads.find((t) => t.id === selectedThreadId);
  const currentMessages = selectedThreadId ? mockConversationMap[selectedThreadId] || [] : [];

  const handleSendComposeEmail = async (payload: ComposeEmailPayload) => {
    const newThreadId = `th-${Date.now()}`;
    const newThread: ThreadSummary = {
      id: newThreadId,
      mailboxId: 'mbx-primary',
      subject: payload.subject,
      snippet: payload.body.slice(0, 80) || '(No Body)',
      sender: { name: 'You', email: 'user@eazzio.com' },
      lastMessageAt: 'Just now',
      messageCount: 1,
      isUnread: false,
      isStarred: false,
      hasAttachments: (payload.attachments && payload.attachments.length > 0) || false,
      labels: ['Sent'],
    };

    const newMsg: MessageDetail = {
      id: `msg-${Date.now()}`,
      threadId: newThreadId,
      mailboxId: 'mbx-primary',
      folderId: 'fld-sent',
      from: { name: 'You', email: 'user@eazzio.com' },
      to: payload.to.map((addr) => ({ name: addr.split('@')[0] || 'Recipient', email: addr })),
      cc: payload.cc?.map((addr) => ({ name: addr.split('@')[0] || 'Recipient', email: addr })),
      bcc: payload.bcc?.map((addr) => ({ name: addr.split('@')[0] || 'Recipient', email: addr })),
      subject: payload.subject,
      snippet: payload.body.slice(0, 80),
      bodyText: payload.body,
      bodyHtml: `<p>${payload.body}</p>`,
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
      attachments:
        payload.attachments?.map((att) => ({
          id: att.id,
          filename: att.name,
          contentType: 'application/octet-stream',
          sizeBytes: att.sizeBytes,
          antivirusStatus: 'clean',
        })) || [],
    };

    mockConversationMap[newThreadId] = [newMsg];
    setThreads((prev) => [newThread, ...prev]);
    setSelectedThreadId(newThreadId);
  };

  return (
    <DashboardLayout
      activeFolderId={activeFolderId}
      activeLabelId={activeLabelId}
      onSelectFolder={(id) => {
        setActiveFolderId(id);
        setSelectedThreadId(null);
      }}
      onSelectLabel={(id) => {
        setActiveLabelId(id);
        setSelectedThreadId(null);
      }}
      onOpenCompose={() => setIsComposeOpen(true)}
      onSearch={(q) => setSearchQuery(q)}
      availableThreads={threads}
    >
      <div className="h-full flex flex-col md:flex-row overflow-hidden relative" data-testid="mail-split-pane">
        {/* Left Column: Thread List */}
        <div className="w-full md:w-5/12 lg:w-4/12 h-full flex flex-col min-w-0">
          {/* Active Search Result Notification Banner */}
          {searchQuery && (
            <div className="px-4 py-2 bg-[#16181D] border-b border-[#2A2E37] flex items-center justify-between text-xs text-slate-300 animate-in fade-in" data-testid="search-results-banner">
              <div className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-[#2D5BFF] shrink-0" />
                <span className="truncate">
                  Results for <strong className="text-white">"{searchQuery}"</strong> ({displayedThreads.length})
                </span>
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 rounded hover:bg-[#2A2E37] text-slate-400 hover:text-white shrink-0"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <ThreadList
            threads={displayedThreads}
            selectedThreadId={selectedThreadId}
            onSelectThread={handleSelectThread}
            onToggleStar={handleToggleStar}
            onBulkDelete={handleBulkDelete}
            onBulkArchive={handleBulkArchive}
            onBulkMarkRead={handleBulkMarkRead}
            onRefresh={() => setThreads([...initialThreads])}
            folderName={searchQuery ? 'Search Results' : activeFolderId.replace('fld-', '')}
            totalThreadsCount={displayedThreads.length}
          />
        </div>

        {/* Right Column: Conversation Viewer or Empty Placeholder */}
        <div className="flex-1 h-full bg-[#0F1115] overflow-hidden flex flex-col min-w-0">
          {selectedThread && currentMessages.length > 0 ? (
            <ConversationViewer
              threadId={selectedThread.id}
              subject={selectedThread.subject}
              messages={currentMessages}
              onArchive={(id) => handleBulkArchive([id])}
              onDelete={(id) => handleBulkDelete([id])}
              onToggleStar={(id) => handleToggleStar(id)}
              onSendReply={handleSendReply}
              onClose={() => setSelectedThreadId(null)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center" data-testid="no-thread-selected">
              <div className="w-16 h-16 rounded-2xl bg-[#16181D] border border-[#2A2E37] flex items-center justify-center text-slate-500 mb-4 shadow-xl">
                <Mail className="w-8 h-8 text-[#2D5BFF]" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">Select a conversation</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Choose an email thread from the list on the left to view messages, attachments, and quick replies.
              </p>
            </div>
          )}
        </div>

        {/* Docked Mail Composer */}
        <MailComposer
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          onSend={handleSendComposeEmail}
        />

        {/* Realtime Toast Notifications */}
        <ToastContainer
          toasts={toasts}
          onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
          onClickToast={(threadId) => handleSelectThread(threadId)}
        />
      </div>
    </DashboardLayout>
  );
}
