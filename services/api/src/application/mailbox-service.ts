import { Folder } from '@eazzio/domain';
import { AppError } from '../middleware/error-handler.js';

export interface MessageFilterOptions {
  folderId?: string;
  labelId?: string;
  limit?: number;
  cursor?: string;
}

export class MailboxService {
  public static getSystemFolders(mailboxId: string): Folder[] {
    const kinds: Array<'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'archive'> = [
      'inbox', 'sent', 'drafts', 'spam', 'trash', 'archive'
    ];
    return kinds.map(kind => new Folder({
      id: `fld-${kind}-${mailboxId}`,
      mailboxId,
      name: kind.charAt(0).toUpperCase() + kind.slice(1),
      kind
    }));
  }

  public static verifyOwnership(mailboxOwnerId: string, currentUserId: string): void {
    if (mailboxOwnerId !== currentUserId) {
      throw new AppError('FORBIDDEN', 'Access denied to this mailbox', 403);
    }
  }

  public static assignThread(
    message: { subject?: string | null; inReplyTo?: string | null; referencesHeader?: string | null },
    existingThreads: Array<{ id: string; subjectNormalized: string }>
  ): string {
    const normalizedSubject = (message.subject || '')
      .replace(/^(Re|Fwd|Fw):\s*/i, '')
      .trim()
      .toLowerCase();

    const match = existingThreads.find(t => t.subjectNormalized === normalizedSubject);
    if (match) {
      return match.id;
    }

    return crypto.randomUUID();
  }

  public static applyLabels(currentLabelIds: string[], newLabelId: string): string[] {
    const set = new Set(currentLabelIds);
    set.add(newLabelId);
    return Array.from(set);
  }
}
