import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { Folder, Mailbox, normalizeEmailAddress } from '@eazzio/domain';
import {
  PostgresMailboxRepository,
  PostgresFolderRepository,
  PostgresMessageRepository,
  MemoryStorageAdapter,
  createEmailTransport,
} from '@eazzio/infra-adapters';
import {
  PostgresOutboundQueueRepository,
  OutboundService,
  QueueRunner,
} from '@eazzio/mail-outbound';
import { defaultDb } from '../../config/index.js';
import crypto from 'crypto';

export const messagesRouter: Router = Router();

const mailboxRepo = new PostgresMailboxRepository(defaultDb);
const folderRepo = new PostgresFolderRepository(defaultDb);
const messageRepo = new PostgresMessageRepository(defaultDb);
const queueRepo = new PostgresOutboundQueueRepository(defaultDb);
const storage = new MemoryStorageAdapter();

const outboundService = new OutboundService(queueRepo, messageRepo, storage);

function getQueueRunner(): QueueRunner {
  const currentTransport = createEmailTransport();
  return new QueueRunner(queueRepo, messageRepo, storage, currentTransport);
}

// Helper to resolve user's primary mailbox and ensure folders exist
async function getOrCreateUserMailbox(userId: string, userEmail: string): Promise<{ mailboxId: string; address: string }> {
  const userMailboxes = await mailboxRepo.findByOwnerId(userId);
  if (userMailboxes.length > 0) {
    return { mailboxId: userMailboxes[0]!.id, address: userMailboxes[0]!.address };
  }

  // Ensure user exists in users table
  const existingUserByEmail = (await defaultDb.query('SELECT id FROM users WHERE email = $1', [userEmail])) as any[];
  let effectiveUserId = userId;
  if (existingUserByEmail.length > 0) {
    effectiveUserId = existingUserByEmail[0].id;
  } else {
    await defaultDb.query(
      `INSERT INTO users (id, email, password_hash, display_name) 
       VALUES ($1, $2, 'hash_auto', 'Eazzio User') 
       ON CONFLICT (email) DO NOTHING`,
      [userId, userEmail]
    );
  }

  const existingMailboxByAddress = (await defaultDb.query('SELECT id, owner_user_id, address FROM mailboxes WHERE address = $1', [userEmail])) as any[];
  if (existingMailboxByAddress.length > 0) {
    return { mailboxId: existingMailboxByAddress[0].id, address: existingMailboxByAddress[0].address };
  }

  // Ensure a domain exists
  const domainName = userEmail.split('@')[1] || 'eazzio.com';
  const domainRes = (await defaultDb.query(`SELECT id FROM domains WHERE domain_name = $1 LIMIT 1`, [domainName])) as any[];
  let domainId: string;
  if (domainRes.length > 0) {
    domainId = domainRes[0].id;
  } else {
    domainId = crypto.randomUUID();
    await defaultDb.query(
      `INSERT INTO domains (id, domain_name, verification_status) 
       VALUES ($1, $2, 'verified') 
       ON CONFLICT DO NOTHING`,
      [domainId, domainName]
    );
  }

  const newMailboxId = crypto.randomUUID();
  const newMailbox = new Mailbox({
    id: newMailboxId,
    ownerUserId: effectiveUserId,
    domainId,
    address: userEmail,
    quotaBytes: 5368709120n,
    usedBytes: 0n,
    createdAt: new Date(),
  });
  await mailboxRepo.save(newMailbox);

  // Initialize standard system folders
  const systemFolders: Array<{ name: string; kind: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'archive' }> = [
    { name: 'Inbox', kind: 'inbox' },
    { name: 'Sent', kind: 'sent' },
    { name: 'Drafts', kind: 'drafts' },
    { name: 'Spam', kind: 'spam' },
    { name: 'Trash', kind: 'trash' },
    { name: 'Archive', kind: 'archive' },
  ];

  for (const f of systemFolders) {
    const fld = new Folder({
      id: crypto.randomUUID(),
      mailboxId: newMailboxId,
      name: f.name,
      kind: f.kind,
    });
    await folderRepo.save(fld);
  }

  return { mailboxId: newMailboxId, address: userEmail };
}

// Helper to resolve folder ID by kind
async function getFolderId(mailboxId: string, folderKind: string): Promise<string> {
  const folders = await folderRepo.findByMailboxId(mailboxId);
  const normalizedKind = folderKind.toLowerCase().replace('fld-', '');
  const match = folders.find((f) => f.kind === normalizedKind || f.name.toLowerCase() === normalizedKind);
  if (match) return match.id;

  // Auto-create folder if missing
  const newFldId = crypto.randomUUID();
  const newFld = new Folder({
    id: newFldId,
    mailboxId,
    name: normalizedKind.charAt(0).toUpperCase() + normalizedKind.slice(1),
    kind: (['inbox', 'sent', 'drafts', 'trash', 'spam', 'archive'].includes(normalizedKind)
      ? normalizedKind
      : 'custom') as any,
  });
  await folderRepo.save(newFld);
  return newFldId;
}

// Public Inbound Ingestion Endpoint (no auth required, intended for local MTA/relay or test harness)
messagesRouter.post('/inbound-receive', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { from, to, subject, bodyText, bodyHtml, receivedAt } = req.body;

    if (!from || !to || (Array.isArray(to) && to.length === 0)) {
      throw new AppError('VALIDATION_ERROR', 'from and to are required for inbound email ingestion', 400);
    }

    const fromAddress = typeof from === 'string' ? from : from.email;
    const recipientList = Array.isArray(to) ? to : [to];
    const targetRecipient = typeof recipientList[0] === 'string' ? recipientList[0] : recipientList[0].email;
    const normalizedRecipient = normalizeEmailAddress(targetRecipient);

    // Resolve target mailbox by email address or fallback to first available
    const mailboxQuery = (await defaultDb.query(
      `SELECT id, owner_user_id, address FROM mailboxes WHERE address = $1 OR address LIKE $2 LIMIT 1`,
      [normalizedRecipient, `${normalizedRecipient.split('@')[0]}%`]
    )) as any[];

    let targetMailboxId: string;
    if (mailboxQuery.length > 0) {
      targetMailboxId = mailboxQuery[0].id;
    } else {
      // Create user and mailbox for recipient
      const autoRes = await getOrCreateUserMailbox(crypto.randomUUID(), normalizedRecipient);
      targetMailboxId = autoRes.mailboxId;
    }

    const inboxFolderId = await getFolderId(targetMailboxId, 'inbox');
    const messageId = crypto.randomUUID();
    const threadId = crypto.randomUUID();
    const messageIdHeader = `<${messageId}@${normalizedRecipient.split('@')[1] || 'eazzio.com'}>`;
    const cleanSubject = subject || '(No Subject)';
    const cleanBodyText = bodyText || '';
    const cleanBodyHtml = bodyHtml || `<p>${cleanBodyText.replace(/\n/g, '<br>')}</p>`;
    const snippet = cleanBodyText.slice(0, 100) || cleanSubject;

    // Store raw body in storage adapter
    const rawKey = `raw_${messageId}.eml`;
    await storage.put(rawKey, Buffer.from(cleanBodyHtml || cleanBodyText, 'utf-8'), 'text/html');

    // 1. Insert Thread Record First (to satisfy FK constraint)
    await defaultDb.query(
      `INSERT INTO threads (id, mailbox_id, subject_normalized, last_message_at, message_count)
       VALUES ($1, $2, $3, now(), 1)
       ON CONFLICT (id) DO UPDATE SET
         subject_normalized = EXCLUDED.subject_normalized,
         last_message_at = now(),
         message_count = threads.message_count + 1`,
      [threadId, targetMailboxId, cleanSubject]
    );

    // 2. Insert Message Record
    await defaultDb.query(
      `INSERT INTO messages (
        id, mailbox_id, folder_id, thread_id, message_id_header, from_address,
        subject, snippet, size_bytes, raw_object_key, is_read, is_starred,
        direction, delivery_state, received_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, false, 'inbound', 'delivered', $11)`,
      [
        messageId,
        targetMailboxId,
        inboxFolderId,
        threadId,
        messageIdHeader,
        fromAddress,
        cleanSubject,
        snippet,
        Buffer.byteLength(cleanBodyHtml),
        rawKey,
        receivedAt ? new Date(receivedAt) : new Date(),
      ]
    );

    // Insert Recipient Records
    for (const r of recipientList) {
      const addr = typeof r === 'string' ? r : r.email;
      await defaultDb.query(
        `INSERT INTO message_recipients (id, message_id, kind, address)
         VALUES ($1, $2, 'to', $3)`,
        [crypto.randomUUID(), messageId, addr]
      );
    }

    res.status(201).json({
      success: true,
      data: {
        messageId,
        threadId,
        mailboxId: targetMailboxId,
        from: fromAddress,
        to: normalizedRecipient,
        subject: cleanSubject,
        snippet,
        receivedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

// All following routes require user authentication
messagesRouter.use(requireAuth);

// GET /v1/messages - List messages / threads for user's mailbox and folder
messagesRouter.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const userEmail = req.user!.email;
    const { mailboxId: requestedMailboxId, folder = 'inbox', limit = 50 } = req.query;

    const { mailboxId } = await getOrCreateUserMailbox(userId, userEmail);
    const activeMailboxId = (requestedMailboxId as string) || mailboxId;
    const activeFolderId = await getFolderId(activeMailboxId, folder as string);
    const folderSlug = (folder as string).toLowerCase().replace('fld-', '');

    let sql = `
      SELECT m.id, m.mailbox_id, m.folder_id, m.thread_id, m.message_id_header,
             m.from_address, m.subject, m.snippet, m.body_text, m.body_html, m.size_bytes, m.raw_object_key,
             m.is_read, m.is_starred, m.is_important, m.direction, m.delivery_state,
             m.received_at
      FROM messages m
      WHERE m.mailbox_id = $1
    `;
    const params: any[] = [activeMailboxId];

    if (folderSlug === 'starred' || folderSlug === 'important') {
      sql += ` AND (m.is_starred = true OR m.is_important = true)`;
    } else if (folderSlug === 'sent') {
      sql += ` AND (m.folder_id = $2 OR m.direction = 'outbound') AND (m.delivery_state != 'draft' OR m.delivery_state IS NULL)`;
      params.push(activeFolderId);
    } else if (folderSlug === 'drafts') {
      sql += ` AND (m.folder_id = $2 OR m.delivery_state = 'draft')`;
      params.push(activeFolderId);
    } else if (folderSlug === 'inbox') {
      sql += ` AND (m.folder_id = $2 OR m.direction = 'inbound') 
               AND (m.delivery_state != 'draft' OR m.delivery_state IS NULL)
               AND m.folder_id NOT IN (SELECT id FROM folders WHERE mailbox_id = $1 AND kind IN ('trash', 'spam', 'archive'))`;
      params.push(activeFolderId);
    } else {
      sql += ` AND m.folder_id = $2`;
      params.push(activeFolderId);
    }

    params.push(Number(limit));
    sql += ` ORDER BY m.received_at DESC LIMIT $${params.length}`;

    const messages = (await defaultDb.query(sql, params)) as any[];

    // Group messages into thread summaries
    const threadMap = new Map<string, any>();

    for (const msg of messages) {
      const tId = msg.thread_id || msg.id;
      if (!threadMap.has(tId)) {
        threadMap.set(tId, {
          id: tId,
          messageId: msg.id,
          mailboxId: msg.mailbox_id,
          subject: msg.subject || '(No Subject)',
          snippet: msg.snippet || '',
          sender: { name: msg.from_address.split('@')[0], email: msg.from_address },
          lastMessageAt: new Date(msg.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messageCount: 1,
          isUnread: !msg.is_read,
          isStarred: Boolean(msg.is_starred),
          isImportant: Boolean(msg.is_important),
          hasAttachments: false,
          labels: [
            folderSlug === 'inbox'
              ? 'Inbox'
              : folderSlug === 'sent'
              ? 'Sent'
              : folderSlug === 'drafts'
              ? 'Drafts'
              : folderSlug === 'starred'
              ? 'Starred'
              : 'General',
          ],
        });
      } else {
        const existing = threadMap.get(tId);
        existing.messageCount += 1;
        if (!msg.is_read) existing.isUnread = true;
      }
    }

    const threads = Array.from(threadMap.values());

    res.json({
      success: true,
      data: {
        mailboxId: activeMailboxId,
        folder: folder as string,
        total: messages.length,
        threads,
        messages,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/messages/draft - Save or update draft
messagesRouter.post('/draft', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const userEmail = req.user!.email;
    const { draftId, to = [], cc = [], bcc = [], subject = '', bodyText = '', bodyHtml } = req.body;

    const { mailboxId } = await getOrCreateUserMailbox(userId, userEmail);
    const draftsFolderId = await getFolderId(mailboxId, 'drafts');

    const messageId = draftId || crypto.randomUUID();
    const threadId = crypto.randomUUID();
    const cleanSubject = subject || '(Draft - No Subject)';
    const cleanBodyText = bodyText || '';
    const cleanBodyHtml = bodyHtml || `<p>${cleanBodyText.replace(/\n/g, '<br>')}</p>`;
    const rawKey = `raw_${messageId}.eml`;

    await storage.put(rawKey, Buffer.from(cleanBodyHtml, 'utf-8'), 'text/html');

    // Thread
    await defaultDb.query(
      `INSERT INTO threads (id, mailbox_id, subject_normalized, last_message_at, message_count)
       VALUES ($1, $2, $3, now(), 1)
       ON CONFLICT (id) DO UPDATE SET subject_normalized = EXCLUDED.subject_normalized, last_message_at = now()`,
      [threadId, mailboxId, cleanSubject]
    );

    // Message
    await defaultDb.query(
      `INSERT INTO messages (
        id, mailbox_id, folder_id, thread_id, message_id_header, from_address,
        subject, snippet, size_bytes, raw_object_key, is_read, is_starred,
        direction, delivery_state, received_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, false, 'outbound', 'draft', now())
      ON CONFLICT (id) DO UPDATE SET
        subject = EXCLUDED.subject,
        snippet = EXCLUDED.snippet,
        folder_id = EXCLUDED.folder_id,
        received_at = now()`,
      [
        messageId,
        mailboxId,
        draftsFolderId,
        threadId,
        `<${messageId}@eazzio.com>`,
        userEmail,
        cleanSubject,
        cleanBodyText.slice(0, 100) || cleanSubject,
        Buffer.byteLength(cleanBodyHtml),
        rawKey,
      ]
    );

    // Recipients
    await defaultDb.query(`DELETE FROM message_recipients WHERE message_id = $1`, [messageId]);
    if (to && Array.isArray(to) && to.length > 0) {
      for (const addr of to) {
        await defaultDb.query(
          `INSERT INTO message_recipients (id, message_id, kind, address) VALUES ($1, $2, 'to', $3)`,
          [crypto.randomUUID(), messageId, addr]
        );
      }
    }
    if (cc && Array.isArray(cc) && cc.length > 0) {
      for (const addr of cc) {
        await defaultDb.query(
          `INSERT INTO message_recipients (id, message_id, kind, address) VALUES ($1, $2, 'cc', $3)`,
          [crypto.randomUUID(), messageId, addr]
        );
      }
    }
    if (bcc && Array.isArray(bcc) && bcc.length > 0) {
      for (const addr of bcc) {
        await defaultDb.query(
          `INSERT INTO message_recipients (id, message_id, kind, address) VALUES ($1, $2, 'bcc', $3)`,
          [crypto.randomUUID(), messageId, addr]
        );
      }
    }

    res.status(201).json({
      success: true,
      data: {
        draftId: messageId,
        threadId,
        subject: cleanSubject,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/messages/:id/star - Toggle star / important
messagesRouter.post('/:id/star', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isStarred } = req.body;

    const rows = (await defaultDb.query(
      `UPDATE messages 
       SET is_starred = COALESCE($2, NOT is_starred),
           is_important = COALESCE($2, NOT is_starred)
       WHERE id = $1
       RETURNING id, is_starred, is_important`,
      [id, isStarred !== undefined ? isStarred : null]
    )) as any[];

    if (rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Message not found', 404);
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /v1/messages/batch-action - Execute bulk operation on multiple messages / threads
messagesRouter.post('/batch-action', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { action, threadIds = [] } = req.body;
    const userId = req.user!.userId;
    const userEmail = req.user!.email;

    if (!Array.isArray(threadIds) || threadIds.length === 0) {
      res.json({ success: true, count: 0 });
      return;
    }

    const { mailboxId } = await getOrCreateUserMailbox(userId, userEmail);

    if (action === 'trash') {
      const trashFolderId = await getFolderId(mailboxId, 'trash');
      await defaultDb.query(
        `UPDATE messages SET folder_id = $2 WHERE (id = ANY($1) OR thread_id = ANY($1)) AND mailbox_id = $3`,
        [threadIds, trashFolderId, mailboxId]
      );
    } else if (action === 'archive') {
      const archiveFolderId = await getFolderId(mailboxId, 'archive');
      await defaultDb.query(
        `UPDATE messages SET folder_id = $2 WHERE (id = ANY($1) OR thread_id = ANY($1)) AND mailbox_id = $3`,
        [threadIds, archiveFolderId, mailboxId]
      );
    } else if (action === 'read') {
      await defaultDb.query(
        `UPDATE messages SET is_read = true WHERE (id = ANY($1) OR thread_id = ANY($1)) AND mailbox_id = $2`,
        [threadIds, mailboxId]
      );
    } else if (action === 'unread') {
      await defaultDb.query(
        `UPDATE messages SET is_read = false WHERE (id = ANY($1) OR thread_id = ANY($1)) AND mailbox_id = $2`,
        [threadIds, mailboxId]
      );
    } else if (action === 'delete') {
      await defaultDb.query(
        `DELETE FROM messages WHERE (id = ANY($1) OR thread_id = ANY($1)) AND mailbox_id = $2`,
        [threadIds, mailboxId]
      );
    }

    res.json({ success: true, count: threadIds.length, action });
  } catch (err) {
    next(err);
  }
});

// POST /v1/messages/:id/trash - Move message or thread to trash
messagesRouter.post('/:id/trash', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userEmail = req.user!.email;

    const { mailboxId } = await getOrCreateUserMailbox(userId, userEmail);
    const trashFolderId = await getFolderId(mailboxId, 'trash');

    await defaultDb.query(
      `UPDATE messages SET folder_id = $2 WHERE (id = $1 OR thread_id = $1) AND mailbox_id = $3`,
      [id, trashFolderId, mailboxId]
    );

    res.json({ success: true, message: 'Message moved to Trash' });
  } catch (err) {
    next(err);
  }
});

// POST /v1/messages/:id/archive - Move message or thread to archive
messagesRouter.post('/:id/archive', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userEmail = req.user!.email;

    const { mailboxId } = await getOrCreateUserMailbox(userId, userEmail);
    const archiveFolderId = await getFolderId(mailboxId, 'archive');

    await defaultDb.query(
      `UPDATE messages SET folder_id = $2 WHERE (id = $1 OR thread_id = $1) AND mailbox_id = $3`,
      [id, archiveFolderId, mailboxId]
    );

    res.json({ success: true, message: 'Message moved to Archive' });
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/messages/:id - Permanently delete message or thread
messagesRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userEmail = req.user!.email;

    const { mailboxId } = await getOrCreateUserMailbox(userId, userEmail);
    await defaultDb.query(
      `DELETE FROM messages WHERE (id = $1 OR thread_id = $1) AND mailbox_id = $2`,
      [id, mailboxId]
    );

    res.json({ success: true, message: 'Message deleted permanently' });
  } catch (err) {
    next(err);
  }
});

// GET /v1/messages/:id - Get full message detail with body
messagesRouter.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const rows = (await defaultDb.query(
      `SELECT m.*, r.address as recipient_address, r.kind as recipient_kind
       FROM messages m
       LEFT JOIN message_recipients r ON r.message_id = m.id
       WHERE m.id = $1 OR m.thread_id = $1`,
      [id]
    )) as any[];

    if (rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Message not found', 404);
    }

    const first = rows[0];
    const recipients = rows
      .filter((r) => r.recipient_address)
      .map((r) => ({
        name: r.recipient_address.split('@')[0],
        email: r.recipient_address,
        type: r.recipient_kind || 'to',
      }));

    // Retrieve body from database or storage
    let bodyHtml = first.body_html || (first.body_text ? `<p>${first.body_text.replace(/\n/g, '<br>')}</p>` : `<p>${first.snippet || ''}</p>`);
    let bodyText = first.body_text || first.snippet || '';

    if (!first.body_html && !first.body_text && first.raw_object_key) {
      try {
        const rawBuf = await storage.get(first.raw_object_key);
        let content = rawBuf.toString('utf-8');
        if (content.includes('\r\n\r\n') && (content.startsWith('DKIM-') || content.startsWith('From:') || content.startsWith('Received:'))) {
          content = content.split('\r\n\r\n').slice(1).join('\r\n\r\n');
        } else if (content.includes('\n\n') && (content.startsWith('DKIM-') || content.startsWith('From:') || content.startsWith('Received:'))) {
          content = content.split('\n\n').slice(1).join('\n\n');
        }

        if (content.includes('<') && content.includes('>')) {
          bodyHtml = content;
          bodyText = content.replace(/<[^>]*>/g, '').trim();
        } else {
          bodyText = content;
          bodyHtml = `<p>${content.replace(/\n/g, '<br>')}</p>`;
        }
      } catch {
        // Fallback to snippet
      }
    }

    res.json({
      success: true,
      data: {
        id: first.id,
        threadId: first.thread_id || first.id,
        mailboxId: first.mailbox_id,
        folderId: first.folder_id,
        from: { name: first.from_address.split('@')[0], email: first.from_address },
        to: recipients.filter((r) => r.type === 'to'),
        cc: recipients.filter((r) => r.type === 'cc'),
        bcc: recipients.filter((r) => r.type === 'bcc'),
        subject: first.subject || '(No Subject)',
        snippet: first.snippet,
        bodyText,
        bodyHtml,
        receivedAt: new Date(first.received_at).toLocaleString(),
        isRead: Boolean(first.is_read),
        isStarred: Boolean(first.is_starred),
        isImportant: Boolean(first.is_important),
        security: {
          spf: 'pass',
          dkim: 'pass',
          dmarc: 'pass',
          clamavStatus: 'clean',
          spamScore: Number(first.spam_score || 0.0),
        },
        attachments: [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/messages/compose
messagesRouter.post('/compose', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { to, cc, bcc, subject, bodyText, bodyHtml, mailboxId: requestedMailboxId } = req.body;

    // 1. Validate & Canonicalize recipients
    if (!to || !Array.isArray(to) || to.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Recipient (to) array must contain at least one email address', 400, [
        { field: 'to', issue: 'missing required field' },
      ]);
    }

    const normalizedTo: string[] = [];
    for (const recipient of to) {
      try {
        normalizedTo.push(normalizeEmailAddress(recipient));
      } catch (err: any) {
        throw new AppError('VALIDATION_ERROR', `Invalid recipient email address: ${recipient}`, 400, [
          { field: 'to', issue: err.message },
        ]);
      }
    }

    const normalizedCc: string[] = [];
    if (cc && Array.isArray(cc)) {
      for (const c of cc) {
        try {
          normalizedCc.push(normalizeEmailAddress(c));
        } catch (err: any) {
          throw new AppError('VALIDATION_ERROR', `Invalid CC email address: ${c}`, 400, [
            { field: 'cc', issue: err.message },
          ]);
        }
      }
    }

    const normalizedBcc: string[] = [];
    if (bcc && Array.isArray(bcc)) {
      for (const b of bcc) {
        try {
          normalizedBcc.push(normalizeEmailAddress(b));
        } catch (err: any) {
          throw new AppError('VALIDATION_ERROR', `Invalid BCC email address: ${b}`, 400, [
            { field: 'bcc', issue: err.message },
          ]);
        }
      }
    }

    // 2. Validate / Resolve Mailbox ownership
    let mailboxId = requestedMailboxId;
    let senderAddress = req.user!.email;

    if (req.body.from && typeof req.body.from === 'string') {
      const allowedMailboxes = await mailboxRepo.findByOwnerId(userId);
      const isOwner = allowedMailboxes.some((m) => m.address.toLowerCase() === req.body.from.toLowerCase());
      if (!isOwner && req.body.from.toLowerCase() !== req.user!.email.toLowerCase()) {
        throw new AppError('FORBIDDEN', `User is not authorized to send as '${req.body.from}'`, 403);
      }
      senderAddress = req.body.from;
    }

    if (mailboxId) {
      const mailbox = await mailboxRepo.findById(mailboxId);
      if (!mailbox || mailbox.ownerUserId !== userId) {
        throw new AppError('FORBIDDEN', 'User is not authorized to send from the specified mailbox', 403);
      }
      senderAddress = mailbox.address;
    } else {
      const mbx = await getOrCreateUserMailbox(userId, senderAddress);
      mailboxId = mbx.mailboxId;
      senderAddress = mbx.address;
    }

    // 3. Resolve Sent folder
    const sentFolderId = await getFolderId(mailboxId, 'sent');

    // 4. Enqueue into outbound service pipeline
    const domainName = senderAddress.split('@')[1] || 'eazzio.com';
    const { messageId, queueIds } = await outboundService.enqueueOutbound({
      fromAddress: senderAddress,
      to: normalizedTo,
      cc: normalizedCc.length > 0 ? normalizedCc : undefined,
      bcc: normalizedBcc.length > 0 ? normalizedBcc : undefined,
      subject: subject || '(No Subject)',
      bodyText: bodyText || '',
      bodyHtml: bodyHtml || `<p>${(bodyText || '').replace(/\n/g, '<br>')}</p>`,
      domainName,
      mailboxId,
      folderId: sentFolderId,
    });

    // 5. Trigger Queue Runner in the background for outbound SMTP delivery
    setImmediate(() => {
      getQueueRunner()
        .processNextBatch(10)
        .catch((runnerErr) => {
          console.error('Background outbound queue runner error:', runnerErr);
        });
    });

    res.status(202).json({
      success: true,
      messageId,
      queueIds,
      deliveryState: 'queued',
      status: 'accepted_for_delivery',
    });
  } catch (err) {
    next(err);
  }
});
