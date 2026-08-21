import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { defaultDb, defaultOpenSearch } from '../../src/config/index.js';
import { TokenService } from '@eazzio/identity';

describe('REST API Service Live Integration Tests (TASK-008)', () => {
  const testSuffix = Date.now().toString();

  const userAId = crypto.randomUUID();
  const userBId = crypto.randomUUID();
  const orgId = crypto.randomUUID();
  const domainId = crypto.randomUUID();
  const mailboxAId = crypto.randomUUID();
  const folderId = crypto.randomUUID();
  const labelId = crypto.randomUUID();
  const threadId = crypto.randomUUID();
  const messageId = crypto.randomUUID();

  let tokenUserA: string;
  let tokenUserB: string;

  beforeAll(async () => {
    tokenUserA = TokenService.generateAccessToken({
      userId: userAId,
      sessionId: crypto.randomUUID(),
      email: `userA_${testSuffix}@eazzio.com`,
    });

    tokenUserB = TokenService.generateAccessToken({
      userId: userBId,
      sessionId: crypto.randomUUID(),
      email: `userB_${testSuffix}@eazzio.com`,
    });

    // 1. Seed Users
    await defaultDb.query(
      `INSERT INTO users (id, email, password_hash, display_name) VALUES 
        ($1, $2, 'hashA', 'User A'),
        ($3, $4, 'hashB', 'User B')`,
      [userAId, `userA_${testSuffix}@eazzio.com`, userBId, `userB_${testSuffix}@eazzio.com`],
    );

    // 2. Seed Organization & Domain
    await defaultDb.query(`INSERT INTO organizations (id, name) VALUES ($1, $2)`, [
      orgId,
      `Org ${testSuffix}`,
    ]);
    await defaultDb.query(
      `INSERT INTO domains (id, organization_id, domain_name, verification_status) VALUES ($1, $2, $3, 'verified')`,
      [domainId, orgId, `api-${testSuffix}.com`],
    );

    // 3. Seed User A Mailbox, Folder, Label, Thread, Message
    await defaultDb.query(
      `INSERT INTO mailboxes (id, owner_user_id, domain_id, address) VALUES ($1, $2, $3, $4)`,
      [mailboxAId, userAId, domainId, `userA@api-${testSuffix}.com`],
    );
    await defaultDb.query(
      `INSERT INTO folders (id, mailbox_id, name, kind) VALUES ($1, $2, 'Inbox', 'inbox')`,
      [folderId, mailboxAId],
    );
    await defaultDb.query(
      `INSERT INTO labels (id, mailbox_id, name, color) VALUES ($1, $2, 'Urgent', '#EF4444')`,
      [labelId, mailboxAId],
    );
    await defaultDb.query(
      `INSERT INTO threads (id, mailbox_id, subject_normalized, last_message_at, message_count) VALUES ($1, $2, 'welcome aboard', now(), 1)`,
      [threadId, mailboxAId],
    );
    await defaultDb.query(
      `INSERT INTO messages (id, mailbox_id, folder_id, thread_id, message_id_header, from_address, subject, snippet, size_bytes, raw_object_key, direction) VALUES 
        ($1, $2, $3, $4, '<msg1@api.com>', 'boss@company.com', 'Welcome Aboard', 'Welcome to the team...', 2048, 'obj1', 'inbound')`,
      [messageId, mailboxAId, folderId, threadId],
    );

    // 4. Index message into OpenSearch
    await defaultOpenSearch.createIndexIfNotExists('messages');
    await defaultOpenSearch.indexDocument('messages', messageId, {
      mailbox_id: mailboxAId,
      folder_id: folderId,
      subject: 'Welcome Aboard',
      snippet: 'Welcome to the team...',
      body: 'We are thrilled to have you join our engineering team.',
      from_address: 'boss@company.com',
    });
  });

  afterAll(async () => {
    await defaultOpenSearch.deleteDocument('messages', messageId);
    await defaultDb.query('DELETE FROM users WHERE id IN ($1, $2)', [userAId, userBId]);
    await defaultDb.query('DELETE FROM organizations WHERE id = $1', [orgId]);
    await defaultOpenSearch.close();
    await defaultDb.close();
  });

  it('should list mailboxes owned by authenticated user', async () => {
    const res = await request(app)
      .get('/v1/mailboxes')
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].id).toBe(mailboxAId);
    expect(res.body.data[0].address).toBe(`userA@api-${testSuffix}.com`);
  });

  it('should list folders for mailbox', async () => {
    const res = await request(app)
      .get(`/v1/mailboxes/${mailboxAId}/folders`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.some((f: { name: string }) => f.name === 'Inbox')).toBe(true);
  });

  it('should query paginated messages from mailbox', async () => {
    const res = await request(app)
      .get(`/v1/mailboxes/${mailboxAId}/messages`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(messageId);
    expect(res.body.data[0].subject).toBe('Welcome Aboard');
  });

  it('should attach a label to a message', async () => {
    const res = await request(app)
      .post(`/v1/mailboxes/${mailboxAId}/messages/${messageId}/labels`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ labelId });

    expect(res.status).toBe(204);
  });

  it('should deny User B access to User A mailbox (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/v1/mailboxes/${mailboxAId}/folders`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should search indexed messages using OpenSearch', async () => {
    const res = await request(app)
      .get(`/v1/search?q=engineering&mailboxId=${mailboxAId}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(messageId);
    expect(res.body.data[0].subject).toBe('Welcome Aboard');
  });

  it('should provide autocomplete suggestions', async () => {
    const res = await request(app)
      .get(`/v1/search/autocomplete?prefix=Wel&mailboxId=${mailboxAId}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('should compose and enqueue outbound email via POST /v1/messages/compose', async () => {
    const res = await request(app)
      .post('/v1/messages/compose')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        mailboxId: mailboxAId,
        to: ['recipient@external-domain.com'],
        subject: 'Real Outbound Dispatch Test',
        bodyText: 'Hello from Eazzio Mail outbound pipeline!',
      });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.messageId).toBeDefined();
    expect(res.body.queueIds).toBeInstanceOf(Array);
    expect(res.body.queueIds.length).toBe(1);
    expect(['queued', 'delivered', 'retrying', 'bounced']).toContain(res.body.deliveryState);
  });

  it('should reject invalid recipient email format on compose', async () => {
    const res = await request(app)
      .post('/v1/messages/compose')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        mailboxId: mailboxAId,
        to: ['invalid-format'],
        subject: 'Invalid Email Test',
        bodyText: 'Should fail validation',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
