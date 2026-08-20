import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  PostgresAdapter,
  PostgresDomainRepository,
  PostgresMailboxRepository,
  PostgresFolderRepository,
  PostgresMessageRepository,
  PostgresThreadRepository,
  MemoryStorageAdapter,
} from '@eazzio/infra-adapters';
import { InboundPipeline } from '../../src/application/inbound-pipeline.js';
import { InboundEnvelope } from '../../src/domain/envelope.js';

describe('Inbound Mail Pipeline Integration Tests (TASK-009)', () => {
  const dbUrl =
    process.env.DATABASE_URL ||
    'postgresql://eazzio_user:eazzio_password@localhost:5432/eazzio_mail';
  let db: PostgresAdapter;

  let domainRepo: PostgresDomainRepository;
  let mailboxRepo: PostgresMailboxRepository;
  let folderRepo: PostgresFolderRepository;
  let messageRepo: PostgresMessageRepository;
  let threadRepo: PostgresThreadRepository;
  let storage: MemoryStorageAdapter;
  let pipeline: InboundPipeline;

  const testSuffix = Date.now().toString();
  const userId = crypto.randomUUID();
  const orgId = crypto.randomUUID();
  const domainId = crypto.randomUUID();
  const mailboxId = crypto.randomUUID();
  const inboxFolderId = crypto.randomUUID();
  const spamFolderId = crypto.randomUUID();

  const domainName = `inbound-${testSuffix}.com`;
  const recipientEmail = `user@${domainName}`;

  beforeAll(async () => {
    db = new PostgresAdapter(dbUrl);
    domainRepo = new PostgresDomainRepository(db);
    mailboxRepo = new PostgresMailboxRepository(db);
    folderRepo = new PostgresFolderRepository(db);
    messageRepo = new PostgresMessageRepository(db);
    threadRepo = new PostgresThreadRepository(db);
    storage = new MemoryStorageAdapter();

    pipeline = new InboundPipeline(
      domainRepo,
      mailboxRepo,
      folderRepo,
      messageRepo,
      threadRepo,
      storage,
    );

    // 1. Seed user, org, verified domain, and mailbox
    await db.query(
      'INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)',
      [userId, `owner_${testSuffix}@eazzio.com`, 'hash', 'Inbound Test User'],
    );

    await db.query('INSERT INTO organizations (id, name) VALUES ($1, $2)', [
      orgId,
      `Org ${testSuffix}`,
    ]);

    await db.query(
      `INSERT INTO domains (id, organization_id, domain_name, verification_status) VALUES ($1, $2, $3, 'verified')`,
      [domainId, orgId, domainName],
    );

    await db.query(
      `INSERT INTO mailboxes (id, owner_user_id, domain_id, address) VALUES ($1, $2, $3, $4)`,
      [mailboxId, userId, domainId, recipientEmail],
    );

    await db.query(
      `INSERT INTO folders (id, mailbox_id, name, kind) VALUES ($1, $2, 'Inbox', 'inbox'), ($3, $4, 'Spam', 'spam')`,
      [inboxFolderId, mailboxId, spamFolderId, mailboxId],
    );
  });

  afterAll(async () => {
    await db.query('DELETE FROM messages WHERE mailbox_id = $1', [mailboxId]);
    await db.query('DELETE FROM threads WHERE mailbox_id = $1', [mailboxId]);
    await db.query('DELETE FROM folders WHERE mailbox_id = $1', [mailboxId]);
    await db.query('DELETE FROM mailboxes WHERE id = $1', [mailboxId]);
    await db.query('DELETE FROM domains WHERE id = $1', [domainId]);
    await db.query('DELETE FROM organizations WHERE id = $1', [orgId]);
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    await db.close();
  });

  it('should process clean multipart email, store raw MIME, and persist message record', async () => {
    const rawMime = Buffer.from(
      `From: external@partner.com\r\n` +
        `To: ${recipientEmail}\r\n` +
        `Subject: Q3 Partnership Update\r\n` +
        `Message-ID: <msg-part-${testSuffix}@partner.com>\r\n` +
        `Content-Type: text/plain; charset=utf-8\r\n\r\n` +
        `Hello team, here is the quarterly update...`,
      'utf-8',
    );

    const envelope = new InboundEnvelope({
      envelopeFrom: 'external@partner.com',
      envelopeTo: [recipientEmail],
      clientIp: '198.51.100.1',
      sizeBytes: rawMime.length,
    });

    const result = await pipeline.process({
      envelope,
      rawMime,
      authResults: {
        spf: 'pass',
        dkim: 'pass',
        dmarc: 'pass',
        fromDomain: 'partner.com',
      },
    });

    expect(result.status).toBe('ACCEPTED');
    if (result.status === 'ACCEPTED') {
      expect(result.event.fromAddress).toBe('external@partner.com');
      expect(result.event.mailboxId).toBe(mailboxId);

      // Verify raw MIME saved in storage
      const storedMime = await storage.get(
        `mailboxes/${mailboxId}/messages/${result.messageId}/raw.eml`,
      );
      expect(storedMime).toBeDefined();
      expect(storedMime.toString('utf-8')).toContain('Q3 Partnership Update');

      // Verify message saved in PostgreSQL
      const dbMsg = await messageRepo.findById(result.messageId);
      expect(dbMsg).not.toBeNull();
      expect(dbMsg?.subject).toBe('Q3 Partnership Update');
      expect(dbMsg?.mailboxId).toBe(mailboxId);
      expect(dbMsg?.folderId).toBe(inboxFolderId);
    }
  });

  it('should handle duplicate delivery idempotently without creating duplicate records', async () => {
    const rawMime = Buffer.from(
      `From: external@partner.com\r\n` +
        `To: ${recipientEmail}\r\n` +
        `Subject: Duplicate Check\r\n` +
        `Message-ID: <msg-idempotent-${testSuffix}@partner.com>\r\n\r\n` +
        `Duplicate delivery body...`,
      'utf-8',
    );

    const envelope = new InboundEnvelope({
      envelopeFrom: 'external@partner.com',
      envelopeTo: [recipientEmail],
      clientIp: '198.51.100.1',
      sizeBytes: rawMime.length,
    });

    // 1st delivery
    const res1 = await pipeline.process({
      envelope,
      rawMime,
      authResults: { spf: 'pass', dkim: 'pass', dmarc: 'pass', fromDomain: 'partner.com' },
    });
    expect(res1.status).toBe('ACCEPTED');

    // 2nd duplicate delivery
    const res2 = await pipeline.process({
      envelope,
      rawMime,
      authResults: { spf: 'pass', dkim: 'pass', dmarc: 'pass', fromDomain: 'partner.com' },
    });
    expect(res2.status).toBe('ACCEPTED');
    if (res1.status === 'ACCEPTED' && res2.status === 'ACCEPTED') {
      expect(res2.messageId).toBe(res1.messageId);
      expect(res2.duplicate).toBe(true);
    }
  });

  it('should quarantine message when spam score is elevated and route to spam folder', async () => {
    const rawMime = Buffer.from(
      `From: promo@offers.com\r\n` +
        `To: ${recipientEmail}\r\n` +
        `Subject: Win Free Vacation Now\r\n` +
        `Message-ID: <msg-spam-${testSuffix}@offers.com>\r\n\r\n` +
        `Claim your prize today...`,
      'utf-8',
    );

    const envelope = new InboundEnvelope({
      envelopeFrom: 'promo@offers.com',
      envelopeTo: [recipientEmail],
      clientIp: '203.0.113.50',
      sizeBytes: rawMime.length,
    });

    const result = await pipeline.process({
      envelope,
      rawMime,
      authResults: { spf: 'neutral', dkim: 'none', dmarc: 'none', fromDomain: 'offers.com' },
      spamRuleResult: { score: 0.65, matchedRules: ['PROMO_LOTTERY'] },
    });

    expect(result.status).toBe('QUARANTINED');
    if (result.status === 'QUARANTINED') {
      expect(result.event.mailboxId).toBe(mailboxId);

      // Verify routed to spam folder in DB
      const dbMsg = await messageRepo.findById(result.messageId);
      expect(dbMsg?.folderId).toBe(spamFolderId);
    }
  });

  it('should reject email to unknown recipient or unverified domain', async () => {
    const envelope = new InboundEnvelope({
      envelopeFrom: 'sender@example.com',
      envelopeTo: ['nonexistent@unknown-domain.xyz'],
      clientIp: '1.2.3.4',
      sizeBytes: 512,
    });

    const rawMime = Buffer.from('Subject: Hello\r\n\r\nTest', 'utf-8');

    const result = await pipeline.process({
      envelope,
      rawMime,
      authResults: { spf: 'pass', dkim: 'pass', dmarc: 'pass', fromDomain: 'example.com' },
    });

    expect(result.status).toBe('REJECTED');
    if (result.status === 'REJECTED') {
      expect(result.event.reasonCode).toBe('INVALID_RECIPIENT');
    }
  });

  it('should reject malware payloads matching EICAR test signature', async () => {
    const eicarMime = Buffer.from(
      `From: attacker@evil.com\r\n` +
        `To: ${recipientEmail}\r\n` +
        `Subject: Malware Attachment\r\n` +
        `Message-ID: <msg-malware-${testSuffix}@evil.com>\r\n\r\n` +
        `X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*`,
      'utf-8',
    );

    const envelope = new InboundEnvelope({
      envelopeFrom: 'attacker@evil.com',
      envelopeTo: [recipientEmail],
      clientIp: '1.2.3.4',
      sizeBytes: eicarMime.length,
    });

    const result = await pipeline.process({
      envelope,
      rawMime: eicarMime,
      authResults: { spf: 'pass', dkim: 'pass', dmarc: 'pass', fromDomain: 'evil.com' },
      avResult: { status: 'infected', virusName: 'Eicar-Test-Signature' },
    });

    expect(result.status).toBe('REJECTED');
    if (result.status === 'REJECTED') {
      expect(result.event.reasonCode).toBe('MALWARE_DETECTED');
    }
  });
});
