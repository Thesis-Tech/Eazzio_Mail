import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  PostgresAdapter,
  PostgresUserRepository,
  PostgresOrganizationRepository,
  PostgresDomainRepository,
  PostgresMailboxRepository,
  PostgresFolderRepository,
  PostgresLabelRepository,
  PostgresThreadRepository,
  PostgresMessageRepository,
} from '../src/index.js';
import {
  User,
  Organization,
  Domain,
  Mailbox,
  Folder,
  Label,
  Thread,
  Message,
} from '@eazzio/domain';

describe('PostgreSQL Concrete Domain Repositories Integration Tests (TASK-004)', () => {
  const dbUrl =
    process.env.DATABASE_URL ||
    'postgresql://eazzio_user:eazzio_password@localhost:5432/eazzio_mail';
  let db: PostgresAdapter;

  let userRepo: PostgresUserRepository;
  let orgRepo: PostgresOrganizationRepository;
  let domainRepo: PostgresDomainRepository;
  let mailboxRepo: PostgresMailboxRepository;
  let folderRepo: PostgresFolderRepository;
  let labelRepo: PostgresLabelRepository;
  let threadRepo: PostgresThreadRepository;
  let messageRepo: PostgresMessageRepository;

  const testSuffix = Date.now().toString();

  const userId = crypto.randomUUID();
  const orgId = crypto.randomUUID();
  const domainId = crypto.randomUUID();
  const mailboxId = crypto.randomUUID();
  const folderInboxId = crypto.randomUUID();
  const folderArchiveId = crypto.randomUUID();
  const labelId = crypto.randomUUID();
  const threadId = crypto.randomUUID();
  const messageId = crypto.randomUUID();

  beforeAll(async () => {
    db = new PostgresAdapter(dbUrl);

    userRepo = new PostgresUserRepository(db);
    orgRepo = new PostgresOrganizationRepository(db);
    domainRepo = new PostgresDomainRepository(db);
    mailboxRepo = new PostgresMailboxRepository(db);
    folderRepo = new PostgresFolderRepository(db);
    labelRepo = new PostgresLabelRepository(db);
    threadRepo = new PostgresThreadRepository(db);
    messageRepo = new PostgresMessageRepository(db);
  });

  afterAll(async () => {
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    await db.query('DELETE FROM organizations WHERE id = $1', [orgId]);
    await db.close();
  });

  describe('1. PostgresUserRepository', () => {
    it('should save, find by ID, find by email, and update user entity', async () => {
      const email = `repo_user_${testSuffix}@eazzio.com`;
      const now = new Date();

      const user = new User({
        id: userId,
        email,
        passwordHash: 'argon2id_hash_123',
        displayName: 'Test Repo User',
        status: 'active',
        mfaEnabled: false,
        createdAt: now,
        updatedAt: now,
      });

      await userRepo.save(user);

      // Find by ID
      const fetchedById = await userRepo.findById(userId);
      expect(fetchedById).not.toBeNull();
      expect(fetchedById?.id).toBe(userId);
      expect(fetchedById?.email).toBe(email);
      expect(fetchedById?.passwordHash).toBe('argon2id_hash_123');
      expect(fetchedById?.displayName).toBe('Test Repo User');
      expect(fetchedById?.status).toBe('active');
      expect(fetchedById?.mfaEnabled).toBe(false);
      expect(fetchedById?.isActive()).toBe(true);

      // Find by Email (case-insensitive)
      const fetchedByEmail = await userRepo.findByEmail(email.toUpperCase());
      expect(fetchedByEmail).not.toBeNull();
      expect(fetchedByEmail?.id).toBe(userId);

      // Update user
      const updatedUser = new User({
        id: userId,
        email,
        passwordHash: 'new_argon2id_hash_456',
        displayName: 'Updated Test User',
        status: 'active',
        mfaEnabled: true,
        createdAt: now,
        updatedAt: new Date(),
      });

      await userRepo.update(updatedUser);

      const refreshed = await userRepo.findById(userId);
      expect(refreshed?.displayName).toBe('Updated Test User');
      expect(refreshed?.mfaEnabled).toBe(true);
      expect(refreshed?.passwordHash).toBe('new_argon2id_hash_456');
    });
  });

  describe('2. PostgresOrganizationRepository', () => {
    it('should save and find organization by ID', async () => {
      const org = new Organization({
        id: orgId,
        name: `Acme Corp ${testSuffix}`,
        policy: { enforceMfa: true, retentionDays: 90 },
        createdAt: new Date(),
      });

      await orgRepo.save(org);

      const fetched = await orgRepo.findById(orgId);
      expect(fetched).not.toBeNull();
      expect(fetched?.id).toBe(orgId);
      expect(fetched?.name).toBe(`Acme Corp ${testSuffix}`);
      expect(fetched?.policy).toEqual({ enforceMfa: true, retentionDays: 90 });
    });
  });

  describe('3. PostgresDomainRepository', () => {
    it('should save, find, and update verification status', async () => {
      const domainName = `repo-domain-${testSuffix}.org`;
      const domain = new Domain({
        id: domainId,
        organizationId: orgId,
        domainName,
        verificationStatus: 'pending',
        mxVerified: false,
        spfVerified: false,
        dkimVerified: false,
        dmarcVerified: false,
        dkimPrivateKeyRef: 'vault://dkim/key-1',
        createdAt: new Date(),
        activatedAt: null,
      });

      await domainRepo.save(domain);

      // Find by ID
      const fetchedById = await domainRepo.findById(domainId);
      expect(fetchedById).not.toBeNull();
      expect(fetchedById?.domainName).toBe(domainName);
      expect(fetchedById?.isFullyVerified()).toBe(false);

      // Find by Name (case-insensitive)
      const fetchedByName = await domainRepo.findByName(domainName.toUpperCase());
      expect(fetchedByName).not.toBeNull();
      expect(fetchedByName?.id).toBe(domainId);

      // Find by Organization ID
      const list = await domainRepo.findByOrganizationId(orgId);
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list.some((d) => d.id === domainId)).toBe(true);

      // Update verification status
      const activatedAt = new Date();
      await domainRepo.updateVerificationStatus(domainId, {
        mxVerified: true,
        spfVerified: true,
        dkimVerified: true,
        dmarcVerified: true,
        verificationStatus: 'verified',
        activatedAt,
      });

      const fullyVerified = await domainRepo.findById(domainId);
      expect(fullyVerified?.verificationStatus).toBe('verified');
      expect(fullyVerified?.isFullyVerified()).toBe(true);
      expect(fullyVerified?.activatedAt).not.toBeNull();
    });
  });

  describe('4. PostgresMailboxRepository', () => {
    it('should save, find, and update quota usage', async () => {
      const address = `mailbox_${testSuffix}@repo-domain-${testSuffix}.org`;
      const mailbox = new Mailbox({
        id: mailboxId,
        ownerUserId: userId,
        domainId,
        address,
        quotaBytes: 10737418240n, // 10GB
        usedBytes: 0n,
        createdAt: new Date(),
      });

      await mailboxRepo.save(mailbox);

      // Find by ID
      const fetchedById = await mailboxRepo.findById(mailboxId);
      expect(fetchedById).not.toBeNull();
      expect(fetchedById?.address).toBe(address);
      expect(fetchedById?.quotaBytes).toBe(10737418240n);
      expect(fetchedById?.usedBytes).toBe(0n);

      // Find by Address
      const fetchedByAddress = await mailboxRepo.findByAddress(address.toUpperCase());
      expect(fetchedByAddress).not.toBeNull();
      expect(fetchedByAddress?.id).toBe(mailboxId);

      // Find by Owner ID
      const mailboxes = await mailboxRepo.findByOwnerId(userId);
      expect(mailboxes.length).toBeGreaterThanOrEqual(1);
      expect(mailboxes.some((m) => m.id === mailboxId)).toBe(true);

      // Update quota usage
      await mailboxRepo.updateQuotaUsage(mailboxId, 52428800n); // 50MB
      const updatedMailbox = await mailboxRepo.findById(mailboxId);
      expect(updatedMailbox?.usedBytes).toBe(52428800n);
    });
  });

  describe('5. PostgresFolderRepository', () => {
    it('should save, find by mailbox, and delete folder', async () => {
      const inbox = new Folder({
        id: folderInboxId,
        mailboxId,
        parentFolderId: null,
        name: 'Inbox',
        kind: 'inbox',
      });
      const archive = new Folder({
        id: folderArchiveId,
        mailboxId,
        parentFolderId: null,
        name: 'Archive',
        kind: 'archive',
      });

      await folderRepo.save(inbox);
      await folderRepo.save(archive);

      const fetched = await folderRepo.findById(folderInboxId);
      expect(fetched).not.toBeNull();
      expect(fetched?.name).toBe('Inbox');
      expect(fetched?.kind).toBe('inbox');

      const folders = await folderRepo.findByMailboxId(mailboxId);
      expect(folders.length).toBe(2);

      await folderRepo.delete(folderArchiveId);
      const remaining = await folderRepo.findByMailboxId(mailboxId);
      expect(remaining.length).toBe(1);
      expect(remaining[0]?.id).toBe(folderInboxId);
    });
  });

  describe('6. PostgresLabelRepository', () => {
    it('should save, find by mailbox, and delete label', async () => {
      const label = new Label({
        id: labelId,
        mailboxId,
        name: 'Important Projects',
        color: '#2D5BFF',
      });

      await labelRepo.save(label);

      const fetched = await labelRepo.findById(labelId);
      expect(fetched).not.toBeNull();
      expect(fetched?.name).toBe('Important Projects');
      expect(fetched?.color).toBe('#2D5BFF');

      const labels = await labelRepo.findByMailboxId(mailboxId);
      expect(labels.length).toBe(1);

      await labelRepo.delete(labelId);
      const remaining = await labelRepo.findByMailboxId(mailboxId);
      expect(remaining.length).toBe(0);
    });
  });

  describe('7. PostgresThreadRepository', () => {
    it('should save, find by normalized subject, and update last message timestamp', async () => {
      const initialDate = new Date('2026-01-01T10:00:00Z');
      const thread = new Thread({
        id: threadId,
        mailboxId,
        subjectNormalized: 'quarterly review 2026',
        lastMessageAt: initialDate,
        messageCount: 1,
      });

      await threadRepo.save(thread);

      const fetchedById = await threadRepo.findById(threadId);
      expect(fetchedById).not.toBeNull();
      expect(fetchedById?.subjectNormalized).toBe('quarterly review 2026');
      expect(fetchedById?.messageCount).toBe(1);

      const fetchedBySubject = await threadRepo.findByNormalizedSubject(
        mailboxId,
        'quarterly review 2026',
      );
      expect(fetchedBySubject).not.toBeNull();
      expect(fetchedBySubject?.id).toBe(threadId);

      const newDate = new Date('2026-01-02T14:30:00Z');
      await threadRepo.updateLastMessage(threadId, newDate, 2);

      const updated = await threadRepo.findById(threadId);
      expect(updated?.messageCount).toBe(2);
      expect(updated?.lastMessageAt.toISOString()).toBe(newDate.toISOString());
    });
  });

  describe('8. PostgresMessageRepository', () => {
    it('should save, query, update folder, labels, flags, and delivery state', async () => {
      const receivedAt = new Date();
      const messageHeader = `<msg-${testSuffix}@external.com>`;

      const message = new Message({
        id: messageId,
        mailboxId,
        folderId: folderInboxId,
        threadId,
        messageIdHeader: messageHeader,
        inReplyTo: null,
        referencesHeader: null,
        fromAddress: 'sender@partner.com',
        subject: 'Quarterly Review Followup',
        snippet: 'Here are the minutes...',
        sizeBytes: 4096,
        rawObjectKey: `raw/${mailboxId}/${messageId}.eml`,
        isRead: false,
        isStarred: false,
        isImportant: false,
        spamScore: 0.1,
        authResults: { spf: 'pass', dkim: 'pass', dmarc: 'pass' },
        direction: 'inbound',
        deliveryState: null,
        receivedAt,
      });

      await messageRepo.save(message);

      // Find by ID
      const fetchedById = await messageRepo.findById(messageId);
      expect(fetchedById).not.toBeNull();
      expect(fetchedById?.subject).toBe('Quarterly Review Followup');
      expect(fetchedById?.fromAddress).toBe('sender@partner.com');
      expect(fetchedById?.isRead).toBe(false);
      expect(fetchedById?.authResults).toEqual({ spf: 'pass', dkim: 'pass', dmarc: 'pass' });

      // Find by Header
      const fetchedByHeader = await messageRepo.findByMessageIdHeader(mailboxId, messageHeader);
      expect(fetchedByHeader).not.toBeNull();
      expect(fetchedByHeader?.id).toBe(messageId);

      // Find by Mailbox
      const list = await messageRepo.findByMailboxId(mailboxId, folderInboxId, 10);
      expect(list.length).toBe(1);
      expect(list[0]?.id).toBe(messageId);

      // Update Flags
      await messageRepo.updateFlags(messageId, {
        isRead: true,
        isStarred: true,
        isImportant: true,
      });
      const flagged = await messageRepo.findById(messageId);
      expect(flagged?.isRead).toBe(true);
      expect(flagged?.isStarred).toBe(true);
      expect(flagged?.isImportant).toBe(true);

      // Update Delivery State
      await messageRepo.updateDeliveryState(messageId, 'delivered');
      const delivered = await messageRepo.findById(messageId);
      expect(delivered?.deliveryState).toBe('delivered');
    });
  });
});
