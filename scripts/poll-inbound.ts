import fs from 'fs';
import net from 'net';
import path from 'path';
import crypto from 'crypto';
import { PostgresAdapter } from '../packages/infra-adapters/src/database/postgres-adapter/postgres-adapter.js';
import { createLmtpServer } from '../services/mail-inbound/src/server.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://eazzio_user:eazzio_password@localhost:5432/eazzio_mail';
const DEFAULT_PORT = Number(process.env.LMTP_PORT || process.env.PORT || 2424);
const DEFAULT_HOST = '127.0.0.1';
const SESSION_FILE = path.join(process.cwd(), '.mailtm-account.json');

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

      if (lastLine && /^\d{3}\s/.test(lastLine)) {
        const code = parseInt(lastLine.substring(0, 3), 10);
        socket.removeListener('data', onData);
        socket.removeListener('error', onError);

        if (codes.includes(code)) {
          resolve(responseData.trim());
        } else {
          reject(new Error(`Expected [${codes.join(',')}], got [${code}]: ${responseData.trim()}`));
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

function dotStuffMime(rawBuffer: Buffer): Buffer {
  const content = rawBuffer.toString('utf-8');
  const lines = content.split(/\r?\n/);
  const stuffed = lines.map((l) => (l.startsWith('.') ? '.' + l : l)).join('\r\n');
  return Buffer.from(stuffed, 'utf-8');
}

function extractHeader(rawText: string, headerName: string): string | null {
  const regex = new RegExp(`^${headerName}:\\s*(.*?)(?=\\r?\\n[^\\s]|$)`, 'msi');
  const match = rawText.match(regex);
  if (!match) return null;
  const val = match[1].replace(/\r?\n\s+/g, ' ').trim();
  const addrMatch = val.match(/<([^>]+)>/) || val.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return addrMatch ? addrMatch[1] : val;
}

interface MailTmAccount {
  id: string;
  address: string;
  password: string;
  token: string;
}

async function getOrCreateMailTmAccount(): Promise<MailTmAccount> {
  if (fs.existsSync(SESSION_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8')) as MailTmAccount;
      // Verify token
      const meRes = await fetch('https://api.mail.tm/me', {
        headers: { Authorization: `Bearer ${saved.token}` },
      });
      if (meRes.ok) {
        return saved;
      }
    } catch (_) {}
  }

  // Get active domain
  const domainsRes = await fetch('https://api.mail.tm/domains');
  const domainsJson = (await domainsRes.json()) as any;
  const domain = domainsJson['hydra:member']?.[0]?.domain || 'emalupe.com';

  const username = `eazzio.live.${Date.now().toString(36)}`;
  const address = `${username}@${domain}`;
  const password = `Pass_${crypto.randomBytes(8).toString('hex')}!`;

  // Create account
  const createRes = await fetch('https://api.mail.tm/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password }),
  });
  const createJson = (await createRes.json()) as any;

  // Get token
  const tokenRes = await fetch('https://api.mail.tm/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password }),
  });
  const tokenJson = (await tokenRes.json()) as any;

  const account: MailTmAccount = {
    id: createJson.id || tokenJson.id,
    address,
    password,
    token: tokenJson.token,
  };

  fs.writeFileSync(SESSION_FILE, JSON.stringify(account, null, 2));
  return account;
}

async function ensureLocalRecipient(db: PostgresAdapter, recipientEmail: string): Promise<string> {
  const domain = recipientEmail.split('@')[1] || 'eazzio.com';
  const orgRow = (await db.query(`SELECT id FROM organizations LIMIT 1`)) as any[];
  const orgId = orgRow.length > 0 ? orgRow[0].id : crypto.randomUUID();

  if (orgRow.length === 0) {
    await db.query(`INSERT INTO organizations (id, name, policy) VALUES ($1, 'Default Org', '{}')`, [orgId]);
  }

  await db.query(
    `INSERT INTO domains (id, organization_id, domain_name, verification_status, mx_verified, spf_verified, dkim_verified, dmarc_verified)
     VALUES ($1, $2, $3, 'verified', true, true, true, true)
     ON CONFLICT (domain_name) DO UPDATE SET verification_status = 'verified'`,
    [crypto.randomUUID(), orgId, domain]
  );

  const domainRow = (await db.query(`SELECT id FROM domains WHERE domain_name = $1`, [domain])) as any[];
  const activeDomainId = domainRow[0].id;

  await db.query(
    `INSERT INTO users (id, email, password_hash, display_name)
     VALUES ($1, $2, 'hash_inbound', $3)
     ON CONFLICT (email) DO NOTHING`,
    [crypto.randomUUID(), recipientEmail, recipientEmail.split('@')[0]]
  );

  const userRow = (await db.query(`SELECT id FROM users WHERE email = $1`, [recipientEmail])) as any[];
  const activeUserId = userRow[0].id;

  await db.query(
    `INSERT INTO mailboxes (id, owner_user_id, domain_id, address)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (address) DO NOTHING`,
    [crypto.randomUUID(), activeUserId, activeDomainId, recipientEmail]
  );

  const mbRow = (await db.query(`SELECT id FROM mailboxes WHERE address = $1`, [recipientEmail])) as any[];
  const activeMailboxId = mbRow[0].id;

  await db.query(
    `INSERT INTO folders (id, mailbox_id, name, kind)
     VALUES ($1, $2, 'Inbox', 'inbox')
     ON CONFLICT DO NOTHING`,
    [crypto.randomUUID(), activeMailboxId]
  );

  return activeMailboxId;
}

async function injectIntoLmtp(
  rawMimeBytes: Buffer,
  sender: string,
  recipient: string,
  port: number = DEFAULT_PORT
): Promise<string> {
  const dotStuffed = dotStuffMime(rawMimeBytes);
  const socket = new net.Socket();

  return new Promise((resolve, reject) => {
    socket.connect(port, DEFAULT_HOST, async () => {
      try {
        await sendCommand(socket, '', 220);
        await sendCommand(socket, 'LHLO eazzio-inbound-bridge.local', 250);
        await sendCommand(socket, `MAIL FROM:<${sender}>`, 250);
        await sendCommand(socket, `RCPT TO:<${recipient}>`, 250);
        await sendCommand(socket, 'DATA', 354);

        socket.write(dotStuffed);
        socket.write('\r\n.\r\n');

        const dataResponse = await sendCommand(socket, '', 250);
        const match = dataResponse.match(/\(([a-f0-9-]+)\)/i);
        const serverMessageId = match ? match[1]! : 'accepted';

        await sendCommand(socket, 'QUIT', 221);
        socket.end();

        resolve(serverMessageId);
      } catch (err) {
        socket.destroy();
        reject(err);
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🌐 EAZZIO MAIL — ZERO-COST INTERNET INBOUND BRIDGE & POLLER');
  console.log('════════════════════════════════════════════════════════════════\n');

  const targetLocalRecipient = process.argv[2] || 'rahulkumar@eazzio.com';
  const targetPort = Number(process.argv[3] || DEFAULT_PORT);

  const db = new PostgresAdapter(DATABASE_URL);
  await ensureLocalRecipient(db, targetLocalRecipient);

  console.log('[Step 1] Initializing Public Inbound Mailbox Bridge...');
  const account = await getOrCreateMailTmAccount();

  console.log('────────────────────────────────────────────────────────────────');
  console.log('📬 PUBLIC EMAIL RECEIVING ADDRESS IS ACTIVE:');
  console.log(`👉  ${account.address}`);
  console.log('────────────────────────────────────────────────────────────────');
  console.log(`ℹ️  Send ANY real email from personal Gmail to: ${account.address}`);
  console.log(`ℹ️  Incoming emails will automatically route to: ${targetLocalRecipient}`);
  console.log(`ℹ️  Polling interval: 4 seconds\n`);

  let isRunning = true;
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping inbound bridge poller...');
    isRunning = false;
    process.exit(0);
  });

  while (isRunning) {
    try {
      const listRes = await fetch('https://api.mail.tm/messages', {
        headers: { Authorization: `Bearer ${account.token}` },
      });

      if (listRes.ok) {
        const listJson = (await listRes.json()) as any;
        const messages = listJson['hydra:member'] || [];

        for (const msg of messages) {
          const msgId = msg.id;
          console.log(`\n⚡ NEW INCOMING INTERNET EMAIL DETECTED! [ID: ${msgId}]`);
          console.log(`   • From:    ${msg.from?.address} (${msg.from?.name || ''})`);
          console.log(`   • Subject: ${msg.subject}`);
          console.log(`   • Date:    ${msg.createdAt}`);

          // Download raw RFC 822 EML stream
          const rawUrl = `https://api.mail.tm/messages/${msgId}/download`;
          const dlRes = await fetch(rawUrl, {
            headers: { Authorization: `Bearer ${account.token}` },
          });

          if (dlRes.ok) {
            const rawMime = await dlRes.text();
            const rawBuffer = Buffer.from(rawMime, 'utf-8');

            const sender = msg.from?.address || 'sender@external.com';
            console.log(`   • Ingesting ${rawBuffer.length} bytes into local LMTP daemon (127.0.0.1:${targetPort})...`);

            const serverMsgId = await injectIntoLmtp(
              rawBuffer,
              sender,
              targetLocalRecipient,
              targetPort
            );

            console.log(`   🟢 250 Message Accepted by Eazzio Pipeline! [Message ID: ${serverMsgId}]`);
            console.log(`   ✅ Persisted into PostgreSQL and broadcasted to Web UI / Mobile App!`);

            // Delete message from remote inbox to avoid re-processing
            await fetch(`https://api.mail.tm/messages/${msgId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${account.token}` },
            });
          }
        }
      }
    } catch (err: any) {
      console.warn('Polling warning:', err.message);
    }

    await new Promise((r) => setTimeout(r, 4000));
  }
}

main().catch((err) => {
  console.error('Fatal poller error:', err);
  process.exit(1);
});
