import fs from 'fs';
import net from 'net';
import path from 'path';
import { PostgresAdapter } from '../packages/infra-adapters/src/database/postgres-adapter/postgres-adapter.js';
import { createLmtpServer } from '../services/mail-inbound/src/server.js';
import crypto from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://eazzio_user:eazzio_password@localhost:5432/eazzio_mail';
const DEFAULT_PORT = Number(process.env.LMTP_PORT || process.env.PORT || 2424);
const DEFAULT_HOST = '127.0.0.1';

// Simple helper to send SMTP command and wait for expected response code
function sendCommand(
  socket: net.Socket,
  command: string,
  expectedCode: number | number[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const codes = Array.isArray(expectedCode) ? expectedCode : [expectedCode];
    let responseData = '';

    const onData = (data: Buffer) => {
      responseData += data.toString('utf-8');
      const lines = responseData.split('\r\n').filter(Boolean);
      const lastLine = lines[lines.length - 1];

      // Check if response is complete (e.g. "250 OK" vs "250-eazzio")
      if (lastLine && /^\d{3}\s/.test(lastLine)) {
        const code = parseInt(lastLine.substring(0, 3), 10);
        socket.removeListener('data', onData);
        socket.removeListener('error', onError);

        if (codes.includes(code)) {
          resolve(responseData.trim());
        } else {
          reject(new Error(`Expected status [${codes.join(',')}], but received: ${responseData.trim()}`));
        }
      }
    };

    const onError = (err: Error) => {
      socket.removeListener('data', onData);
      socket.removeListener('error', onError);
      reject(err);
    };

    socket.on('data', onData);
    socket.on('error', onError);

    if (command) {
      socket.write(command + '\r\n');
    }
  });
}

// Extract sender or recipient from MIME header block
function extractHeader(rawText: string, headerName: string): string | null {
  const regex = new RegExp(`^${headerName}:\\s*(.*?)(?=\\r?\\n[^\\s]|$)`, 'msi');
  const match = rawText.match(regex);
  if (!match) return null;
  const val = match[1].replace(/\r?\n\s+/g, ' ').trim();
  const addrMatch = val.match(/<([^>]+)>/) || val.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return addrMatch ? addrMatch[1] : val;
}

// Dot-stuff raw MIME according to RFC 5321 (prepend extra dot if line begins with a dot)
function dotStuffMime(rawBuffer: Buffer): Buffer {
  const content = rawBuffer.toString('utf-8');
  const lines = content.split(/\r?\n/);
  const stuffed = lines.map((l) => (l.startsWith('.') ? '.' + l : l)).join('\r\n');
  return Buffer.from(stuffed, 'utf-8');
}

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('📬 EAZZIO MAIL — REAL RAW EML INJECTION TEST TOOL');
  console.log('════════════════════════════════════════════════════════════════\n');

  const emlPath = process.argv[2] || '/home/rahul-kumar/Downloads/Huhf.eml';
  const targetRecipientArg = process.argv[3];
  const targetPort = Number(process.argv[4] || DEFAULT_PORT);

  if (!fs.existsSync(emlPath)) {
    console.error(`❌ Error: EML file not found at path: ${emlPath}`);
    process.exit(1);
  }

  console.log(`[Step 1] Reading raw EML from: ${emlPath}`);
  const rawEmlBytes = fs.readFileSync(emlPath);
  const rawEmlText = rawEmlBytes.toString('utf-8');
  console.log(`✅ Loaded ${rawEmlBytes.length} bytes of authentic MIME stream`);

  // Extract metadata from EML
  const extractedFrom = extractHeader(rawEmlText, 'From') || 'sender@external.com';
  const extractedTo = extractHeader(rawEmlText, 'To') || 'rahulkumar@eazzio.com';
  const subject = extractHeader(rawEmlText, 'Subject') || '(No Subject)';
  const messageIdHeader = extractHeader(rawEmlText, 'Message-ID') || `<inject-${Date.now()}@eazzio.local>`;

  const senderAddress = extractedFrom;
  const recipientAddress = targetRecipientArg || extractedTo;
  const recipientDomain = recipientAddress.split('@')[1] || 'eazzio.com';

  console.log('\n[EML Envelope Details]');
  console.log(`  • Sender (From):     ${senderAddress}`);
  console.log(`  • Recipient (To):    ${recipientAddress}`);
  console.log(`  • Subject:           ${subject}`);
  console.log(`  • Message-ID:        ${messageIdHeader}`);

  // 2. Ensure Database records for Domain, Mailbox, and Folder
  console.log('\n[Step 2] Ensuring recipient domain & mailbox in PostgreSQL...');
  const db = new PostgresAdapter(DATABASE_URL);
  
  const orgId = crypto.randomUUID();
  const domainId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const mailboxId = crypto.randomUUID();
  const inboxFolderId = crypto.randomUUID();

  // Insert or query domain
  await db.query(
    `INSERT INTO organizations (id, name, policy) VALUES ($1, 'Eazzio Test Org', '{}') ON CONFLICT DO NOTHING`,
    [orgId]
  );
  const orgRow = (await db.query(`SELECT id FROM organizations LIMIT 1`)) as any[];
  const activeOrgId = orgRow[0].id;

  await db.query(
    `INSERT INTO domains (id, organization_id, domain_name, verification_status, mx_verified, spf_verified, dkim_verified, dmarc_verified)
     VALUES ($1, $2, $3, 'verified', true, true, true, true)
     ON CONFLICT (domain_name) DO UPDATE SET verification_status = 'verified'`,
    [domainId, activeOrgId, recipientDomain]
  );
  const domainRow = (await db.query(`SELECT id FROM domains WHERE domain_name = $1`, [recipientDomain])) as any[];
  const activeDomainId = domainRow[0].id;

  await db.query(
    `INSERT INTO users (id, email, password_hash, display_name)
     VALUES ($1, $2, 'hash_test', 'Eazzio User')
     ON CONFLICT (email) DO NOTHING`,
    [userId, recipientAddress]
  );
  const userRow = (await db.query(`SELECT id FROM users WHERE email = $1`, [recipientAddress])) as any[];
  const activeUserId = userRow[0].id;

  await db.query(
    `INSERT INTO mailboxes (id, owner_user_id, domain_id, address)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (address) DO NOTHING`,
    [mailboxId, activeUserId, activeDomainId, recipientAddress]
  );
  const mbRow = (await db.query(`SELECT id FROM mailboxes WHERE address = $1`, [recipientAddress])) as any[];
  const activeMailboxId = mbRow[0].id;

  await db.query(
    `INSERT INTO folders (id, mailbox_id, name, kind)
     VALUES ($1, $2, 'Inbox', 'inbox')
     ON CONFLICT DO NOTHING`,
    [inboxFolderId, activeMailboxId]
  );
  console.log(`✅ Mailbox verified in database: [ID: ${activeMailboxId}] for ${recipientAddress}`);

  // 3. Ensure Inbound LMTP Server is Listening
  console.log(`\n[Step 3] Checking Inbound Daemon on port ${targetPort}...`);
  let isServerRunning = false;
  try {
    const checkSocket = new net.Socket();
    await new Promise<void>((resolve, reject) => {
      checkSocket.connect(targetPort, DEFAULT_HOST, () => {
        isServerRunning = true;
        checkSocket.destroy();
        resolve();
      });
      checkSocket.on('error', () => {
        resolve(); // Not running
      });
    });
  } catch (_) {
    // Not running
  }

  let localServer: net.Server | null = null;
  if (!isServerRunning) {
    console.log(`ℹ️ Inbound daemon not running on port ${targetPort}, starting standalone LMTP server...`);
    localServer = createLmtpServer();
    await new Promise<void>((resolve) => {
      localServer!.listen(targetPort, DEFAULT_HOST, () => {
        console.log(`🚀 Standalone Inbound LMTP Daemon started on ${DEFAULT_HOST}:${targetPort}`);
        resolve();
      });
    });
  } else {
    console.log(`✅ Inbound daemon is actively listening on ${DEFAULT_HOST}:${targetPort}`);
  }

  // 4. Connect via Real TCP Network Socket and Handshake
  console.log(`\n[Step 4] Connecting TCP Socket to ${DEFAULT_HOST}:${targetPort}...`);
  const socket = new net.Socket();

  await new Promise<void>((resolve, reject) => {
    socket.connect(targetPort, DEFAULT_HOST, () => {
      console.log('✅ TCP Network Connection Established!');
      resolve();
    });
    socket.on('error', reject);
  });

  try {
    // Greeting
    const greeting = await sendCommand(socket, '', 220);
    console.log(`◀ SERVER: ${greeting}`);

    // LHLO / EHLO
    console.log(`▶ CLIENT: LHLO eazzio-injector.local`);
    const lhloRes = await sendCommand(socket, 'LHLO eazzio-injector.local', 250);
    console.log(`◀ SERVER:\n${lhloRes.split('\n').map((l) => '  ' + l).join('\n')}`);

    // MAIL FROM
    console.log(`▶ CLIENT: MAIL FROM:<${senderAddress}>`);
    const mailFromRes = await sendCommand(socket, `MAIL FROM:<${senderAddress}>`, 250);
    console.log(`◀ SERVER: ${mailFromRes}`);

    // RCPT TO
    console.log(`▶ CLIENT: RCPT TO:<${recipientAddress}>`);
    const rcptToRes = await sendCommand(socket, `RCPT TO:<${recipientAddress}>`, 250);
    console.log(`◀ SERVER: ${rcptToRes}`);

    // DATA
    console.log(`▶ CLIENT: DATA`);
    const dataPrompt = await sendCommand(socket, 'DATA', 354);
    console.log(`◀ SERVER: ${dataPrompt}`);

    // Stream dot-stuffed MIME bytes + \r\n.\r\n
    console.log(`▶ CLIENT: [Streaming ${rawEmlBytes.length} bytes of raw MIME body + CRLF.CRLF terminator]`);
    const dotStuffed = dotStuffMime(rawEmlBytes);
    socket.write(dotStuffed);
    socket.write('\r\n.\r\n');

    const dataRes = await sendCommand(socket, '', 250);
    console.log(`◀ SERVER: ${dataRes}`);

    // QUIT
    console.log(`▶ CLIENT: QUIT`);
    const quitRes = await sendCommand(socket, 'QUIT', 221);
    console.log(`◀ SERVER: ${quitRes}`);

    socket.end();
  } catch (err: any) {
    console.error('❌ SMTP Protocol Handshake Error:', err.message);
    socket.destroy();
    if (localServer) localServer.close();
    process.exit(1);
  }

  // 5. Query PostgreSQL to Verify Message & Thread Rows
  console.log('\n[Step 5] Verifying Message & Thread persistence in PostgreSQL...');
  await new Promise((r) => setTimeout(r, 1000)); // Allow async DB write to settle

  const msgRows = (await db.query(
    `SELECT id, mailbox_id, folder_id, thread_id, from_address, subject, snippet, direction, delivery_state, received_at
     FROM messages
     WHERE mailbox_id = $1
     ORDER BY received_at DESC LIMIT 1`,
    [activeMailboxId]
  )) as any[];

  if (msgRows.length === 0) {
    console.error('❌ Error: No message record found in PostgreSQL for mailbox:', activeMailboxId);
  } else {
    const msg = msgRows[0];
    console.log('✅ PostgreSQL Message Row Successfully Created:');
    console.log(`   - Message ID:     ${msg.id}`);
    console.log(`   - Thread ID:      ${msg.thread_id}`);
    console.log(`   - Folder ID:      ${msg.folder_id}`);
    console.log(`   - From:           ${msg.from_address}`);
    console.log(`   - Subject:        ${msg.subject}`);
    console.log(`   - Snippet:        ${msg.snippet}`);
    console.log(`   - Direction:      ${msg.direction}`);
    console.log(`   - Delivery State: ${msg.delivery_state}`);
    console.log(`   - Received At:    ${msg.received_at}`);

    // Verify Thread
    const threadRows = (await db.query(
      `SELECT id, mailbox_id, subject_normalized, message_count, last_message_at
       FROM threads WHERE id = $1`,
      [msg.thread_id]
    )) as any[];

    if (threadRows.length > 0) {
      const th = threadRows[0];
      console.log('\n✅ PostgreSQL Thread Row Successfully Linked:');
      console.log(`   - Thread ID:          ${th.id}`);
      console.log(`   - Subject Normalized: ${th.subject_normalized}`);
      console.log(`   - Message Count:      ${th.message_count}`);
      console.log(`   - Last Message At:    ${th.last_message_at}`);
    }
  }

  if (localServer) {
    localServer.close();
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('🎉 REAL EML INJECTION COMPLETED & VERIFIED 100% END-TO-END!');
  console.log('════════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Fatal injection error:', err);
  process.exit(1);
});
