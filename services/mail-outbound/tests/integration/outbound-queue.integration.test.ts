import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import {
  PostgresAdapter,
  PostgresMessageRepository,
  MemoryStorageAdapter,
  EazzioEmailTransport,
} from '@eazzio/infra-adapters';
import { PostgresOutboundQueueRepository } from '../../src/repositories/outbound-queue-repository.js';
import { OutboundService } from '../../src/application/outbound-service.js';
import { QueueRunner } from '../../src/application/queue-runner.js';

describe('Outbound Mail Queue & Delivery Runner Integration Tests (TASK-010)', () => {
  const dbUrl =
    process.env.DATABASE_URL ||
    'postgresql://eazzio_user:eazzio_password@localhost:5432/eazzio_mail';
  let db: PostgresAdapter;

  let messageRepo: PostgresMessageRepository;
  let queueRepo: PostgresOutboundQueueRepository;
  let storage: MemoryStorageAdapter;
  let outboundService: OutboundService;

  const testSuffix = Date.now().toString();
  const userId = crypto.randomUUID();
  const orgId = crypto.randomUUID();
  const domainId = crypto.randomUUID();
  const mailboxId = crypto.randomUUID();
  const folderId = crypto.randomUUID();

  // Test RSA keypair
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  beforeAll(async () => {
    db = new PostgresAdapter(dbUrl);
    messageRepo = new PostgresMessageRepository(db);
    queueRepo = new PostgresOutboundQueueRepository(db);
    storage = new MemoryStorageAdapter();

    outboundService = new OutboundService(queueRepo, messageRepo, storage);

    // 1. Seed database hierarchy
    await db.query(
      'INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)',
      [userId, `outbound_user_${testSuffix}@eazzio.com`, 'hash', 'Outbound Test User'],
    );

    await db.query('INSERT INTO organizations (id, name) VALUES ($1, $2)', [
      orgId,
      `Org ${testSuffix}`,
    ]);

    await db.query(
      `INSERT INTO domains (id, organization_id, domain_name, verification_status) VALUES ($1, $2, $3, 'verified')`,
      [domainId, orgId, `outbound-${testSuffix}.com`],
    );

    await db.query(
      `INSERT INTO mailboxes (id, owner_user_id, domain_id, address) VALUES ($1, $2, $3, $4)`,
      [mailboxId, userId, domainId, `sender@outbound-${testSuffix}.com`],
    );

    await db.query(
      `INSERT INTO folders (id, mailbox_id, name, kind) VALUES ($1, $2, 'Sent', 'sent')`,
      [folderId, mailboxId],
    );
  });

  afterAll(async () => {
    await db.query('DELETE FROM outbound_queue WHERE recipient_address LIKE $1', [
      `%@recipient-${testSuffix}.com`,
    ]);
    await db.query('DELETE FROM messages WHERE mailbox_id = $1', [mailboxId]);
    await db.query('DELETE FROM folders WHERE mailbox_id = $1', [mailboxId]);
    await db.query('DELETE FROM mailboxes WHERE id = $1', [mailboxId]);
    await db.query('DELETE FROM domains WHERE id = $1', [domainId]);
    await db.query('DELETE FROM organizations WHERE id = $1', [orgId]);
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    await db.close();
  });

  it('should enqueue DKIM-signed outbound message and process successfully through queue runner', async () => {
    const recipient = `recipient1@recipient-${testSuffix}.com`;

    // 1. Enqueue outbound message
    const { messageId, queueIds } = await outboundService.enqueueOutbound({
      fromAddress: `sender@outbound-${testSuffix}.com`,
      to: [recipient],
      subject: 'Quarterly Proposal',
      bodyHtml: '<p>Please find our proposal attached.</p>',
      domainName: `outbound-${testSuffix}.com`,
      dkimSelector: 'default',
      dkimPrivateKeyPem: privateKey,
      idempotencyKey: `idemp-success-${testSuffix}`,
      mailboxId,
      folderId,
    });

    expect(queueIds.length).toBe(1);
    const queueId = queueIds[0]!;

    // 2. Setup mock successful transport
    const mockTransport: EazzioEmailTransport = {
      submitOutbound: async (rawMime, _from, _to) => {
        expect(rawMime.toString('utf-8')).toContain('DKIM-Signature:');
        return { queueId: 'smtp-queue-1' };
      },
      getDeliveryStatus: async () => ({ state: 'delivered' }),
    };

    const queueRunner = new QueueRunner(queueRepo, messageRepo, storage, mockTransport);

    // 3. Process batch
    const result = await queueRunner.processNextBatch();
    expect(result.processed).toBeGreaterThanOrEqual(1);
    expect(result.delivered).toBe(1);
    expect(result.events.length).toBe(1);
    expect(result.events[0]?.recipientAddress).toBe(recipient);

    // 4. Verify updated queue item state in PostgreSQL
    const item = await queueRepo.findById(queueId);
    expect(item?.state).toBe('delivered');
    expect(item?.attemptCount).toBe(1);
  });

  it('should handle transient delivery failures by scheduling exponential retry backoff', async () => {
    const recipient = `transient@recipient-${testSuffix}.com`;

    const { queueIds } = await outboundService.enqueueOutbound({
      fromAddress: `sender@outbound-${testSuffix}.com`,
      to: [recipient],
      subject: 'Retry Test',
      bodyText: 'Testing retry backoff',
      domainName: `outbound-${testSuffix}.com`,
      dkimSelector: 'default',
      dkimPrivateKeyPem: privateKey,
      idempotencyKey: `idemp-transient-${testSuffix}`,
      mailboxId,
      folderId,
    });

    const queueId = queueIds[0]!;

    // Mock failing transport with transient 421 error
    const failingTransport: EazzioEmailTransport = {
      submitOutbound: async () => {
        throw new Error('421 4.4.2 Connection timed out');
      },
      getDeliveryStatus: async () => ({ state: 'failed' }),
    };

    const queueRunner = new QueueRunner(queueRepo, messageRepo, storage, failingTransport);

    const result = await queueRunner.processNextBatch();
    expect(result.retried).toBe(1);

    // Verify retry state and backoff timestamp in PostgreSQL
    const item = await queueRepo.findById(queueId);
    expect(item?.state).toBe('retrying');
    expect(item?.attemptCount).toBe(1);
    expect(item?.lastError).toContain('421');
    expect(item?.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  });
});
