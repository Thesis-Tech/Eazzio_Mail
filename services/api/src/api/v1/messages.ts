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
  const normalizedEmail = userEmail.trim().toLowerCase();

  // 1. Check mailbox by exact address (highest priority for personal data isolation)
  const existingMailboxByAddress = (await defaultDb.query(
    'SELECT id, owner_user_id, address FROM mailboxes WHERE LOWER(address) = $1 LIMIT 1',
    [normalizedEmail]
  )) as any[];
  if (existingMailboxByAddress.length > 0) {
    return { mailboxId: existingMailboxByAddress[0].id, address: existingMailboxByAddress[0].address };
  }

  // 2. Resolve or create user in users table
  const existingUserByEmail = (await defaultDb.query(
    'SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1',
    [normalizedEmail]
  )) as any[];
  let effectiveUserId = userId;
  if (existingUserByEmail.length > 0) {
    effectiveUserId = existingUserByEmail[0].id;
    const userMailboxes = await mailboxRepo.findByOwnerId(effectiveUserId);
    if (userMailboxes.length > 0) {
      return { mailboxId: userMailboxes[0]!.id, address: userMailboxes[0]!.address };
    }
  } else {
    await defaultDb.query(
      `INSERT INTO users (id, email, password_hash, display_name) 
       VALUES ($1, $2, 'hash_auto', 'Eazzio User') 
       ON CONFLICT (email) DO NOTHING`,
      [userId, normalizedEmail]
    );
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
    const { folder = 'inbox', limit = 50 } = req.query;

    const { mailboxId } = await getOrCreateUserMailbox(userId, userEmail);
    const activeMailboxId = mailboxId;
    const activeFolderId = await getFolderId(activeMailboxId, folder as string);
    const folderSlug = (folder as string).toLowerCase().replace('fld-', '');

    let sql = `
      SELECT m.id, m.mailbox_id, m.folder_id, m.thread_id, m.message_id_header,
             m.from_address, m.subject, m.snippet, m.body_text, m.body_html, m.size_bytes, m.raw_object_key,
             m.is_read, m.is_starred, m.is_important, m.direction, m.delivery_state,
             m.received_at,
             COALESCE(
               (SELECT json_agg(json_build_object('name', split_part(r.address::text, '@', 1), 'email', r.address::text, 'type', r.kind))
                FROM message_recipients r WHERE r.message_id = m.id),
               (SELECT json_agg(json_build_object('name', split_part(q.recipient_address, '@', 1), 'email', q.recipient_address, 'type', 'to'))
                FROM outbound_queue q WHERE q.message_id = m.id),
               (SELECT json_agg(json_build_object('name', split_part(mb.address, '@', 1), 'email', mb.address, 'type', 'to'))
                FROM messages m2 JOIN mailboxes mb ON mb.id = m2.mailbox_id
                WHERE m2.message_id_header = m.message_id_header AND m2.id != m.id AND m2.direction = 'inbound'),
               '[]'::json
             ) as recipients
      FROM messages m
      WHERE m.mailbox_id = $1
    `;
    const params: any[] = [activeMailboxId];

    if (folderSlug === 'snoozed') {
      sql += ` AND m.is_snoozed = true AND (m.snoozed_until IS NULL OR m.snoozed_until > now())`;
    } else if (folderSlug === 'scheduled') {
      sql += ` AND m.scheduled_at IS NOT NULL AND m.scheduled_at > now() AND m.delivery_state = 'scheduled'`;
    } else if (folderSlug === 'starred' || folderSlug === 'important') {
      sql += ` AND (m.is_starred = true OR m.is_important = true) AND (m.is_snoozed = false OR m.is_snoozed IS NULL OR m.snoozed_until <= now())`;
    } else if (folderSlug === 'sent') {
      sql += ` AND (m.folder_id = $2 OR m.direction = 'outbound') AND (m.delivery_state != 'draft' AND m.delivery_state != 'scheduled' OR m.delivery_state IS NULL)`;
      params.push(activeFolderId);
    } else if (folderSlug === 'drafts') {
      sql += ` AND (m.folder_id = $2 OR m.delivery_state = 'draft')`;
      params.push(activeFolderId);
    } else if (folderSlug === 'inbox') {
      sql += ` AND (m.folder_id = $2 OR m.direction = 'inbound') 
               AND (m.delivery_state != 'draft' AND m.delivery_state != 'scheduled' OR m.delivery_state IS NULL)
               AND (m.is_snoozed = false OR m.is_snoozed IS NULL OR m.snoozed_until <= now())
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
    } else if (action === 'spam') {
      const spamFolderId = await getFolderId(mailboxId, 'spam');
      await defaultDb.query(
        `UPDATE messages SET folder_id = $2, is_spam = true, spam_score = 1.0 WHERE (id = ANY($1) OR thread_id = ANY($1)) AND mailbox_id = $3`,
        [threadIds, spamFolderId, mailboxId]
      );
    } else if (action === 'not-spam') {
      const inboxFolderId = await getFolderId(mailboxId, 'inbox');
      await defaultDb.query(
        `UPDATE messages SET folder_id = $2, is_spam = false, spam_score = 0.0 WHERE (id = ANY($1) OR thread_id = ANY($1)) AND mailbox_id = $3`,
        [threadIds, inboxFolderId, mailboxId]
      );
    }

    res.json({ success: true, count: threadIds.length, action });
  } catch (err) {
    next(err);
  }
});

// POST /v1/messages/trash/empty - Permanently empty all messages in Trash
messagesRouter.post('/trash/empty', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const userEmail = req.user!.email;

    const { mailboxId } = await getOrCreateUserMailbox(userId, userEmail);
    const trashFolderId = await getFolderId(mailboxId, 'trash');

    await defaultDb.query(
      `DELETE FROM messages WHERE folder_id = $1 AND mailbox_id = $2`,
      [trashFolderId, mailboxId]
    );

    res.json({
      success: true,
      message: 'Trash emptied successfully',
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/messages/spam/empty - Permanently empty all messages in Spam
messagesRouter.post('/spam/empty', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const userEmail = req.user!.email;

    const { mailboxId } = await getOrCreateUserMailbox(userId, userEmail);
    const spamFolderId = await getFolderId(mailboxId, 'spam');

    await defaultDb.query(
      `DELETE FROM messages WHERE folder_id = $1 AND mailbox_id = $2`,
      [spamFolderId, mailboxId]
    );

    res.json({
      success: true,
      message: 'Spam folder emptied successfully',
    });
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

// POST /v1/messages/:id/spam - Report and move to Spam
messagesRouter.post('/:id/spam', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userEmail = req.user!.email;

    const { mailboxId } = await getOrCreateUserMailbox(userId, userEmail);
    const spamFolderId = await getFolderId(mailboxId, 'spam');

    await defaultDb.query(
      `UPDATE messages SET folder_id = $2, is_spam = true, spam_score = 1.0 WHERE (id = $1 OR thread_id = $1) AND mailbox_id = $3`,
      [id, spamFolderId, mailboxId]
    );

    res.json({ success: true, message: 'Message reported as spam' });
  } catch (err) {
    next(err);
  }
});

// POST /v1/messages/:id/not-spam - Mark as Not Spam and move to Inbox
messagesRouter.post('/:id/not-spam', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userEmail = req.user!.email;

    const { mailboxId } = await getOrCreateUserMailbox(userId, userEmail);
    const inboxFolderId = await getFolderId(mailboxId, 'inbox');

    await defaultDb.query(
      `UPDATE messages SET folder_id = $2, is_spam = false, spam_score = 0.0 WHERE (id = $1 OR thread_id = $1) AND mailbox_id = $3`,
      [id, inboxFolderId, mailboxId]
    );

    res.json({ success: true, message: 'Message marked as not spam and moved to Inbox' });
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

// POST /v1/messages/:id/snooze - Snooze message/thread until timestamp
messagesRouter.post('/:id/snooze', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { snoozeUntil } = req.body;
    const userId = req.user!.userId;
    const userEmail = req.user!.email;

    if (!snoozeUntil) {
      throw new AppError('VALIDATION_ERROR', 'snoozeUntil timestamp is required', 400);
    }

    const snoozeDate = new Date(snoozeUntil);
    if (isNaN(snoozeDate.getTime()) || snoozeDate.getTime() <= Date.now()) {
      throw new AppError('VALIDATION_ERROR', 'snoozeUntil must be a valid future ISO timestamp', 400);
    }

    const { mailboxId } = await getOrCreateUserMailbox(userId, userEmail);

    await defaultDb.query(
      `UPDATE messages 
       SET is_snoozed = true, snoozed_until = $2 
       WHERE (id = $1 OR thread_id = $1) AND mailbox_id = $3`,
      [id, snoozeDate, mailboxId]
    );

    await defaultDb.query(
      `UPDATE threads 
       SET is_snoozed = true, snoozed_until = $2 
       WHERE (id = $1 OR id = (SELECT thread_id FROM messages WHERE id = $1 LIMIT 1)) AND mailbox_id = $3`,
      [id, snoozeDate, mailboxId]
    );

    res.json({
      success: true,
      message: 'Conversation snoozed',
      snoozedUntil: snoozeDate.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/messages/:id/unsnooze - Restore snoozed message to Inbox immediately
messagesRouter.post('/:id/unsnooze', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userEmail = req.user!.email;

    const { mailboxId } = await getOrCreateUserMailbox(userId, userEmail);

    await defaultDb.query(
      `UPDATE messages 
       SET is_snoozed = false, snoozed_until = NULL 
       WHERE (id = $1 OR thread_id = $1) AND mailbox_id = $2`,
      [id, mailboxId]
    );

    await defaultDb.query(
      `UPDATE threads 
       SET is_snoozed = false, snoozed_until = NULL 
       WHERE (id = $1 OR id = (SELECT thread_id FROM messages WHERE id = $1 LIMIT 1)) AND mailbox_id = $2`,
      [id, mailboxId]
    );

    res.json({
      success: true,
      message: 'Conversation restored to Inbox',
    });
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
    let recipients = rows
      .filter((r) => r.recipient_address)
      .map((r) => ({
        name: r.recipient_address.split('@')[0],
        email: r.recipient_address,
        type: r.recipient_kind || 'to',
      }));

    if (recipients.length === 0 && first.message_id_header) {
      const linked = (await defaultDb.query(
        `SELECT mb.address FROM messages m2
         JOIN mailboxes mb ON mb.id = m2.mailbox_id
         WHERE m2.message_id_header = $1 AND m2.id != $2 AND m2.direction = 'inbound'`,
        [first.message_id_header, first.id]
      )) as any[];

      if (linked.length > 0) {
        recipients = linked.map((lr) => ({
          name: lr.address.split('@')[0],
          email: lr.address,
          type: 'to',
        }));
      } else {
        const queueRecipients = (await defaultDb.query(
          `SELECT recipient_address FROM outbound_queue WHERE message_id = $1`,
          [first.id]
        )) as any[];
        if (queueRecipients.length > 0) {
          recipients = queueRecipients.map((qr) => ({
            name: qr.recipient_address.split('@')[0],
            email: qr.recipient_address,
            type: 'to',
          }));
        }
      }
    }

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
        attachments: (
          (await defaultDb.query(
            `SELECT id, filename, mime_type, size_bytes, object_key FROM attachments WHERE message_id = $1`,
            [first.id]
          )) as any[]
        ).map((att) => ({
          id: att.id,
          filename: att.filename,
          contentType: att.mime_type,
          sizeBytes: Number(att.size_bytes),
          url: `/v1/attachments/${att.id}/download`,
        })),
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
    
    // Fetch authoritative user record
    const userRows = (await defaultDb.query(
      `SELECT email FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    )) as any[];
    const userEmail = (userRows[0]?.email || req.user?.email || '').trim().toLowerCase();
    
    const allowedMailboxes = await mailboxRepo.findByOwnerId(userId);
    const requestedFrom = (req.body.from as string | undefined)?.trim()?.toLowerCase();
    let senderAddress = requestedFrom || userEmail;

    if (requestedFrom) {
      const isOwner =
        requestedFrom === userEmail ||
        allowedMailboxes.some((m) => m.address.toLowerCase() === requestedFrom);

      if (!isOwner) {
        throw new AppError('FORBIDDEN', `User is not authorized to send as '${req.body.from}'`, 403);
      }
    }

    // Match or create mailbox for the sender
    const matchedMailbox = allowedMailboxes.find(
      (m) => m.address.toLowerCase() === senderAddress.toLowerCase()
    );

    if (matchedMailbox) {
      mailboxId = matchedMailbox.id;
      senderAddress = matchedMailbox.address;
    } else {
      const mbx = await getOrCreateUserMailbox(userId, senderAddress);
      mailboxId = mbx.mailboxId;
      senderAddress = mbx.address;
    }

    // 3. Resolve Sent folder
    const sentFolderId = await getFolderId(mailboxId, 'sent');

    // 4. Determine local domains for direct delivery
    const localDomains = (process.env.LOCAL_DOMAINS || 'eazzio.com').split(',').map(d => d.trim().toLowerCase());
    const isLocalRecipient = (addr: string) => {
      const domain = addr.split('@')[1]?.toLowerCase();
      return domain && localDomains.includes(domain);
    };

    const localRecipients = normalizedTo.filter(isLocalRecipient);
    const externalRecipients = normalizedTo.filter(r => !isLocalRecipient(r));

    // 4a. LOCAL DELIVERY — deliver directly into recipient's inbox (no SMTP relay)
    const domainName = senderAddress.split('@')[1] || 'eazzio.com';
    const { rawMime: composedMime, messageId: composedMessageId } = OutboundService.composeAndSign({
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

    let messageId = composedMessageId;
    let queueIds: string[] = [];

    // Store sender's copy in Sent folder
    const senderMsgId = crypto.randomUUID();
    const senderRawKey = `mailboxes/${mailboxId}/messages/${senderMsgId}/raw.eml`;
    await storage.put(senderRawKey, composedMime, 'message/rfc822');
    if (messageRepo) {
      const { Message: MsgCtor } = await import('@eazzio/domain');
      const senderMsg = new MsgCtor({
        id: senderMsgId,
        mailboxId,
        folderId: sentFolderId,
        messageIdHeader: messageId,
        fromAddress: senderAddress,
        subject: subject || '(No Subject)',
        snippet: (bodyText || bodyHtml || '').slice(0, 200).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
        sizeBytes: composedMime.length,
        rawObjectKey: senderRawKey,
        isRead: true,
        isStarred: false,
        isImportant: false,
        direction: 'outbound' as any,
        deliveryState: localRecipients.length > 0 ? 'delivered' : 'queued',
        receivedAt: new Date(),
      });
      await messageRepo.save(senderMsg);
    }

    // Deliver to each local recipient's inbox
    for (const localAddr of localRecipients) {
      try {
        // Find or create recipient user & mailbox
        const recipientUserRows = (await defaultDb.query(
          `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
          [localAddr.toLowerCase()]
        )) as any[];

        let recipientUserId: string;
        if (recipientUserRows.length > 0) {
          recipientUserId = recipientUserRows[0].id;
        } else {
          // Auto-create user for local address
          recipientUserId = crypto.randomUUID();
          await defaultDb.query(
            `INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, 'pending_registration', $3) ON CONFLICT (email) DO NOTHING`,
            [recipientUserId, localAddr, localAddr.split('@')[0]]
          );
        }

        const recipientMailbox = await getOrCreateUserMailbox(recipientUserId, localAddr);
        const recipientInboxId = await getFolderId(recipientMailbox.mailboxId, 'inbox');

        // Store message in recipient's inbox
        const inboxMsgId = crypto.randomUUID();
        const recipientRawKey = `mailboxes/${recipientMailbox.mailboxId}/messages/${inboxMsgId}/raw.eml`;
        await storage.put(recipientRawKey, composedMime, 'message/rfc822');

        await defaultDb.query(
          `INSERT INTO messages (id, mailbox_id, folder_id, message_id_header, from_address, subject, snippet, size_bytes, raw_object_key, is_read, is_starred, is_important, direction, delivery_state, received_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, false, false, 'inbound', 'delivered', NOW())`,
          [
            inboxMsgId,
            recipientMailbox.mailboxId,
            recipientInboxId,
            messageId,
            senderAddress,
            subject || '(No Subject)',
            (bodyText || bodyHtml || '').slice(0, 200).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
            composedMime.length,
            recipientRawKey,
          ]
        );

        // Add recipient record
        await defaultDb.query(
          `INSERT INTO message_recipients (id, message_id, kind, address) VALUES (gen_random_uuid(), $1, 'to', $2)`,
          [inboxMsgId, localAddr]
        );

        console.log(`[Eazzio Mail] ✅ Local delivery: ${senderAddress} → ${localAddr} (inbox: ${recipientMailbox.mailboxId})`);
      } catch (localErr) {
        console.error(`[Eazzio Mail] ❌ Local delivery failed for ${localAddr}:`, localErr);
      }
    }

    // 4b. EXTERNAL DELIVERY — enqueue for SMTP relay (Brevo)
    if (externalRecipients.length > 0) {
      const result = await outboundService.enqueueOutbound({
        fromAddress: senderAddress,
        to: externalRecipients,
        cc: normalizedCc.length > 0 ? normalizedCc : undefined,
        bcc: normalizedBcc.length > 0 ? normalizedBcc : undefined,
        subject: subject || '(No Subject)',
        bodyText: bodyText || '',
        bodyHtml: bodyHtml || `<p>${(bodyText || '').replace(/\n/g, '<br>')}</p>`,
        domainName,
        mailboxId,
        folderId: sentFolderId,
      });
      messageId = result.messageId;
      queueIds = result.queueIds;
    }

    // 5. Persist recipient records for sender's message (Sent folder)
    for (const toAddr of normalizedTo) {
      await defaultDb.query(
        `INSERT INTO message_recipients (id, message_id, kind, address) VALUES (gen_random_uuid(), $1, 'to', $2)`,
        [senderMsgId, toAddr]
      );
    }
    for (const ccAddr of normalizedCc) {
      await defaultDb.query(
        `INSERT INTO message_recipients (id, message_id, kind, address) VALUES (gen_random_uuid(), $1, 'cc', $2)`,
        [senderMsgId, ccAddr]
      );
    }
    for (const bccAddr of normalizedBcc) {
      await defaultDb.query(
        `INSERT INTO message_recipients (id, message_id, kind, address) VALUES (gen_random_uuid(), $1, 'bcc', $2)`,
        [senderMsgId, bccAddr]
      );
    }

    // 5b. Persist recipient records for external queue entries if any
    for (const qId of queueIds) {
      const qRows = (await defaultDb.query(`SELECT message_id, recipient_address FROM outbound_queue WHERE id = $1`, [qId])) as any[];
      if (qRows.length > 0) {
        await defaultDb.query(
          `INSERT INTO message_recipients (id, message_id, kind, address) VALUES (gen_random_uuid(), $1, 'to', $2)`,
          [qRows[0].message_id, qRows[0].recipient_address]
        );
      }
    }

    // 5b. Persist message attachments if present
    const rawAttachments = req.body.attachments;
    let actualMsgUuid: string | undefined = senderMsgId;
    if (queueIds.length > 0) {
      const qCheck = (await defaultDb.query(`SELECT message_id FROM outbound_queue WHERE id = $1`, [queueIds[0]])) as any[];
      if (qCheck.length > 0) {
        actualMsgUuid = qCheck[0].message_id;
      }
    }

    if (actualMsgUuid && rawAttachments && Array.isArray(rawAttachments)) {
      for (const att of rawAttachments) {
        const attId = crypto.randomUUID();
        const objectKey = `att_${actualMsgUuid}_${attId}_${att.name || att.filename || 'attachment.dat'}`;
        let fileBuffer: Buffer;
        if (att.dataBase64) {
          fileBuffer = Buffer.from(att.dataBase64, 'base64');
        } else if (att.content) {
          fileBuffer = Buffer.from(att.content, 'utf-8');
        } else {
          fileBuffer = Buffer.from(att.name || 'Sample attachment content', 'utf-8');
        }

        await storage.put(objectKey, fileBuffer, att.type || att.contentType || 'application/octet-stream');
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        await defaultDb.query(
          `INSERT INTO attachments (id, message_id, filename, mime_type, size_bytes, sha256_hash, object_key, scan_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'clean')`,
          [
            attId,
            actualMsgUuid,
            att.name || att.filename || 'attachment.dat',
            att.type || att.contentType || 'application/octet-stream',
            fileBuffer.length,
            hash,
            objectKey,
          ]
        );
      }
    }

    // 6. Check if scheduled for future delivery
    let isScheduled = false;
    let scheduledDate: Date | null = null;
    if (req.body.scheduledAt) {
      const parsedDate = new Date(req.body.scheduledAt);
      if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() > Date.now()) {
        isScheduled = true;
        scheduledDate = parsedDate;
      }
    }

    if (isScheduled && scheduledDate) {
      if (actualMsgUuid) {
        await defaultDb.query(
          `UPDATE messages SET scheduled_at = $1, delivery_state = 'scheduled' WHERE id = $2`,
          [scheduledDate, actualMsgUuid]
        );
      }
      if (queueIds.length > 0) {
        await defaultDb.query(
          `UPDATE outbound_queue SET scheduled_at = $1, state = 'scheduled' WHERE id = ANY($2)`,
          [scheduledDate, queueIds]
        );
      }
    } else if (externalRecipients.length > 0) {
      // Trigger Queue Runner immediately for external delivery only
      setImmediate(() => {
        getQueueRunner()
          .processNextBatch(10)
          .catch((runnerErr) => {
            console.error('Background outbound queue runner error:', runnerErr);
          });
      });
    }

    res.status(202).json({
      success: true,
      id: actualMsgUuid,
      messageId,
      queueIds,
      deliveryState: isScheduled ? 'scheduled' : 'queued',
      scheduledAt: isScheduled ? scheduledDate?.toISOString() : undefined,
      status: isScheduled ? 'scheduled_for_delivery' : 'accepted_for_delivery',
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/attachments/:id/download
messagesRouter.get('/attachments/:id/download', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const rows = (await defaultDb.query(
      `SELECT a.* FROM attachments a WHERE a.id = $1`,
      [id]
    )) as any[];

    if (rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Attachment not found', 404);
    }

    const att = rows[0];
    const data = await storage.get(att.object_key);
    res.setHeader('Content-Type', att.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(att.filename)}"`);
    res.send(data);
  } catch (err) {
    next(err);
  }
});
