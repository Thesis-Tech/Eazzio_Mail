import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireAuth } from '../../middleware/auth.js';
import { MailboxService } from '../../application/mailbox-service.js';
import { AppError } from '../../middleware/error-handler.js';
import {
  PostgresMailboxRepository,
  PostgresFolderRepository,
  PostgresMessageRepository,
  PostgresLabelRepository,
} from '@eazzio/infra-adapters';
import { defaultDb } from '../../config/index.js';

export const mailboxRouter: Router = Router();

const mailboxRepo = new PostgresMailboxRepository(defaultDb);
const folderRepo = new PostgresFolderRepository(defaultDb);
const messageRepo = new PostgresMessageRepository(defaultDb);
const labelRepo = new PostgresLabelRepository(defaultDb);

const mailboxService = new MailboxService(mailboxRepo, folderRepo, messageRepo, labelRepo);

mailboxRouter.use(requireAuth);

// GET /v1/mailboxes
mailboxRouter.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const mailboxes = await mailboxService.getMailboxesForUser(userId);
    res.json({
      data: mailboxes.map((m) => ({
        id: m.id,
        address: m.address,
        domainId: m.domainId,
        quotaBytes: m.quotaBytes.toString(),
        usedBytes: m.usedBytes.toString(),
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/mailboxes/:id/folders
mailboxRouter.get(
  '/:id/folders',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const mailboxId = String(req.params.id);
      const userId = req.user!.userId;
      const folders = await mailboxService.getFolders(mailboxId, userId);
      res.json({
        data: folders.map((f) => ({
          id: f.id,
          mailboxId: f.mailboxId,
          parentFolderId: f.parentFolderId,
          name: f.name,
          kind: f.kind,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /v1/mailboxes/:id/messages
mailboxRouter.get(
  '/:id/messages',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const mailboxId = String(req.params.id);
      const userId = req.user!.userId;
      const folderId = req.query.folderId ? String(req.query.folderId) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const cursor = req.query.cursor ? String(req.query.cursor) : undefined;

      const result = await mailboxService.getMessages(mailboxId, userId, {
        folderId,
        limit,
        cursor,
      });

      res.json({
        data: result.data.map((msg) => ({
          id: msg.id,
          mailboxId: msg.mailboxId,
          folderId: msg.folderId,
          threadId: msg.threadId,
          messageIdHeader: msg.messageIdHeader,
          fromAddress: msg.fromAddress,
          subject: msg.subject,
          snippet: msg.snippet,
          sizeBytes: msg.sizeBytes,
          isRead: msg.isRead,
          isStarred: msg.isStarred,
          isImportant: msg.isImportant,
          direction: msg.direction,
          deliveryState: msg.deliveryState,
          receivedAt: msg.receivedAt.toISOString(),
        })),
        nextCursor: result.nextCursor,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /v1/mailboxes/:id/messages/:msgId/labels
mailboxRouter.post(
  '/:id/messages/:msgId/labels',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const mailboxId = String(req.params.id);
      const messageId = String(req.params.msgId);
      const userId = req.user!.userId;
      const { labelId } = req.body;

      if (!labelId) {
        throw new AppError('VALIDATION_ERROR', 'labelId is required', 400, [
          { field: 'labelId', issue: 'missing required field' },
        ]);
      }

      await mailboxService.addLabelToMessage(mailboxId, messageId, labelId, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
