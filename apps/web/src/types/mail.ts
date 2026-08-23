export interface FolderItem {
  id: string;
  name: string;
  slug: 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'archive' | string;
  type: 'system' | 'custom';
  icon?: string;
  unreadCount: number;
  totalCount: number;
}

export interface LabelItem {
  id: string;
  name: string;
  color: string;
}

export interface ThreadSummary {
  id: string;
  mailboxId: string;
  subject: string;
  snippet: string;
  sender: {
    name: string;
    email: string;
  };
  lastMessageAt: string;
  messageCount: number;
  isUnread: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  labels: string[];
}

export interface MessageDetail {
  id: string;
  threadId: string;
  mailboxId: string;
  folderId: string;
  from: { name: string; email: string };
  to: Array<{ name: string; email: string }>;
  cc?: Array<{ name: string; email: string }>;
  bcc?: Array<{ name: string; email: string }>;
  subject: string;
  snippet: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  security: {
    spf: 'pass' | 'fail' | 'softfail' | 'none';
    dkim: 'pass' | 'fail' | 'none';
    dmarc: 'pass' | 'fail' | 'none';
    clamavStatus: 'clean' | 'infected';
    spamScore: number;
  };
  listUnsubscribe?: string | null;
  listId?: string | null;
  attachments: Array<{
    id: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    antivirusStatus: 'clean' | 'infected';
  }>;
}

export interface FilterRule {
  id: string;
  name: string;
  field: 'from' | 'to' | 'subject' | 'body';
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with';
  value: string;
  action: 'apply_label' | 'move_to_folder' | 'mark_as_read' | 'star';
  actionValue?: string;
  isEnabled: boolean;
}

export interface UserPreferences {
  defaultMailbox: string;
  signature: string;
  autoSummarizeWithAI: boolean;
  soundNotifications: boolean;
  theme: 'dark' | 'light' | 'system';
}
