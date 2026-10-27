import React from 'react';
import {
  Inbox,
  Star,
  Clock,
  Send,
  FileText,
  Archive,
  AlertOctagon,
  Trash2,
  Search,
  Mail,
  FolderMinus,
  Sparkles,
} from 'lucide-react';

export interface EmptyStateProps {
  type?:
    | 'inbox'
    | 'starred'
    | 'snoozed'
    | 'sent'
    | 'drafts'
    | 'archive'
    | 'spam'
    | 'trash'
    | 'search'
    | 'conversation'
    | 'custom';
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'inbox',
  title,
  description,
  action,
  className = '',
}) => {
  const getIcon = () => {
    switch (type) {
      case 'inbox':
        return <Inbox className="w-8 h-8 text-[#14B8A6]" />;
      case 'starred':
        return <Star className="w-8 h-8 text-amber-400" />;
      case 'snoozed':
        return <Clock className="w-8 h-8 text-[#14B8A6]" />;
      case 'sent':
        return <Send className="w-8 h-8 text-[#14B8A6]" />;
      case 'drafts':
        return <FileText className="w-8 h-8 text-[#64748B]" />;
      case 'archive':
        return <Archive className="w-8 h-8 text-[#64748B]" />;
      case 'spam':
        return <AlertOctagon className="w-8 h-8 text-rose-500" />;
      case 'trash':
        return <Trash2 className="w-8 h-8 text-rose-500" />;
      case 'search':
        return <Search className="w-8 h-8 text-[#64748B]" />;
      case 'conversation':
        return <Mail className="w-8 h-8 text-[#14B8A6]" />;
      default:
        return <FolderMinus className="w-8 h-8 text-[#64748B]" />;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'inbox':
        return 'Your inbox is clear';
      case 'starred':
        return 'No starred messages';
      case 'snoozed':
        return 'No snoozed emails';
      case 'sent':
        return 'No sent emails yet';
      case 'drafts':
        return 'No drafts';
      case 'archive':
        return 'Archive is empty';
      case 'spam':
        return 'Hooray! No spam messages';
      case 'trash':
        return 'Trash is empty';
      case 'search':
        return 'No matching results found';
      case 'conversation':
        return 'Select a message to read';
      default:
        return 'No messages found';
    }
  };

  const getDefaultDescription = () => {
    switch (type) {
      case 'inbox':
        return 'You are all caught up! New incoming emails will appear here.';
      case 'starred':
        return 'Star important conversations to bookmark and find them easily later.';
      case 'snoozed':
        return 'Emails you snooze will temporarily leave your inbox and reappear at your chosen time.';
      case 'sent':
        return 'Messages you compose and send will be archived safely here.';
      case 'drafts':
        return 'Any emails you started composing will be saved here automatically.';
      case 'archive':
        return 'Archived conversations are safely stored away from your main inbox.';
      case 'spam':
        return 'Your automated spam filters and SPF/DKIM verification are keeping unwanted mail away.';
      case 'trash':
        return 'Items in trash will be automatically cleaned after 30 days.';
      case 'search':
        return 'Try checking for typos or using different keywords, filters, or sender names.';
      case 'conversation':
        return 'Choose an email thread from the left column to view its full discussion.';
      default:
        return 'There are currently no items in this view.';
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto my-auto h-full min-h-[300px] animate-in fade-in duration-300 ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-[#F0FDFA] dark:bg-[#14B8A6]/15 border border-[#CCFBF1] dark:border-[#14B8A6]/30 flex items-center justify-center mb-4 shadow-sm">
        {getIcon()}
      </div>

      <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
        {title || getDefaultTitle()}
      </h3>

      <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1.5 leading-relaxed">
        {description || getDefaultDescription()}
      </p>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 px-4 py-2 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
};
