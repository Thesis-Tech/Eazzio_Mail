import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireAuth } from '../../middleware/auth.js';
import { MailboxService } from '../../application/mailbox-service.js';
import { AppError } from '../../middleware/error-handler.js';

export const mailboxRouter: Router = Router();

mailboxRouter.use(requireAuth);

// GET /v1/mailboxes/:id/folders
mailboxRouter.get('/:id/folders', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const mailboxId = String(req.params.id);
    const folders = MailboxService.getSystemFolders(mailboxId);
    res.json({ data: folders });
  } catch (err) {
    next(err);
  }
});

// GET /v1/mailboxes/:id/messages
mailboxRouter.get('/:id/messages', (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.json({
      data: [],
      nextCursor: null
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/mailboxes/:id/messages/:msgId/labels
mailboxRouter.post('/:id/messages/:msgId/labels', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { labelId } = req.body;
    if (!labelId) {
      throw new AppError('VALIDATION_ERROR', 'labelId is required', 400, [
        { field: 'labelId', issue: 'missing required field' }
      ]);
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
