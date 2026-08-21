import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { Folder, Mailbox } from '@eazzio/domain';
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

export const messagesRouter: Router = Router();

const mailboxRepo = new PostgresMailboxRepository(defaultDb);
const folderRepo = new PostgresFolderRepository(defaultDb);
const messageRepo = new PostgresMessageRepository(defaultDb);
const queueRepo = new PostgresOutboundQueueRepository(defaultDb);
const storage = new MemoryStorageAdapter();
const transport = createEmailTransport();

const outboundService = new OutboundService(queueRepo, messageRepo, storage);
const queueRunner = new QueueRunner(queueRepo, messageRepo, storage, transport);

messagesRouter.use(requireAuth);

// POST /v1/messages/compose
messagesRouter.post('/compose', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { to, cc, bcc, subject, bodyText, bodyHtml, mailboxId: requestedMailboxId } = req.body;

    // 1. Validate recipients
    if (!to || !Array.isArray(to) || to.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Recipient (to) array must contain at least one email address', 400, [
        { field: 'to', issue: 'missing required field' },
      ]);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const recipient of to) {
      if (!emailRegex.test(recipient)) {
        throw new AppError('VALIDATION_ERROR', `Invalid recipient email format: ${recipient}`, 400, [
          { field: 'to', issue: 'invalid email syntax' },
        ]);
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
      const userMailboxes = await mailboxRepo.findByOwnerId(userId);
      if (userMailboxes.length > 0) {
        mailboxId = userMailboxes[0]!.id;
        senderAddress = userMailboxes[0]!.address;
      } else {
        // Ensure user exists in users table
        const userCheck = (await defaultDb.query('SELECT id FROM users WHERE id = $1', [userId])) as any[];
        if (userCheck.length === 0) {
          await defaultDb.query(
            `INSERT INTO users (id, email, password_hash, display_name) 
             VALUES ($1, $2, 'hash_auto', 'Eazzio User') 
             ON CONFLICT (email) DO NOTHING`,
            [userId, senderAddress]
          );
        }

        // Ensure a domain exists
        const domainRes = (await defaultDb.query(`SELECT id FROM domains WHERE domain_name = 'eazzio.com' LIMIT 1`)) as any[];
        let domainId: string;
        if (domainRes.length > 0) {
          domainId = domainRes[0].id;
        } else {
          domainId = crypto.randomUUID();
          await defaultDb.query(
            `INSERT INTO domains (id, domain_name, verification_status) 
             VALUES ($1, 'eazzio.com', 'verified') 
             ON CONFLICT DO NOTHING`,
            [domainId]
          );
        }

        const newMailboxId = crypto.randomUUID();
        const newMailbox = new Mailbox({
          id: newMailboxId,
          ownerUserId: userId,
          domainId,
          address: senderAddress,
          quotaBytes: 5368709120n,
          usedBytes: 0n,
          createdAt: new Date(),
        });
        await mailboxRepo.save(newMailbox);
        mailboxId = newMailboxId;
      }
    }

    // 3. Resolve Sent folder
    let sentFolderId: string | undefined;
    if (mailboxId) {
      const folders = await folderRepo.findByMailboxId(mailboxId);
      const sentFolder = folders.find((f) => f.kind === 'sent' || f.name.toLowerCase() === 'sent');
      if (sentFolder) {
        sentFolderId = sentFolder.id;
      } else if (folders.length > 0) {
        sentFolderId = folders[0]!.id;
      } else {
        const newFolderId = crypto.randomUUID();
        const newSent = new Folder({
          id: newFolderId,
          mailboxId,
          name: 'Sent',
          kind: 'sent',
        });
        await folderRepo.save(newSent);
        sentFolderId = newFolderId;
      }
    }

    if (!sentFolderId) {
      throw new AppError('NOT_FOUND', 'No valid folder found in mailbox for outbound message', 404);
    }

    // 4. Enqueue into outbound service pipeline
    const domainName = senderAddress.split('@')[1] || 'eazzio.com';
    const { messageId, queueIds } = await outboundService.enqueueOutbound({
      fromAddress: senderAddress,
      to,
      cc,
      bcc,
      subject: subject || '(No Subject)',
      bodyText: bodyText || '',
      bodyHtml: bodyHtml || `<p>${(bodyText || '').replace(/\n/g, '<br>')}</p>`,
      domainName,
      mailboxId,
      folderId: sentFolderId,
    });

    // 5. Trigger Queue Runner in the background for outbound SMTP delivery
    setImmediate(() => {
      queueRunner.processNextBatch(10).catch((runnerErr) => {
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
