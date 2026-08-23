import fs from 'fs';
import net from 'net';
import path from 'path';
import crypto from 'crypto';
import { PostgresAdapter } from '../packages/infra-adapters/src/database/postgres-adapter/postgres-adapter.js';
import { createLmtpServer } from '../services/mail-inbound/src/server.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://eazzio_user:eazzio_password@localhost:5432/eazzio_mail';
const DEFAULT_PORT = Number(process.env.LMTP_PORT || process.env.PORT || 2424);
const DEFAULT_HOST = '127.0.0.1';

interface InjectionTask {
  emlPath: string;
  recipientEmail: string;
  senderEmail?: string;
  uniqueMessageId?: boolean;
}

interface InjectionResult {
  index: number;
  emlFile: string;
  recipientEmail: string;
  senderEmail: string;
  subject: string;
  status: 'SUCCESS' | 'FAILED';
  messageId?: string;
  error?: string;
  durationMs: number;
}

// SMTP command sender helper
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

function extractHeader(rawText: string, headerName: string): string | null {
  const regex = new RegExp(`^${headerName}:\\s*(.*?)(?=\\r?\\n[^\\s]|$)`, 'msi');
  const match = rawText.match(regex);
  if (!match) return null;
  const val = match[1].replace(/\r?\n\s+/g, ' ').trim();
  const addrMatch = val.match(/<([^>]+)>/) || val.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return addrMatch ? addrMatch[1] : val;
}

function dotStuffMime(rawBuffer: Buffer): Buffer {
  const content = rawBuffer.toString('utf-8');
  const lines = content.split(/\r?\n/);
  const stuffed = lines.map((l) => (l.startsWith('.') ? '.' + l : l)).join('\r\n');
  return Buffer.from(stuffed, 'utf-8');
}

// Replace or inject a fresh Message-ID in the raw MIME header so batch injections don't trigger deduplication
function rewriteMessageId(rawText: string, newMsgId: string): string {
  if (/^Message-ID:\s*.*$/mi.test(rawText)) {
    return rawText.replace(/^Message-ID:\s*.*$/mi, `Message-ID: <${newMsgId}>`);
  }
  return `Message-ID: <${newMsgId}>\r\n` + rawText;
}

async function ensureMailbox(
  db: PostgresAdapter,
  recipientEmail: string,
  cache: { orgId?: string; domains: Set<string>; users: Set<string>; mailboxes: Set<string> }
): Promise<string> {
  const recipientDomain = recipientEmail.split('@')[1] || 'eazzio.com';

  if (!cache.orgId) {
    const orgId = crypto.randomUUID();
    await db.query(
      `INSERT INTO organizations (id, name, policy) VALUES ($1, 'Eazzio Batch Org', '{}') ON CONFLICT DO NOTHING`,
      [orgId]
    );
    const orgRow = (await db.query(`SELECT id FROM organizations LIMIT 1`)) as any[];
    cache.orgId = orgRow[0].id;
  }

  if (!cache.domains.has(recipientDomain)) {
    const domainId = crypto.randomUUID();
    await db.query(
      `INSERT INTO domains (id, organization_id, domain_name, verification_status, mx_verified, spf_verified, dkim_verified, dmarc_verified)
       VALUES ($1, $2, $3, 'verified', true, true, true, true)
       ON CONFLICT (domain_name) DO UPDATE SET verification_status = 'verified'`,
      [domainId, cache.orgId, recipientDomain]
    );
    cache.domains.add(recipientDomain);
  }

  const domainRow = (await db.query(`SELECT id FROM domains WHERE domain_name = $1`, [recipientDomain])) as any[];
  const activeDomainId = domainRow[0].id;

  if (!cache.users.has(recipientEmail)) {
    const userId = crypto.randomUUID();
    await db.query(
      `INSERT INTO users (id, email, password_hash, display_name)
       VALUES ($1, $2, 'hash_batch', $3)
       ON CONFLICT (email) DO NOTHING`,
      [userId, recipientEmail, recipientEmail.split('@')[0]]
    );
    cache.users.add(recipientEmail);
  }

  const userRow = (await db.query(`SELECT id FROM users WHERE email = $1`, [recipientEmail])) as any[];
  const activeUserId = userRow[0].id;

  if (!cache.mailboxes.has(recipientEmail)) {
    const mailboxId = crypto.randomUUID();
    await db.query(
      `INSERT INTO mailboxes (id, owner_user_id, domain_id, address)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (address) DO NOTHING`,
      [mailboxId, activeUserId, activeDomainId, recipientEmail]
    );

    const mbRow = (await db.query(`SELECT id FROM mailboxes WHERE address = $1`, [recipientEmail])) as any[];
    const activeMailboxId = mbRow[0].id;

    await db.query(
      `INSERT INTO folders (id, mailbox_id, name, kind)
       VALUES ($1, $2, 'Inbox', 'inbox')
       ON CONFLICT DO NOTHING`,
      [crypto.randomUUID(), activeMailboxId]
    );
    cache.mailboxes.add(recipientEmail);
    return activeMailboxId;
  }

  const mbRow = (await db.query(`SELECT id FROM mailboxes WHERE address = $1`, [recipientEmail])) as any[];
  return mbRow[0].id;
}

// Single LMTP delivery execution over a raw TCP socket
async function injectSingle(
  task: InjectionTask,
  port: number,
  host: string
): Promise<{ messageId: string; subject: string; sender: string }> {
  const rawEmlBytes = fs.readFileSync(task.emlPath);
  let rawEmlText = rawEmlBytes.toString('utf-8');

  const sender = task.senderEmail || extractHeader(rawEmlText, 'From') || 'sender@external.com';
  const subject = extractHeader(rawEmlText, 'Subject') || '(No Subject)';

  if (task.uniqueMessageId !== false) {
    const uniqueId = `batch-${Date.now()}-${crypto.randomUUID()}@eazzio.local`;
    rawEmlText = rewriteMessageId(rawEmlText, uniqueId);
  }

  const finalBytes = Buffer.from(rawEmlText, 'utf-8');
  const dotStuffed = dotStuffMime(finalBytes);

  const socket = new net.Socket();

  return new Promise((resolve, reject) => {
    socket.connect(port, host, async () => {
      try {
        await sendCommand(socket, '', 220);
        await sendCommand(socket, 'LHLO eazzio-batch-injector.local', 250);
        await sendCommand(socket, `MAIL FROM:<${sender}>`, 250);
        await sendCommand(socket, `RCPT TO:<${task.recipientEmail}>`, 250);
        await sendCommand(socket, 'DATA', 354);

        socket.write(dotStuffed);
        socket.write('\r\n.\r\n');

        const dataResponse = await sendCommand(socket, '', 250);
        const match = dataResponse.match(/\(([a-f0-9-]+)\)/i);
        const serverMessageId = match ? match[1]! : 'accepted';

        await sendCommand(socket, 'QUIT', 221);
        socket.end();

        resolve({ messageId: serverMessageId, subject, sender });
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

function parseCliArgs() {
  const args = process.argv.slice(2);
  const config: {
    file?: string;
    folder?: string;
    csv?: string;
    mailboxes?: string[];
    count?: number;
    domain?: string;
    port?: number;
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--file' || arg === '-f') {
      config.file = args[++i];
    } else if (arg === '--folder' || arg === '-d') {
      config.folder = args[++i];
    } else if (arg === '--csv') {
      config.csv = args[++i];
    } else if (arg === '--mailboxes' || arg === '-m') {
      config.mailboxes = (args[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    } else if (arg === '--count' || arg === '-c') {
      config.count = parseInt(args[++i], 10);
    } else if (arg === '--domain') {
      config.domain = args[++i];
    } else if (arg === '--port' || arg === '-p') {
      config.port = parseInt(args[++i], 10);
    } else if (!config.file && fs.existsSync(arg)) {
      config.file = arg;
    }
  }

  return config;
}

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 EAZZIO MAIL — MULTI-MAILBOX BATCH EML INJECTION HARNESS');
  console.log('════════════════════════════════════════════════════════════════\n');

  const cli = parseCliArgs();
  const targetPort = cli.port || DEFAULT_PORT;
  const targetDomain = cli.domain || 'eazzio.com';

  const tasks: InjectionTask[] = [];

  // Build task list based on inputs
  if (cli.csv) {
    if (!fs.existsSync(cli.csv)) {
      console.error(`❌ CSV file not found: ${cli.csv}`);
      process.exit(1);
    }
    const lines = fs.readFileSync(cli.csv, 'utf-8').split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const [emlPath, recipientEmail] = line.split(',').map((s) => s.trim());
      if (emlPath && recipientEmail && fs.existsSync(emlPath)) {
        tasks.push({ emlPath, recipientEmail });
      }
    }
  } else if (cli.folder) {
    if (!fs.existsSync(cli.folder)) {
      console.error(`❌ Folder not found: ${cli.folder}`);
      process.exit(1);
    }
    const emlFiles = fs.readdirSync(cli.folder)
      .filter((f) => f.endsWith('.eml'))
      .map((f) => path.join(cli.folder!, f));

    if (emlFiles.length === 0) {
      console.error(`❌ No .eml files found in directory: ${cli.folder}`);
      process.exit(1);
    }

    const count = cli.count || emlFiles.length;
    for (let i = 0; i < count; i++) {
      const emlPath = emlFiles[i % emlFiles.length]!;
      const recipientEmail =
        cli.mailboxes && cli.mailboxes[i % cli.mailboxes.length]
          ? cli.mailboxes[i % cli.mailboxes.length]!
          : `user${i + 1}@${targetDomain}`;
      tasks.push({ emlPath, recipientEmail });
    }
  } else {
    const singleEml = cli.file || '/home/rahul-kumar/Downloads/Huhf.eml';
    if (!fs.existsSync(singleEml)) {
      console.error(`❌ EML file not found: ${singleEml}`);
      process.exit(1);
    }

    const count = cli.count || (cli.mailboxes ? cli.mailboxes.length : 10);
    const mailboxList = cli.mailboxes || Array.from({ length: count }, (_, i) => `user${i + 1}@${targetDomain}`);

    for (let i = 0; i < count; i++) {
      const recipientEmail = mailboxList[i % mailboxList.length]!;
      tasks.push({ emlPath: singleEml, recipientEmail });
    }
  }

  console.log(`[Batch Configuration]`);
  console.log(`  • Total Injections:    ${tasks.length}`);
  console.log(`  • Target LMTP Port:    ${DEFAULT_HOST}:${targetPort}`);
  console.log(`  • Target Domain:       ${targetDomain}`);
  console.log(`  • Unique Mailboxes:    ${new Set(tasks.map((t) => t.recipientEmail)).size}`);

  // 1. Ensure Inbound LMTP Server is Listening
  let isServerRunning = false;
  try {
    const checkSocket = new net.Socket();
    await new Promise<void>((resolve) => {
      checkSocket.connect(targetPort, DEFAULT_HOST, () => {
        isServerRunning = true;
        checkSocket.destroy();
        resolve();
      });
      checkSocket.on('error', () => resolve());
    });
  } catch (_) {}

  let localServer: net.Server | null = null;
  if (!isServerRunning) {
    console.log(`\nℹ️ Inbound daemon not running on port ${targetPort}, starting standalone LMTP server...`);
    localServer = createLmtpServer();
    await new Promise<void>((resolve) => {
      localServer!.listen(targetPort, DEFAULT_HOST, () => {
        console.log(`🚀 Standalone Inbound LMTP Daemon started on ${DEFAULT_HOST}:${targetPort}`);
        resolve();
      });
    });
  } else {
    console.log(`\n✅ Inbound daemon is actively running on ${DEFAULT_HOST}:${targetPort}`);
  }

  // 2. Pre-seed DB cache for all target mailboxes
  console.log(`\n[Database Setup] Pre-seeding ${new Set(tasks.map((t) => t.recipientEmail)).size} mailboxes in PostgreSQL...`);
  const db = new PostgresAdapter(DATABASE_URL);
  const cache = { domains: new Set<string>(), users: new Set<string>(), mailboxes: new Set<string>() };

  for (const task of tasks) {
    await ensureMailbox(db, task.recipientEmail, cache);
  }
  console.log(`✅ All target mailboxes and domains pre-verified in PostgreSQL`);

  // 3. Execute Batch Injections
  console.log(`\n[Execution] Delivering ${tasks.length} messages via live LMTP socket protocol...\n`);
  const startTime = Date.now();
  const results: InjectionResult[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]!;
    const itemStart = Date.now();

    try {
      const res = await injectSingle(task, targetPort, DEFAULT_HOST);
      const durationMs = Date.now() - itemStart;

      results.push({
        index: i + 1,
        emlFile: path.basename(task.emlPath),
        recipientEmail: task.recipientEmail,
        senderEmail: res.sender,
        subject: res.subject,
        status: 'SUCCESS',
        messageId: res.messageId,
        durationMs,
      });

      console.log(
        `  [${String(i + 1).padStart(3, ' ')}/${tasks.length}] 🟢 250 OK (${durationMs}ms) ➔ ${task.recipientEmail} | Subj: "${res.subject.slice(0, 20)}" | ID: ${res.messageId}`
      );
    } catch (err: any) {
      const durationMs = Date.now() - itemStart;
      results.push({
        index: i + 1,
        emlFile: path.basename(task.emlPath),
        recipientEmail: task.recipientEmail,
        senderEmail: 'unknown',
        subject: 'unknown',
        status: 'FAILED',
        error: err.message,
        durationMs,
      });

      console.log(
        `  [${String(i + 1).padStart(3, ' ')}/${tasks.length}] 🔴 FAILED (${durationMs}ms) ➔ ${task.recipientEmail} | Error: ${err.message}`
      );
    }
  }

  const totalDurationMs = Date.now() - startTime;
  const successCount = results.filter((r) => r.status === 'SUCCESS').length;
  const failureCount = results.filter((r) => r.status === 'FAILED').length;
  const avgLatency = Math.round(totalDurationMs / tasks.length);

  // 4. Verify PostgreSQL message counts
  const totalMsgRows = (await db.query(`SELECT count(*) as count FROM messages`)) as any[];
  const totalThreadRows = (await db.query(`SELECT count(*) as count FROM threads`)) as any[];

  if (localServer) {
    localServer.close();
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 BATCH INJECTION SUMMARY REPORT');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  • Total Injections:      ${tasks.length}`);
  console.log(`  • Successful (250 OK):   ${successCount} (${Math.round((successCount / tasks.length) * 100)}%)`);
  console.log(`  • Failed:                ${failureCount}`);
  console.log(`  • Total Execution Time:  ${(totalDurationMs / 1000).toFixed(2)}s`);
  console.log(`  • Average Latency/Mail:  ${avgLatency}ms`);
  console.log(`  • Total DB Messages:     ${totalMsgRows[0].count}`);
  console.log(`  • Total DB Threads:      ${totalThreadRows[0].count}`);
  console.log('════════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Fatal batch injection error:', err);
  process.exit(1);
});
