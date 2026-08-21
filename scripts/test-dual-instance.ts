import {
  PostgresAdapter,
  PostgresDomainRepository,
  PostgresMailboxRepository,
  PostgresFolderRepository,
  PostgresMessageRepository,
  PostgresThreadRepository,
  MemoryStorageAdapter,
  DirectMtaEmailTransport,
} from '../packages/infra-adapters/src/index.js';
import { InboundPipeline, InboundEnvelope } from '../services/mail-inbound/src/index.js';
import { createLmtpServer } from '../services/mail-inbound/src/server.js';
import { QueueRunner } from '../services/mail-outbound/src/application/queue-runner.js';
import { PostgresOutboundQueueRepository } from '../services/mail-outbound/src/repositories/outbound-queue-repository.js';
import { DkimSigner } from '../services/mail-outbound/src/domain/dkim-signer.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_URL_A = process.env.DATABASE_URL_A || 'postgresql://eazzio_user:eazzio_password@localhost:5433/eazzio_mail_a';
const DB_URL_B = process.env.DATABASE_URL_B || 'postgresql://eazzio_user:eazzio_password@localhost:5434/eazzio_mail_b';

const dbA = new PostgresAdapter(DB_URL_A);
const dbB = new PostgresAdapter(DB_URL_B);

const storageA = new MemoryStorageAdapter();
const storageB = new MemoryStorageAdapter();

async function runSchema(db: PostgresAdapter, dbName: string) {
  await db.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  const schemaPath = path.resolve('packages/infra-adapters/src/database/migrations/001_initial_schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  await db.query(sql);
  console.log(`✅ Fresh schema applied to ${dbName}`);
}

async function provisionInstance(params: {
  db: PostgresAdapter;
  instanceName: string;
  orgId: string;
  orgName: string;
  domainId: string;
  domainName: string;
  userId: string;
  userEmail: string;
  mailboxId: string;
}) {
  const { db, instanceName, orgId, orgName, domainId, domainName, userId, userEmail, mailboxId } = params;

  // 1. Org
  await db.query(
    `INSERT INTO organizations (id, name, policy) VALUES ($1, $2, '{}') ON CONFLICT (id) DO NOTHING`,
    [orgId, orgName]
  );

  // 2. User
  await db.query(
    `INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, 'hash_test', $3) ON CONFLICT (email) DO NOTHING`,
    [userId, userEmail, instanceName]
  );

  // 3. Domain
  await db.query(
    `INSERT INTO domains (id, organization_id, domain_name, verification_status, mx_verified, spf_verified, dkim_verified, dmarc_verified)
     VALUES ($1, $2, $3, 'verified', true, true, true, true) ON CONFLICT (domain_name) DO NOTHING`,
    [domainId, orgId, domainName]
  );

  // 4. Mailbox
  await db.query(
    `INSERT INTO mailboxes (id, owner_user_id, domain_id, address, quota_bytes, used_bytes)
     VALUES ($1, $2, $3, $4, 1073741824, 0) ON CONFLICT (address) DO NOTHING`,
    [mailboxId, userId, domainId, userEmail]
  );

  // 5. Folders
  const folders = ['inbox', 'sent', 'drafts', 'starred', 'trash', 'spam', 'archive'];
  for (const kind of folders) {
    await db.query(
      `INSERT INTO folders (id, mailbox_id, name, kind, parent_folder_id)
       VALUES ($1, $2, $3, $4, NULL) ON CONFLICT DO NOTHING`,
      [crypto.randomUUID(), mailboxId, kind.charAt(0).toUpperCase() + kind.slice(1), kind]
    );
  }

  console.log(`✅ Provisioned ${instanceName} with mailbox ${userEmail}`);
}

async function main() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('  EAZZIO MAIL — DUAL ISOLATED INSTANCE INTEGRATION TEST (STEP 2)');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  // STEP 1: Verify PostgreSQL Connectivity & Run Migrations
  console.log('[Step 1] Initializing Isolated PostgreSQL Databases...');
  await runSchema(dbA, 'Instance A (eazzio_mail_a:5433)');
  await runSchema(dbB, 'Instance B (eazzio_mail_b:5434)');

  // STEP 2: Provision Instance A & Instance B
  console.log('\n[Step 2] Provisioning Mailboxes for Instance A & B...');
  const orgAId = crypto.randomUUID();
  const domainAId = crypto.randomUUID();
  const userAId = crypto.randomUUID();
  const mailboxAId = crypto.randomUUID();
  const emailA = 'alice@mail-a.test';

  const orgBId = crypto.randomUUID();
  const domainBId = crypto.randomUUID();
  const userBId = crypto.randomUUID();
  const mailboxBId = crypto.randomUUID();
  const emailB = 'bob@mail-b.test';

  await provisionInstance({
    db: dbA,
    instanceName: 'Instance A (Alice)',
    orgId: orgAId,
    orgName: 'Organization A',
    domainId: domainAId,
    domainName: 'mail-a.test',
    userId: userAId,
    userEmail: emailA,
    mailboxId: mailboxAId,
  });

  await provisionInstance({
    db: dbB,
    instanceName: 'Instance B (Bob)',
    orgId: orgBId,
    orgName: 'Organization B',
    domainId: domainBId,
    domainName: 'mail-b.test',
    userId: userBId,
    userEmail: emailB,
    mailboxId: mailboxBId,
  });

  // STEP 3: Setup Repositories & Inbound Pipelines
  console.log('\n[Step 3] Setting up Instance Inbound & Outbound Services...');
  const domainRepoB = new PostgresDomainRepository(dbB);
  const mailboxRepoB = new PostgresMailboxRepository(dbB);
  const folderRepoB = new PostgresFolderRepository(dbB);
  const messageRepoB = new PostgresMessageRepository(dbB);
  const threadRepoB = new PostgresThreadRepository(dbB);

  const inboundPipelineB = new InboundPipeline(
    domainRepoB,
    mailboxRepoB,
    folderRepoB,
    messageRepoB,
    threadRepoB,
    storageB,
  );

  const domainRepoA = new PostgresDomainRepository(dbA);
  const mailboxRepoA = new PostgresMailboxRepository(dbA);
  const folderRepoA = new PostgresFolderRepository(dbA);
  const messageRepoA = new PostgresMessageRepository(dbA);
  const threadRepoA = new PostgresThreadRepository(dbA);

  const inboundPipelineA = new InboundPipeline(
    domainRepoA,
    mailboxRepoA,
    folderRepoA,
    messageRepoA,
    threadRepoA,
    storageA,
  );

  // STEP 4: Start Inbound SMTP/LMTP Server for Instance B on local port 3424
  console.log('\n[Step 4] Starting Inbound Daemon for Instance B on port 3424...');
  const serverB = createLmtpServer(inboundPipelineB);
  await new Promise<void>((resolve) => serverB.listen(3424, '127.0.0.1', () => resolve()));
  console.log('✅ Instance B Inbound Daemon listening on 127.0.0.1:3424');

  // STEP 5: Start Inbound SMTP/LMTP Server for Instance A on local port 2424 (for replies)
  const serverA = createLmtpServer(inboundPipelineA);
  await new Promise<void>((resolve) => serverA.listen(2424, '127.0.0.1', () => resolve()));
  console.log('✅ Instance A Inbound Daemon listening on 127.0.0.1:2424');

  // STEP 6: Primary Test: Alice (Instance A) -> Bob (Instance B)
  console.log('\n[Step 6] Executing Primary Message Delivery (Alice -> Bob)...');
  const messageAId = crypto.randomUUID();
  const queueAId = crypto.randomUUID();
  const testSubject = 'Dual Instance SMTP Test';
  const testBody = 'Hello from Instance A.\n\nThis is a local two-server Eazzio Mail integration test.\n\nTimestamp: ' + new Date().toISOString();
  const rawMime = Buffer.from(
    `From: ${emailA}\r\nTo: ${emailB}\r\nSubject: ${testSubject}\r\nDate: ${new Date().toUTCString()}\r\nMessage-ID: <${messageAId}@mail-a.test>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${testBody}`
  );

  // Sign DKIM on Instance A
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const signedMime = DkimSigner.sign({
    rawMime,
    domainName: 'mail-a.test',
    selector: 'default',
    privateKeyPem: privateKey,
  });

  // Save in Instance A storage & DB
  const rawObjectKeyA = `mailboxes/${mailboxAId}/messages/${messageAId}/raw.eml`;
  await storageA.put(rawObjectKeyA, signedMime, 'message/rfc822');

  const sentFolderRowsA = (await dbA.query(`SELECT id FROM folders WHERE mailbox_id = $1 AND kind = 'sent'`, [mailboxAId])) as any[];
  const sentFolderAId = sentFolderRowsA[0].id;

  await dbA.query(
    `INSERT INTO messages (id, mailbox_id, folder_id, message_id_header, from_address, subject, snippet, size_bytes, raw_object_key, is_read, direction, delivery_state, received_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, 'outbound', 'queued', now())`,
    [messageAId, mailboxAId, sentFolderAId, `<${messageAId}@mail-a.test>`, emailA, testSubject, testBody.slice(0, 100), signedMime.length, rawObjectKeyA]
  );

  await dbA.query(
    `INSERT INTO outbound_queue (id, message_id, recipient_address, state, attempt_count, next_attempt_at, idempotency_key)
     VALUES ($1, $2, $3, 'queued', 0, now(), $4)`,
    [queueAId, messageAId, emailB, crypto.randomUUID()]
  );

  console.log(`✅ Message enqueued in Instance A (queueId: ${queueAId}, messageId: ${messageAId})`);

  // Execute QueueRunner on Instance A targeting Instance B's SMTP/LMTP daemon on port 3424
  const queueRepoA = new PostgresOutboundQueueRepository(dbA);
  const directTransportToB = new DirectMtaEmailTransport({
    defaultHost: '127.0.0.1',
    defaultPort: 3424,
    heloHostname: 'mail-a.test',
  });

  const runnerA = new QueueRunner(queueRepoA, messageRepoA, storageA, directTransportToB);
  const runResult = await runnerA.processNextBatch(10);

  console.log(`✅ Instance A QueueRunner finished: processed=${runResult.processed}, delivered=${runResult.delivered}, bounced=${runResult.bounced}`);
  if (runResult.delivered !== 1) {
    throw new Error(`Expected 1 delivered message, got ${runResult.delivered}`);
  }

  // STEP 7: Verify Instance B Database, Storage, and Mailbox
  console.log('\n[Step 7] Verifying Instance B Mailbox & Database State...');
  const receivedMessagesB = (await dbB.query(
    `SELECT m.*, f.kind as folder_kind FROM messages m JOIN folders f ON f.id = m.folder_id WHERE m.mailbox_id = $1`,
    [mailboxBId]
  )) as any[];

  console.log(`✅ Instance B Messages Found: ${receivedMessagesB.length}`);
  if (receivedMessagesB.length === 0) {
    throw new Error('Message was not persisted in Instance B database!');
  }

  const msgB = receivedMessagesB[0];
  console.log('   - ID in DB B:', msgB.id);
  console.log('   - From Address:', msgB.from_address);
  console.log('   - Subject:', msgB.subject);
  console.log('   - Folder Kind:', msgB.folder_kind);
  console.log('   - Direction:', msgB.direction);
  console.log('   - Delivery State:', msgB.delivery_state);
  console.log('   - Message-ID Header:', msgB.message_id_header);

  if (msgB.from_address !== emailA) throw new Error(`Expected from ${emailA}, got ${msgB.from_address}`);
  if (msgB.subject !== testSubject) throw new Error(`Expected subject "${testSubject}", got "${msgB.subject}"`);
  if (msgB.folder_kind !== 'inbox') throw new Error(`Expected folder 'inbox', got ${msgB.folder_kind}`);
  if (msgB.direction !== 'inbound') throw new Error(`Expected direction 'inbound', got ${msgB.direction}`);

  // Verify Storage B has raw MIME
  const rawMimeStoredB = await storageB.get(msgB.raw_object_key);
  if (!rawMimeStoredB || rawMimeStoredB.length === 0) {
    throw new Error('Raw MIME missing in Instance B storage!');
  }
  console.log(`✅ Instance B Raw MIME verified in storage (${rawMimeStoredB.length} bytes)`);

  // STEP 8: Verify Instance Isolation
  console.log('\n[Step 8] Verifying Database & Storage Isolation...');
  const crossCheckA = (await dbA.query(`SELECT COUNT(*) as c FROM messages WHERE mailbox_id = $1`, [mailboxBId])) as any[];
  const crossCheckB = (await dbB.query(`SELECT COUNT(*) as c FROM messages WHERE mailbox_id = $1`, [mailboxAId])) as any[];

  if (Number(crossCheckA[0].c) !== 0 || Number(crossCheckB[0].c) !== 0) {
    throw new Error('Database isolation failure: cross-instance mailbox leakage detected!');
  }
  console.log('✅ Full Database Isolation Confirmed (0 cross-mailbox leaks)');

  // STEP 9: Attachment Test (Alice -> Bob with PDF attachment)
  console.log('\n[Step 9] Executing Attachment Test (Alice -> Bob with contract_proposal.pdf)...');
  const boundary = '----=_Part_Attachment_Test_123';
  const attContent = Buffer.from('%PDF-1.4 Eazzio Mail Attachment Test Content -- Confidential', 'utf-8');
  const attBase64 = attContent.toString('base64');

  const attachmentMime = Buffer.from(
    `From: ${emailA}\r\nTo: ${emailB}\r\nSubject: Dual Instance Attachment Test\r\nDate: ${new Date().toUTCString()}\r\nMessage-ID: <${crypto.randomUUID()}@mail-a.test>\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nPlease find attached the test document.\r\n\r\n--${boundary}\r\nContent-Type: application/pdf; name="contract_proposal.pdf"\r\nContent-Disposition: attachment; filename="contract_proposal.pdf"\r\nContent-Transfer-Encoding: base64\r\n\r\n${attBase64}\r\n--${boundary}--\r\n`
  );

  const attEnvelope = new InboundEnvelope({
    envelopeFrom: emailA,
    envelopeTo: [emailB],
    clientIp: '127.0.0.1',
    sizeBytes: attachmentMime.length,
  });

  const attResult = await inboundPipelineB.process({
    envelope: attEnvelope,
    rawMime: attachmentMime,
    authResults: { spf: 'pass', dkim: 'pass', dmarc: 'pass', fromDomain: 'mail-a.test' },
  });

  if (attResult.status !== 'ACCEPTED') {
    throw new Error(`Attachment test failed with status ${attResult.status}`);
  }
  console.log(`✅ Attachment message processed and accepted in Instance B (messageId: ${attResult.messageId})`);

  // STEP 10: Bidirectional Reply / Threading Test (Bob -> Alice)
  console.log('\n[Step 10] Executing Bidirectional Reply Test (Bob -> Alice)...');
  const replyMessageId = crypto.randomUUID();
  const replyMime = Buffer.from(
    `From: ${emailB}\r\nTo: ${emailA}\r\nSubject: Re: Dual Instance SMTP Test\r\nDate: ${new Date().toUTCString()}\r\nMessage-ID: <${replyMessageId}@mail-b.test>\r\nIn-Reply-To: <${messageAId}@mail-a.test>\r\nReferences: <${messageAId}@mail-a.test>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nHi Alice, Received your message on Instance B successfully!\r\n`
  );

  const replyEnvelope = new InboundEnvelope({
    envelopeFrom: emailB,
    envelopeTo: [emailA],
    clientIp: '127.0.0.1',
    sizeBytes: replyMime.length,
  });

  const replyResult = await inboundPipelineA.process({
    envelope: replyEnvelope,
    rawMime: replyMime,
    authResults: { spf: 'pass', dkim: 'pass', dmarc: 'pass', fromDomain: 'mail-b.test' },
  });

  if (replyResult.status !== 'ACCEPTED') {
    throw new Error(`Reply message failed with status ${replyResult.status}`);
  }

  const receivedReplyA = (await dbA.query(`SELECT * FROM messages WHERE id = $1`, [replyResult.messageId])) as any[];
  console.log('✅ Reply delivered to Instance A:');
  console.log('   - From:', receivedReplyA[0].from_address);
  console.log('   - Subject:', receivedReplyA[0].subject);
  console.log('   - In-Reply-To:', receivedReplyA[0].in_reply_to);

  // STEP 11: Negative Cases (Unknown Recipient, Idempotency)
  console.log('\n[Step 11] Executing Negative Test Cases...');
  
  // 1. Unknown Recipient on Instance B
  const unknownEnvelope = new InboundEnvelope({
    envelopeFrom: emailA,
    envelopeTo: ['unknown_user@mail-b.test'],
    clientIp: '127.0.0.1',
    sizeBytes: rawMime.length,
  });
  const unknownResult = await inboundPipelineB.process({
    envelope: unknownEnvelope,
    rawMime,
    authResults: { spf: 'pass', dkim: 'pass', dmarc: 'pass', fromDomain: 'mail-a.test' },
  });
  if (unknownResult.status !== 'REJECTED') {
    throw new Error('Expected unknown recipient to be REJECTED');
  }
  console.log('✅ Negative Test 1: Unknown recipient correctly REJECTED');

  // 2. Duplicate submission idempotency
  const dupResult = await inboundPipelineB.process({
    envelope: new InboundEnvelope({ envelopeFrom: emailA, envelopeTo: [emailB], clientIp: '127.0.0.1', sizeBytes: rawMime.length }),
    rawMime,
    authResults: { spf: 'pass', dkim: 'pass', dmarc: 'pass', fromDomain: 'mail-a.test' },
  });
  if (dupResult.status !== 'ACCEPTED' || !(dupResult as any).duplicate) {
    throw new Error('Expected duplicate submission to be recognized as duplicate');
  }
  console.log('✅ Negative Test 2: Duplicate message submission detected and handled idempotently');

  // Close test servers
  serverA.close();
  serverB.close();
  await dbA.close();
  await dbB.close();

  console.log('\n════════════════════════════════════════════════════════════════════════');
  console.log('  🎉 DUAL INSTANCE LOCAL E2E VERIFICATION COMPLETED WITH 100% SUCCESS');
  console.log('════════════════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('\n❌ Dual Instance Test FAILED:', err);
  process.exit(1);
});
