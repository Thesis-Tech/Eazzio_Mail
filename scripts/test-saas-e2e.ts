import { defaultDb } from '../services/api/src/config/index.js';
import { TokenService } from '../services/identity/src/domain/token.js';
import crypto from 'crypto';

const API_BASE = 'http://127.0.0.1:8080';

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 EAZZIO SAAS FULL TRANSACTIONAL PIPELINE E2E TEST');
  console.log('════════════════════════════════════════════════════════════════\n');

  const testOrgId = crypto.randomUUID();
  const testUserId = crypto.randomUUID();
  const senderEmail = 'rahulkumar@eazzio.com';
  const recipientEmail = 'kumarrahulraj444@gmail.com';

  // 1. Ensure Domain & User Mailbox in DB
  console.log('[Step 1] Ensuring Organization, Domain & Mailbox for rahulkumar@eazzio.com...');
  await defaultDb.query(
    `INSERT INTO organizations (id, name, policy) VALUES ($1, 'Eazzio SaaS Inc', '{}') ON CONFLICT DO NOTHING`,
    [testOrgId]
  );
  await defaultDb.query(
    `INSERT INTO users (id, email, password_hash, display_name)
     VALUES ($1, $2, 'hash_saas', 'Rahul Kumar') ON CONFLICT (email) DO UPDATE SET display_name = 'Rahul Kumar'`,
    [testUserId, senderEmail]
  );
  const userRow = (await defaultDb.query(`SELECT id FROM users WHERE email = $1`, [senderEmail])) as any[];
  const actualUserId = userRow[0].id;

  const testDomainId = crypto.randomUUID();
  await defaultDb.query(
    `INSERT INTO domains (id, organization_id, domain_name, verification_status)
     VALUES ($1, $2, 'eazzio.com', 'verified')
     ON CONFLICT (domain_name) DO UPDATE SET verification_status = 'verified'`,
    [testDomainId, testOrgId]
  );
  const domainRow = (await defaultDb.query(`SELECT id FROM domains WHERE domain_name = 'eazzio.com'`)) as any[];
  const actualDomainId = domainRow[0].id;

  const mailboxId = crypto.randomUUID();
  await defaultDb.query(
    `INSERT INTO mailboxes (id, owner_user_id, domain_id, address)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (address) DO NOTHING`,
    [mailboxId, actualUserId, actualDomainId, senderEmail]
  );
  const mbRow = (await defaultDb.query(`SELECT id FROM mailboxes WHERE address = $1`, [senderEmail])) as any[];
  const actualMailboxId = mbRow[0].id;

  const sentFolderId = crypto.randomUUID();
  await defaultDb.query(
    `INSERT INTO folders (id, mailbox_id, name, kind)
     VALUES ($1, $2, 'Sent', 'sent')
     ON CONFLICT DO NOTHING`,
    [sentFolderId, actualMailboxId]
  );
  console.log('✅ Mailbox & Database records initialized');

  // 2. Generate Auth Token
  console.log('\n[Step 2] Generating Authenticated User Session Token...');
  const token = TokenService.generateAccessToken({
    userId: actualUserId,
    sessionId: crypto.randomUUID(),
    email: senderEmail,
  });
  console.log('✅ Authenticated JWT session created for:', senderEmail);

  // 3. Compose Email via REST API
  console.log('\n[Step 3] Submitting Compose Request via API (POST /v1/messages/compose)...');
  const now = new Date().toISOString();
  const composeRes = await fetch(`${API_BASE}/v1/messages/compose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: [recipientEmail],
      subject: 'Eazzio Transactional Email Test',
      bodyText: 'This is a real transactional email sent through Eazzio\'s email infrastructure on behalf of rahulkumar@eazzio.com.',
      bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
  <h2 style="color: #2563eb; margin-top: 0;">Eazzio Mail Transactional Test</h2>
  <p>Hello,</p>
  <p>This is a real transactional email sent through <strong>Eazzio's email infrastructure</strong> on behalf of platform user <code>${senderEmail}</code>.</p>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
  <p style="color: #666; font-size: 12px; margin: 0;">
    <strong>Sender:</strong> ${senderEmail}<br>
    <strong>Timestamp:</strong> ${now}
  </p>
</div>`,
    }),
  });

  const composeData = await composeRes.json() as any;
  console.log('✅ API Compose Response:', JSON.stringify(composeData, null, 2));

  // 4. Wait and Inspect Queue State in PostgreSQL
  console.log('\n[Step 4] Polling PostgreSQL outbound_queue status...');
  await new Promise((r) => setTimeout(r, 4000));

  const queueRows = (await defaultDb.query(
    `SELECT id, message_id, recipient_address, state, attempt_count, last_error, created_at
     FROM outbound_queue
     WHERE recipient_address = $1
     ORDER BY created_at DESC LIMIT 1`,
    [recipientEmail]
  )) as any[];

  if (queueRows.length > 0) {
    const q = queueRows[0];
    console.log(`✅ Outbound Queue Status:`);
    console.log(`   - Queue ID:        ${q.id}`);
    console.log(`   - Message ID:      ${q.message_id}`);
    console.log(`   - Recipient:       ${q.recipient_address}`);
    console.log(`   - State:           ${q.state}`);
    console.log(`   - Attempt Count:   ${q.attempt_count}`);
    console.log(`   - Last Error:      ${q.last_error || 'None'}`);
    console.log(`   - Created At:      ${q.created_at}`);
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('🎉 EAZZIO SAAS END-TO-END PIPELINE EXECUTION COMPLETE');
  console.log('════════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
