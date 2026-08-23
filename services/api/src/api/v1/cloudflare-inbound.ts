import { Router, Request, Response, NextFunction } from 'express';
import net from 'net';
import crypto from 'crypto';
import { AppError } from '../../middleware/error-handler.js';

export const cloudflareInboundRouter: Router = Router();

const LMTP_HOST = process.env.LMTP_HOST || '127.0.0.1';
const LMTP_PORT = Number(process.env.LMTP_PORT || 2424);
const CLOUDFLARE_SECRET = process.env.CLOUDFLARE_WEBHOOK_SECRET || process.env.EAZZIO_CLOUDFLARE_SECRET;

/**
 * Injects raw RFC 822 email payload directly into local LMTP socket (:2424)
 */
async function injectToLmtp(from: string, to: string[], rawMime: string | Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: LMTP_HOST, port: LMTP_PORT }, () => {
      // Socket connected
    });

    let buffer = '';
    let messageId = `<${crypto.randomUUID()}@inbound.cloudflare.eazzio.mail>`;

    const mimeBuffer = typeof rawMime === 'string' ? Buffer.from(rawMime, 'utf-8') : rawMime;
    let mimeStr = mimeBuffer.toString('utf-8');

    // Safe CRLF normalization
    mimeStr = mimeStr.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
    if (!mimeStr.endsWith('\r\n')) {
      mimeStr += '\r\n';
    }

    // Dot-stuffing for RFC 821 / RFC 2821
    const dotStuffed = mimeStr
      .split('\r\n')
      .map((line) => (line.startsWith('.') ? '.' + line : line))
      .join('\r\n');

    let stage = 0; // 0: Connected, 1: LHLO sent, 2: MAIL FROM sent, 3: RCPT TO sent, 4: DATA sent, 5: MIME sent

    socket.on('data', (chunk) => {
      buffer += chunk.toString();

      if (stage === 0 && buffer.includes('220')) {
        buffer = '';
        stage = 1;
        socket.write('LHLO cloudflare-email-router.eazzio.com\r\n');
      } else if (stage === 1 && buffer.includes('250')) {
        buffer = '';
        stage = 2;
        socket.write(`MAIL FROM:<${from}>\r\n`);
      } else if (stage === 2 && buffer.includes('250')) {
        buffer = '';
        stage = 3;
        socket.write(`RCPT TO:<${to[0]}>\r\n`);
      } else if (stage === 3 && buffer.includes('250')) {
        buffer = '';
        stage = 4;
        socket.write('DATA\r\n');
      } else if (stage === 4 && buffer.includes('354')) {
        buffer = '';
        stage = 5;
        socket.write(dotStuffed + (dotStuffed.endsWith('\r\n') ? '.\r\n' : '\r\n.\r\n'));
      } else if (stage === 5 && buffer.includes('250')) {
        const match = buffer.match(/250.*?([a-f0-9-]{36})/i);
        if (match && match[1]) {
          messageId = match[1];
        }
        socket.write('QUIT\r\n');
        socket.end();
        resolve(messageId);
      } else if (buffer.startsWith('4') || buffer.startsWith('5')) {
        socket.destroy();
        reject(new Error(`LMTP Delivery Failed: ${buffer.trim()}`));
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.setTimeout(10000, () => {
      socket.destroy();
      reject(new Error('LMTP connection timed out after 10 seconds'));
    });
  });
}

// POST /v1/messages/cloudflare-inbound - Receives Cloudflare Email Routing events
cloudflareInboundRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Verify Secret Header if configured
    if (CLOUDFLARE_SECRET) {
      const providedSecret =
        req.headers['x-cloudflare-secret'] ||
        req.headers['x-eazzio-secret'] ||
        req.headers['authorization']?.replace(/^Bearer\s+/i, '');

      if (!providedSecret || providedSecret !== CLOUDFLARE_SECRET) {
        throw new AppError('UNAUTHORIZED', 'Invalid or missing Cloudflare webhook secret', 401);
      }
    }

    let from = '';
    let to: string[] = [];
    let subject = '';
    let rawMime: string | Buffer = '';

    // 2. Parse Incoming Payload (structured JSON or raw body)
    if (typeof req.body === 'object' && req.body !== null) {
      from = req.body.from || req.body.sender || '';
      to = Array.isArray(req.body.to) ? req.body.to : [req.body.to || req.body.recipient || ''];
      subject = req.body.subject || '(No Subject)';
      rawMime = req.body.rawMime || req.body.raw || req.body.body || '';

      // If rawMime is empty but text/html is provided, synthesize standard MIME
      if (!rawMime && (req.body.text || req.body.html)) {
        const bodyText = req.body.text || '';
        const bodyHtml = req.body.html || '';
        const boundary = `boundary_${crypto.randomBytes(16).toString('hex')}`;
        rawMime = [
          `From: ${from}`,
          `To: ${to.join(', ')}`,
          `Subject: ${subject}`,
          `Date: ${new Date().toUTCString()}`,
          `Message-ID: <${crypto.randomUUID()}@inbound.cloudflare.eazzio.mail>`,
          `MIME-Version: 1.0`,
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          ``,
          `--${boundary}`,
          `Content-Type: text/plain; charset=utf-8`,
          ``,
          bodyText,
          ``,
          `--${boundary}`,
          `Content-Type: text/html; charset=utf-8`,
          ``,
          bodyHtml || `<p>${bodyText}</p>`,
          ``,
          `--${boundary}--`,
        ].join('\r\n');
      }
    } else if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
      rawMime = req.body;
      // Extract from & to headers from raw MIME
      const headerText = rawMime.toString().slice(0, 4000);
      const fromMatch = headerText.match(/^From:\s*(.+)$/im);
      const toMatch = headerText.match(/^To:\s*(.+)$/im);
      from = fromMatch && fromMatch[1] ? fromMatch[1].trim() : 'unknown@cloudflare.route';
      to = toMatch && toMatch[1] ? [toMatch[1].trim()] : ['inbox@eazzio.com'];
    }

    if (!from || to.length === 0 || !to[0]) {
      throw new AppError('VALIDATION_ERROR', 'Missing required from or to recipient', 400);
    }

    // Clean address format
    const cleanFrom = from.replace(/.*<([^>]+)>.*/, '$1').trim();
    const cleanTo = to.map((t) => t.replace(/.*<([^>]+)>.*/, '$1').trim());

    // 3. Inject into LMTP daemon for full security pipeline & PostgreSQL persistence
    const ingestedId = await injectToLmtp(cleanFrom, cleanTo, rawMime);

    res.status(200).json({
      success: true,
      data: {
        status: 'delivered',
        messageId: ingestedId,
        from: cleanFrom,
        to: cleanTo,
        receivedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});
