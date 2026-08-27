import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  InboundPipeline,
  InboundProviderFactory,
  MailSyncService,
  MimeParser,
} from '@eazzio/mail-inbound';
import {
  PostgresDomainRepository,
  PostgresMailboxRepository,
  PostgresFolderRepository,
  PostgresMessageRepository,
  PostgresThreadRepository,
  PostgresFilterRepository,
  PostgresLabelRepository,
  EazzioStorage,
  MemoryStorageAdapter,
} from '@eazzio/infra-adapters';
import { defaultDb } from '../../config/index.js';
import { AppError } from '../../middleware/error-handler.js';
import { wsGateway } from '../../server.js';

export const mailSyncRouter: Router = Router();

// 1. Domain repositories for the inbound pipeline
const domainRepo = new PostgresDomainRepository(defaultDb);
const mailboxRepo = new PostgresMailboxRepository(defaultDb);
const folderRepo = new PostgresFolderRepository(defaultDb);
const messageRepo = new PostgresMessageRepository(defaultDb);
const threadRepo = new PostgresThreadRepository(defaultDb);
const filterRepo = new PostgresFilterRepository(defaultDb);
const labelRepo = new PostgresLabelRepository(defaultDb);
const storage: EazzioStorage = new MemoryStorageAdapter();

export const pipeline = new InboundPipeline(
  domainRepo,
  mailboxRepo,
  folderRepo,
  messageRepo,
  threadRepo,
  storage,
  undefined, // Rspamd
  undefined, // ClamAV
  filterRepo,
  labelRepo
);

const provider = InboundProviderFactory.createProvider();
const syncService = new MailSyncService(pipeline, provider);

// Helper: Broadcast WebSocket Event to Connected Clients
function broadcastRealtimeNotification(mailboxId: string, eventData: any) {
  try {
    if (wsGateway) {
      wsGateway.broadcastAll({
        type: 'mail.received',
        mailboxId,
        data: {
          threadId: eventData.threadId,
          messageId: eventData.messageId,
          from: eventData.from,
          subject: eventData.subject,
          snippet: eventData.snippet,
          receivedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hasAttachments: eventData.hasAttachments || false,
          labels: ['Inbox'],
        },
      });
    }
  } catch (err) {
    console.warn('Realtime broadcast notification warning:', err);
  }
}

/**
 * 1. GET /v1/mail/inbound/status
 * Diagnostic status of the inbound subsystem
 */
mailSyncRouter.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const testResult = await provider.testConnection();
    const hasPassword = Boolean(process.env.INBOUND_MAIL_PASSWORD || process.env.GODADDY_IMAP_PASS);

    res.json({
      success: true,
      data: {
        provider: provider.providerName,
        webhookIngress: 'READY',
        lmtpEngine: 'LISTENING',
        goDaddyImap: hasPassword ? 'CONFIGURED' : 'BLOCKED — mailbox credentials unavailable',
        pipeline: 'OPERATIONAL',
        connectionDetails: testResult,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 2. POST /v1/mail/inbound/webhook
 * Production Inbound Webhook Endpoint
 * Supports raw RFC 822 MIME byte streams (message/rfc822) or structured JSON (Cloudflare Worker push)
 */
mailSyncRouter.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Security: Verify Webhook Secret if configured
    const expectedSecret = process.env.INBOUND_WEBHOOK_SECRET || process.env.CLOUDFLARE_WEBHOOK_SECRET;
    if (expectedSecret) {
      const providedSecret =
        req.headers['x-inbound-secret'] ||
        req.headers['x-cloudflare-secret'] ||
        req.headers['authorization']?.replace(/^Bearer\s+/i, '');

      if (!providedSecret || providedSecret !== expectedSecret) {
        throw new AppError('UNAUTHORIZED', 'Invalid or missing inbound webhook secret', 401);
      }
    }

    let rawBuffer: Buffer;
    let fromAddr = (req.headers['x-envelope-from'] as string) || '';
    let toAddrs: string[] = req.headers['x-envelope-to']
      ? [req.headers['x-envelope-to'] as string]
      : [];

    // 2. Parse payload type
    if (Buffer.isBuffer(req.body)) {
      rawBuffer = req.body;
    } else if (typeof req.body === 'string') {
      rawBuffer = Buffer.from(req.body, 'utf-8');
    } else if (typeof req.body === 'object' && req.body !== null) {
      if (req.body.rawMime) {
        rawBuffer = Buffer.isBuffer(req.body.rawMime)
          ? req.body.rawMime
          : Buffer.from(req.body.rawMime, 'utf-8');
      } else {
        // Construct standard MIME from JSON payload
        fromAddr = req.body.from || req.body.sender || fromAddr || 'sender@external.com';
        toAddrs = Array.isArray(req.body.to) ? req.body.to : [req.body.to || req.body.recipient || 'rahulkumar@eazzio.com'];
        const subject = req.body.subject || '(No Subject)';
        const bodyText = req.body.bodyText || req.body.text || '';
        const bodyHtml = req.body.bodyHtml || req.body.html || `<p>${bodyText.replace(/\n/g, '<br>')}</p>`;
        const boundary = `bnd_${crypto.randomBytes(12).toString('hex')}`;
        const messageId = req.body.messageId || `<${crypto.randomUUID()}@inbound.webhook.eazzio.com>`;

        const mimeLines = [
          `From: ${fromAddr}`,
          `To: ${toAddrs.join(', ')}`,
          `Subject: ${subject}`,
          `Date: ${new Date().toUTCString()}`,
          `Message-ID: ${messageId}`,
          req.body.inReplyTo ? `In-Reply-To: ${req.body.inReplyTo}` : '',
          req.body.references ? `References: ${req.body.references}` : '',
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
          bodyHtml,
          ``,
          `--${boundary}--`,
        ].filter(Boolean);

        rawBuffer = Buffer.from(mimeLines.join('\r\n'), 'utf-8');
      }

      if (!fromAddr && req.body.from) fromAddr = req.body.from;
      if (toAddrs.length === 0 && req.body.to) {
        toAddrs = Array.isArray(req.body.to) ? req.body.to : [req.body.to];
      }
    } else {
      throw new AppError('VALIDATION_ERROR', 'Unsupported webhook payload format', 400);
    }

    // 3. Fallback: Parse from & to from MIME headers if not in envelope
    if (!fromAddr || toAddrs.length === 0) {
      const parsedMime = await MimeParser.parse(rawBuffer);
      if (!fromAddr && parsedMime.from) fromAddr = parsedMime.from;
      if (toAddrs.length === 0 && parsedMime.to && parsedMime.to.length > 0) {
        toAddrs = parsedMime.to;
      }
    }

    if (!fromAddr || toAddrs.length === 0) {
      toAddrs = ['rahulkumar@eazzio.com'];
    }

    const envelope = {
      from: { value: fromAddr },
      to: toAddrs.map((addr: string) => ({ value: addr })),
      mailFrom: fromAddr,
      rcptTo: toAddrs,
      props: {
        envelopeFrom: fromAddr,
        envelopeTo: toAddrs,
        clientIp: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
        sizeBytes: rawBuffer.length,
      },
    } as any;

    // 4. Ingest via unified InboundPipeline
    const processResult = await pipeline.process({
      envelope,
      rawMime: rawBuffer,
      authResults: {
        spf: ((req.headers['x-cloudflare-spf'] as string) || 'pass') as any,
        dkim: ((req.headers['x-cloudflare-dkim'] as string) || 'pass') as any,
        dmarc: ((req.headers['x-cloudflare-dmarc'] as string) || 'pass') as any,
        fromDomain: fromAddr.split('@')[1] || 'external.com',
      },
    });

    if (processResult.status === 'REJECTED') {
      res.status(422).json({
        success: false,
        status: 'REJECTED',
        error: {
          code: processResult.event.reasonCode,
          detail: processResult.event.reasonDetail,
        },
      });
      return;
    }

    const acceptedEvent = processResult.event as any;
    const messageId = processResult.messageId;

    // 5. Look up created message in database to broadcast full payload
    const msgRows = (await defaultDb.query(
      `SELECT id, mailbox_id, thread_id, from_address, subject, snippet, received_at 
       FROM messages WHERE id = $1`,
      [messageId]
    )) as any[];

    if (msgRows.length > 0) {
      const row = msgRows[0];
      broadcastRealtimeNotification(row.mailbox_id, {
        threadId: row.thread_id,
        messageId: row.id,
        from: { name: row.from_address.split('@')[0], email: row.from_address },
        subject: row.subject,
        snippet: row.snippet,
        receivedAt: row.received_at,
        hasAttachments: false,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        status: processResult.status,
        messageId,
        threadId: msgRows[0]?.thread_id,
        duplicate: (processResult as any).duplicate || false,
        mailboxId: acceptedEvent.mailboxId,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 3. POST /v1/mail/inbound/test
 * Development Test Ingestion Endpoint
 * Accepts rich test email structure, generates valid RFC 822 MIME, and feeds the exact same pipeline
 */
mailSyncRouter.post('/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      from = 'kumarrahulraj468@gmail.com',
      to = ['rahulkumar@eazzio.com'],
      subject = 'Test Inbound Email',
      bodyText = 'Hello! This is a test incoming email.',
      bodyHtml,
      inReplyTo,
      references,
      attachments = [],
      messageId: customMessageId,
    } = req.body;

    const toList = Array.isArray(to) ? to : [to];
    const messageId = customMessageId || `<${crypto.randomUUID()}@inbound.test.eazzio.mail>`;
    const boundary = `mime_boundary_${crypto.randomBytes(12).toString('hex')}`;
    const altBoundary = `alt_boundary_${crypto.randomBytes(12).toString('hex')}`;
    const htmlContent = bodyHtml || `<p>${bodyText.replace(/\n/g, '<br>')}</p>`;

    let rawMimeString = '';

    if (attachments && attachments.length > 0) {
      // Multipart Mixed with attachments
      rawMimeString = [
        `From: ${from}`,
        `To: ${toList.join(', ')}`,
        `Subject: ${subject}`,
        `Date: ${new Date().toUTCString()}`,
        `Message-ID: ${messageId}`,
        inReplyTo ? `In-Reply-To: ${inReplyTo}` : '',
        references ? `References: ${references}` : '',
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
        ``,
        `--${altBoundary}`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        bodyText,
        ``,
        `--${altBoundary}`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        htmlContent,
        ``,
        `--${altBoundary}--`,
      ].filter(Boolean).join('\r\n');

      for (const att of attachments) {
        const attBase64 = att.contentBase64 || Buffer.from(att.content || 'attachment-content').toString('base64');
        rawMimeString += `\r\n--${boundary}\r\n` +
          `Content-Type: ${att.contentType || 'application/octet-stream'}\r\n` +
          `Content-Disposition: attachment; filename="${att.filename || 'attachment.txt'}"\r\n` +
          `Content-Transfer-Encoding: base64\r\n\r\n` +
          attBase64;
      }
      rawMimeString += `\r\n--${boundary}--\r\n`;
    } else {
      // Simple Multipart Alternative
      rawMimeString = [
        `From: ${from}`,
        `To: ${toList.join(', ')}`,
        `Subject: ${subject}`,
        `Date: ${new Date().toUTCString()}`,
        `Message-ID: ${messageId}`,
        inReplyTo ? `In-Reply-To: ${inReplyTo}` : '',
        references ? `References: ${references}` : '',
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
        htmlContent,
        ``,
        `--${boundary}--`,
      ].filter(Boolean).join('\r\n');
    }

    const rawBuffer = Buffer.from(rawMimeString, 'utf-8');

    const envelope = {
      from: { value: from },
      to: toList.map((addr: string) => ({ value: addr })),
      mailFrom: from,
      rcptTo: toList,
      props: {
        envelopeFrom: from,
        envelopeTo: toList,
        clientIp: '127.0.0.1',
        sizeBytes: rawBuffer.length,
      },
    } as any;

    const processResult = await pipeline.process({
      envelope,
      rawMime: rawBuffer,
      authResults: {
        spf: 'pass',
        dkim: 'pass',
        dmarc: 'pass',
        fromDomain: from.split('@')[1] || 'gmail.com',
      },
    });

    if (processResult.status === 'REJECTED') {
      res.status(422).json({
        success: false,
        status: 'REJECTED',
        error: {
          code: processResult.event.reasonCode,
          detail: processResult.event.reasonDetail,
        },
      });
      return;
    }

    const messageIdResult = processResult.messageId;
    const msgRows = (await defaultDb.query(
      `SELECT id, mailbox_id, thread_id, from_address, subject, snippet, received_at 
       FROM messages WHERE id = $1`,
      [messageIdResult]
    )) as any[];

    if (msgRows.length > 0) {
      const row = msgRows[0];
      broadcastRealtimeNotification(row.mailbox_id, {
        threadId: row.thread_id,
        messageId: row.id,
        from: { name: row.from_address.split('@')[0], email: row.from_address },
        subject: row.subject,
        snippet: row.snippet,
        receivedAt: row.received_at,
        hasAttachments: attachments.length > 0,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        status: processResult.status,
        messageId: messageIdResult,
        threadId: msgRows[0]?.thread_id,
        duplicate: (processResult as any).duplicate || false,
        subject,
        from,
        to: toList,
        hasAttachments: attachments.length > 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Alias: POST /v1/mail/inbound/test-inject
mailSyncRouter.post('/test-inject', (req, res, next) => {
  if (req.body?.rawMime !== undefined) {
    if (!req.body.rawMime || (typeof req.body.rawMime === 'string' && req.body.rawMime.trim() === '')) {
      res.status(400).json({ success: false, error: 'Empty rawMime' });
      return;
    }
    // Forward to webhook handler
    return (mailSyncRouter.stack.find((s) => s.route?.path === '/webhook')?.route?.stack[0]?.handle as any)(req, res, next);
  }
  // Otherwise forward to test handler
  return (mailSyncRouter.stack.find((s) => s.route?.path === '/test')?.route?.stack[0]?.handle as any)(req, res, next);
});

// 4. POST /v1/mail/inbound/sync - GoDaddy IMAP Provider Polling Trigger
mailSyncRouter.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hasPassword = Boolean(process.env.INBOUND_MAIL_PASSWORD || process.env.GODADDY_IMAP_PASS);
    if (!hasPassword) {
      res.status(200).json({
        success: false,
        data: {
          provider: 'godaddy',
          status: 'BLOCKED',
          message: 'GoDaddy IMAP sync: BLOCKED — mailbox credentials unavailable',
        },
      });
      return;
    }

    const folder = (req.body?.folder as string) || 'INBOX';
    const limit = Number(req.body?.limit || 50);
    const result = await syncService.sync(folder, limit);

    res.json({
      success: result.success,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});
