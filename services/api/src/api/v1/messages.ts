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
      const userMailboxes = await mailboxRepo.findByOwnerId(userId);
      if (userMailboxes.length > 0) {
        mailboxId = userMailboxes[0]!.id;
        senderAddress = userMailboxes[0]!.address;
      } else {
        // Ensure user exists in users table
        const existingUserByEmail = (await defaultDb.query('SELECT id FROM users WHERE email = $1', [senderAddress])) as any[];
        let effectiveUserId = userId;
        if (existingUserByEmail.length > 0) {
          effectiveUserId = existingUserByEmail[0].id;
        } else {
          await defaultDb.query(
            `INSERT INTO users (id, email, password_hash, display_name) 
             VALUES ($1, $2, 'hash_auto', 'Eazzio User') 
             ON CONFLICT (email) DO NOTHING`,
            [userId, senderAddress]
          );
        }

        const existingMailboxByAddress = (await defaultDb.query('SELECT id, owner_user_id, address FROM mailboxes WHERE address = $1', [senderAddress])) as any[];
        if (existingMailboxByAddress.length > 0) {
          mailboxId = existingMailboxByAddress[0].id;
          senderAddress = existingMailboxByAddress[0].address;
        } else {
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
            ownerUserId: effectiveUserId,
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
