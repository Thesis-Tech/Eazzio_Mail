import {
  Folder,
  Mailbox,
  Message,
  MailboxRepository,
  FolderRepository,
  MessageRepository,
  LabelRepository,
} from '@eazzio/domain';
import { AppError } from '../middleware/error-handler.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface MessageFilterOptions {
  folderId?: string;
  labelId?: string;
  limit?: number;
  cursor?: string;
}

export class MailboxService {
  constructor(
    private readonly mailboxRepo?: MailboxRepository,
    private readonly folderRepo?: FolderRepository,
    private readonly messageRepo?: MessageRepository,
    private readonly labelRepo?: LabelRepository,
  ) {}

  public static getSystemFolders(mailboxId: string): Folder[] {
    const kinds: Array<'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'archive'> = [
      'inbox',
      'sent',
      'drafts',
      'spam',
      'trash',
      'archive',
    ];
    return kinds.map(
      (kind) =>
        new Folder({
          id: `fld-${kind}-${mailboxId}`,
          mailboxId,
          name: kind.charAt(0).toUpperCase() + kind.slice(1),
          kind,
        }),
    );
  }

  public static verifyOwnership(mailboxOwnerId: string, currentUserId: string): void {
    if (mailboxOwnerId !== currentUserId) {
      throw new AppError('FORBIDDEN', 'Access denied to this mailbox', 403);
    }
  }

  public async getMailboxesForUser(userId: string): Promise<Mailbox[]> {
    if (!this.mailboxRepo) {
      return [];
    }
    return this.mailboxRepo.findByOwnerId(userId);
  }

  public async getFolders(mailboxId: string, userId: string): Promise<Folder[]> {
    if (this.mailboxRepo) {
      const mailbox = await this.mailboxRepo.findById(mailboxId);
      if (mailbox) {
        MailboxService.verifyOwnership(mailbox.ownerUserId, userId);
      } else if (UUID_REGEX.test(mailboxId)) {
        throw new AppError('NOT_FOUND', 'Mailbox not found', 404);
      }
    }

    if (!this.folderRepo) {
      return MailboxService.getSystemFolders(mailboxId);
    }

    const folders = await this.folderRepo.findByMailboxId(mailboxId);
    if (folders.length === 0) {
      return MailboxService.getSystemFolders(mailboxId);
    }
    return folders;
  }

  public async getMessages(
    mailboxId: string,
    userId: string,
    options: MessageFilterOptions,
  ): Promise<{ data: Message[]; nextCursor?: string | null }> {
    if (this.mailboxRepo) {
      const mailbox = await this.mailboxRepo.findById(mailboxId);
      if (mailbox) {
        MailboxService.verifyOwnership(mailbox.ownerUserId, userId);
      } else if (UUID_REGEX.test(mailboxId)) {
        throw new AppError('NOT_FOUND', 'Mailbox not found', 404);
      }
    }

    if (!this.messageRepo) {
      return { data: [], nextCursor: null };
    }

    const limit = Math.min(options.limit ?? 50, 100);
    const messages = await this.messageRepo.findByMailboxId(
      mailboxId,
      options.folderId,
      limit,
      options.cursor,
    );

    const nextCursor =
      messages.length === limit && messages.length > 0
        ? messages[messages.length - 1]!.receivedAt.toISOString()
        : null;

    return { data: messages, nextCursor };
  }

  public async addLabelToMessage(
    mailboxId: string,
    messageId: string,
    labelId: string,
    userId: string,
  ): Promise<void> {
    if (this.mailboxRepo) {
      const mailbox = await this.mailboxRepo.findById(mailboxId);
      if (mailbox) {
        MailboxService.verifyOwnership(mailbox.ownerUserId, userId);
      } else if (UUID_REGEX.test(mailboxId)) {
        throw new AppError('NOT_FOUND', 'Mailbox not found', 404);
      }
    }

    if (this.labelRepo) {
      const label = await this.labelRepo.findById(labelId);
      if (!label || label.mailboxId !== mailboxId) {
        throw new AppError('NOT_FOUND', 'Label not found in mailbox', 404);
      }
    }

    if (this.messageRepo) {
      const message = await this.messageRepo.findById(messageId);
      if (!message || message.mailboxId !== mailboxId) {
        throw new AppError('NOT_FOUND', 'Message not found in mailbox', 404);
      }
      await this.messageRepo.setLabels(messageId, [labelId]);
    }
  }

  public static assignThread(
    message: {
      subject?: string | null;
      inReplyTo?: string | null;
      referencesHeader?: string | null;
    },
    existingThreads: Array<{ id: string; subjectNormalized: string }>,
  ): string {
    const normalizedSubject = (message.subject || '')
      .replace(/^(Re|Fwd|Fw):\s*/i, '')
      .trim()
      .toLowerCase();

    const match = existingThreads.find((t) => t.subjectNormalized === normalizedSubject);
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
