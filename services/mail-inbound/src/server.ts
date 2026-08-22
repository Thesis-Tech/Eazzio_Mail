import net from 'net';
import { InboundPipeline } from './application/inbound-pipeline.js';
import { InboundEnvelope } from './domain/envelope.js';
import {
  PostgresAdapter,
  PostgresDomainRepository,
  PostgresMailboxRepository,
  PostgresFolderRepository,
  PostgresMessageRepository,
  PostgresThreadRepository,
  MemoryStorageAdapter,
} from '@eazzio/infra-adapters';
import { RspamdScanner } from './security/rspamd-scanner.js';
import { ClamAVScanner } from './security/clamav-scanner.js';

const PORT = Number(process.env.LMTP_PORT || process.env.PORT || 2424);
const HOST = process.env.HOST || '0.0.0.0';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://eazzio_user:eazzio_password@localhost:5432/eazzio_mail';
const RSPAMD_URL = process.env.RSPAMD_URL || 'http://localhost:11333';
const CLAMAV_HOST = process.env.CLAMAV_HOST || 'localhost';
const CLAMAV_PORT = Number(process.env.CLAMAV_PORT || 3310);

const db = new PostgresAdapter(DATABASE_URL);
const domainRepo = new PostgresDomainRepository(db);
const mailboxRepo = new PostgresMailboxRepository(db);
const folderRepo = new PostgresFolderRepository(db);
const messageRepo = new PostgresMessageRepository(db);
const threadRepo = new PostgresThreadRepository(db);
const storage = new MemoryStorageAdapter();

const rspamdScanner = new RspamdScanner({ endpoint: RSPAMD_URL });
const clamavScanner = new ClamAVScanner({ host: CLAMAV_HOST, port: CLAMAV_PORT });

const pipeline = new InboundPipeline(
  domainRepo,
  mailboxRepo,
  folderRepo,
  messageRepo,
  threadRepo,
  storage,
  rspamdScanner,
  clamavScanner,
);

export function createLmtpServer(customPipeline?: InboundPipeline): net.Server {
  const activePipeline = customPipeline || pipeline;

  const server = net.createServer((socket) => {
    const clientIp = socket.remoteAddress || '127.0.0.1';
    socket.write('220 eazzio-mail-inbound LMTP/SMTP Service Ready\r\n');

    let state: 'INIT' | 'MAIL_FROM' | 'RCPT_TO' | 'DATA' = 'INIT';
    let envelopeFrom = '';
    const envelopeTo: string[] = [];
    let dataBuffer = Buffer.alloc(0);
    let lineBuffer = '';

    socket.on('data', async (chunk) => {
      const bufChunk = typeof chunk === 'string' ? Buffer.from(chunk, 'utf-8') : chunk;

      if (state === 'DATA') {
        dataBuffer = Buffer.concat([dataBuffer, bufChunk]);
        const dataStr = dataBuffer.toString('binary');
        const endIdx = dataStr.indexOf('\r\n.\r\n');
        const altEndIdx = dataStr.indexOf('\n.\n');

        if (endIdx !== -1 || altEndIdx !== -1) {
          const splitIdx = endIdx !== -1 ? endIdx : altEndIdx;
          const rawMimeContent = dataBuffer.subarray(0, splitIdx);
          // Dot-unstuffing
          const unDotStuffed = rawMimeContent.toString('utf-8').replace(/\r?\n\.\./g, '\r\n.');
          const rawMime = Buffer.from(unDotStuffed, 'utf-8');

          try {
            const envelope = new InboundEnvelope({
              envelopeFrom: envelopeFrom || 'unknown@eazzio.local',
              envelopeTo: envelopeTo.length > 0 ? envelopeTo : ['unknown@eazzio.local'],
              clientIp,
              sizeBytes: rawMime.length,
            });

            const result = await activePipeline.process({
              envelope,
              rawMime,
              authResults: {
                spf: 'pass',
                dkim: 'pass',
                dmarc: 'pass',
                fromDomain: envelopeFrom.split('@')[1] || 'unknown',
              },
            });

            if (result.status === 'REJECTED') {
              for (let i = 0; i < envelopeTo.length; i++) {
                socket.write('550 5.7.1 Message rejected by policy\r\n');
              }
            } else {
              for (let i = 0; i < envelopeTo.length; i++) {
                socket.write(`250 2.1.5 <${envelopeTo[i]}> Message accepted (${result.messageId})\r\n`);
              }
            }
          } catch (err: any) {
            console.error('Inbound pipeline processing error:', err);
            socket.write('451 4.3.0 Internal processing error\r\n');
          }

          // Reset for next message in same connection
          state = 'INIT';
          envelopeFrom = '';
          envelopeTo.length = 0;
          dataBuffer = Buffer.alloc(0);
        }
        return;
      }

      lineBuffer += chunk.toString('utf-8');
      let lineEnd: number;

      while ((lineEnd = lineBuffer.indexOf('\r\n')) !== -1 || (lineEnd = lineBuffer.indexOf('\n')) !== -1) {
        const line = lineBuffer.substring(0, lineEnd).trim();
        lineBuffer = lineBuffer.substring(lineEnd + (lineBuffer.charAt(lineEnd) === '\r' ? 2 : 1));

        if (!line) continue;
        const upper = line.toUpperCase();

        if (upper.startsWith('LHLO') || upper.startsWith('EHLO') || upper.startsWith('HELO')) {
          socket.write('250-eazzio-inbound\r\n250-8BITMIME\r\n250-PIPELINING\r\n250 OK\r\n');
          state = 'INIT';
        } else if (upper.startsWith('MAIL FROM:')) {
          const match = line.match(/MAIL FROM:\s*<([^>]*)>/i) || line.match(/MAIL FROM:\s*(\S+)/i);
          envelopeFrom = match ? match[1]! : '';
          state = 'MAIL_FROM';
          socket.write('250 2.1.0 Sender OK\r\n');
        } else if (upper.startsWith('RCPT TO:')) {
          const match = line.match(/RCPT TO:\s*<([^>]*)>/i) || line.match(/RCPT TO:\s*(\S+)/i);
          if (match) {
            envelopeTo.push(match[1]!);
            state = 'RCPT_TO';
            socket.write('250 2.1.5 Recipient OK\r\n');
          } else {
            socket.write('501 5.5.2 Syntax error in recipient\r\n');
          }
        } else if (upper === 'DATA') {
          if (envelopeTo.length === 0) {
            socket.write('503 5.5.1 Error: need RCPT command\r\n');
          } else {
            state = 'DATA';
            dataBuffer = Buffer.alloc(0);
            socket.write('354 Start mail input; end with <CRLF>.<CRLF>\r\n');
          }
        } else if (upper === 'RSET') {
          state = 'INIT';
          envelopeFrom = '';
          envelopeTo.length = 0;
          dataBuffer = Buffer.alloc(0);
          socket.write('250 2.0.0 Reset state OK\r\n');
        } else if (upper === 'NOOP') {
          socket.write('250 2.0.0 OK\r\n');
        } else if (upper === 'QUIT') {
          socket.write('221 2.0.0 Bye\r\n');
          socket.end();
        } else {
          socket.write('502 5.5.2 Command not recognized\r\n');
        }
      }
    });

    socket.on('error', (err) => {
      console.warn('Inbound socket warning:', err.message);
    });
  });

  return server;
}

const isDirectRun =
  process.env.RUN_INBOUND_SERVER === 'true' ||
  (typeof process.argv[1] === 'string' &&
    (process.argv[1].endsWith('server.js') || process.argv[1].endsWith('server.ts')));

if (isDirectRun && process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  const server = createLmtpServer();
  server.listen(PORT, HOST, () => {
    console.log(`🚀 Eazzio Mail Inbound Daemon listening on ${HOST}:${PORT} (LMTP/SMTP)`);
  });
}
