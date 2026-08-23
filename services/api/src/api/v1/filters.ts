import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { Filter } from '@eazzio/domain';
import { PostgresFilterRepository, PostgresMailboxRepository } from '@eazzio/infra-adapters';
import { defaultDb } from '../../config/index.js';
import crypto from 'crypto';

export const filtersRouter: Router = Router();

const filterRepo = new PostgresFilterRepository(defaultDb);
const mailboxRepo = new PostgresMailboxRepository(defaultDb);

filtersRouter.use(requireAuth);

// Helper to resolve user's mailbox
async function resolveMailboxId(userId: string, requestedMailboxId?: string): Promise<string> {
  if (requestedMailboxId) return requestedMailboxId;
  const mailboxes = await mailboxRepo.findByOwnerId(userId);
  if (mailboxes.length === 0) {
    throw new AppError('NOT_FOUND', 'No mailbox found for user', 404);
  }
  return mailboxes[0]!.id;
}

// GET /v1/filters - List all filters for the user's mailbox
filtersRouter.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { mailboxId: queryMailboxId } = req.query;
    const mailboxId = await resolveMailboxId(userId, queryMailboxId as string | undefined);

    const filters = await filterRepo.findByMailboxId(mailboxId);
    res.json({
      success: true,
      data: filters.map((f) => ({
        id: f.id,
        mailboxId: f.mailboxId,
        conditions: f.conditions,
        actions: f.actions,
        isEnabled: f.isEnabled,
        priority: f.priority,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/filters - Create a new filter rule
filtersRouter.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { mailboxId: bodyMailboxId, conditions, actions, isEnabled = true, priority = 0 } = req.body;

    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'At least one condition is required', 400);
    }
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'At least one action is required', 400);
    }

    const mailboxId = await resolveMailboxId(userId, bodyMailboxId);
    const filterId = crypto.randomUUID();

    const newFilter = new Filter({
      id: filterId,
      mailboxId,
      conditions,
      actions,
      isEnabled: Boolean(isEnabled),
      priority: Number(priority),
    });

    await filterRepo.save(newFilter);

    res.status(201).json({
      success: true,
      data: {
        id: newFilter.id,
        mailboxId: newFilter.mailboxId,
        conditions: newFilter.conditions,
        actions: newFilter.actions,
        isEnabled: newFilter.isEnabled,
        priority: newFilter.priority,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/filters/:id - Toggle or update a filter rule
filtersRouter.patch('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { isEnabled, conditions, actions, priority } = req.body;

    const existing = await filterRepo.findById(id);
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Filter rule not found', 404);
    }

    const updated = new Filter({
      id: existing.id,
      mailboxId: existing.mailboxId,
      conditions: conditions !== undefined ? conditions : existing.conditions,
      actions: actions !== undefined ? actions : existing.actions,
      isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : existing.isEnabled,
      priority: priority !== undefined ? Number(priority) : existing.priority,
    });

    await filterRepo.save(updated);

    res.json({
      success: true,
      data: {
        id: updated.id,
        mailboxId: updated.mailboxId,
        conditions: updated.conditions,
        actions: updated.actions,
        isEnabled: updated.isEnabled,
        priority: updated.priority,
      },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/filters/:id - Delete a filter rule
filtersRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const existing = await filterRepo.findById(id);
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Filter rule not found', 404);
    }

    await filterRepo.delete(id);
    res.json({ success: true, message: 'Filter rule deleted successfully' });
  } catch (err) {
    next(err);
  }
});
