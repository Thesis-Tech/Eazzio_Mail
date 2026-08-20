import { User } from '../models/user.js';
import { Mailbox } from '../models/mailbox.js';
import { Message } from '../models/message.js';
import { Folder } from '../models/folder.js';
import { Label } from '../models/label.js';
import { Thread } from '../models/thread.js';
import { Domain } from '../models/domain.js';
import { Organization } from '../models/organization.js';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  update(user: User): Promise<void>;
}

export interface MailboxRepository {
  findById(id: string): Promise<Mailbox | null>;
  findByAddress(address: string): Promise<Mailbox | null>;
  findByOwnerId(userId: string): Promise<Mailbox[]>;
  save(mailbox: Mailbox): Promise<void>;
  updateQuotaUsage(mailboxId: string, usedBytes: bigint): Promise<void>;
}

export interface MessageRepository {
  findById(id: string): Promise<Message | null>;
  findByMailboxId(mailboxId: string, folderId?: string, limit?: number, cursor?: string): Promise<Message[]>;
  findByMessageIdHeader(mailboxId: string, messageIdHeader: string): Promise<Message | null>;
  save(message: Message): Promise<void>;
  updateFolder(messageId: string, folderId: string): Promise<void>;
  setLabels(messageId: string, labelIds: string[]): Promise<void>;
  updateFlags(messageId: string, flags: { isRead?: boolean; isStarred?: boolean; isImportant?: boolean }): Promise<void>;
  updateDeliveryState(messageId: string, state: 'queued' | 'sending' | 'delivered' | 'retrying' | 'bounced'): Promise<void>;
}

export interface FolderRepository {
  findById(id: string): Promise<Folder | null>;
  findByMailboxId(mailboxId: string): Promise<Folder[]>;
  save(folder: Folder): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface LabelRepository {
  findById(id: string): Promise<Label | null>;
  findByMailboxId(mailboxId: string): Promise<Label[]>;
  save(label: Label): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ThreadRepository {
  findById(id: string): Promise<Thread | null>;
  findByNormalizedSubject(mailboxId: string, subjectNormalized: string): Promise<Thread | null>;
  save(thread: Thread): Promise<void>;
  updateLastMessage(threadId: string, lastMessageAt: Date, messageCount: number): Promise<void>;
}

export interface DomainRepository {
  findById(id: string): Promise<Domain | null>;
  findByName(domainName: string): Promise<Domain | null>;
  findByOrganizationId(organizationId: string): Promise<Domain[]>;
  save(domain: Domain): Promise<void>;
  updateVerificationStatus(domainId: string, status: {
    mxVerified: boolean;
    spfVerified: boolean;
    dkimVerified: boolean;
    dmarcVerified: boolean;
    verificationStatus: 'pending' | 'partially_verified' | 'verified' | 'failed';
    activatedAt?: Date | null;
  }): Promise<void>;
}

export interface OrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  save(org: Organization): Promise<void>;
}
