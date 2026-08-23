import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { PostgresMailboxRepository } from '@eazzio/infra-adapters';
import { defaultDb } from '../../config/index.js';
import crypto from 'crypto';

export const webhooksRouter: Router = Router();

const mailboxRepo = new PostgresMailboxRepository(defaultDb);

webhooksRouter.use(requireAuth);

// Helper to resolve user's mailbox
async function resolveMailboxId(userId: string, requestedMailboxId?: string): Promise<string> {
  if (requestedMailboxId) return requestedMailboxId;
  const mailboxes = await mailboxRepo.findByOwnerId(userId);
  if (mailboxes.length === 0) {
    throw new AppError('NOT_FOUND', 'No mailbox found for user', 404);
  }
  return mailboxes[0]!.id;
}

// GET /v1/webhooks - List all registered webhooks for user/mailbox
webhooksRouter.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { mailboxId: queryMailboxId } = req.query;
    const mailboxId = await resolveMailboxId(userId, queryMailboxId as string | undefined);

    const rows = (await defaultDb.query(
      `SELECT id, mailbox_id, url, events, is_active, created_at FROM webhooks WHERE mailbox_id = $1 ORDER BY created_at DESC`,
      [mailboxId],
    )) as any[];

    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        mailboxId: r.mailbox_id,
        url: r.url,
        events: r.events,
        isActive: r.is_active,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/webhooks - Register a new webhook endpoint
webhooksRouter.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { url, events = ['mail.received', 'mail.sent'], secret: providedSecret, mailboxId: bodyMailboxId } = req.body;

    if (!url || typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      throw new AppError('VALIDATION_ERROR', 'A valid HTTP or HTTPS webhook URL is required', 400);
    }

    const mailboxId = await resolveMailboxId(userId, bodyMailboxId);
    const webhookId = crypto.randomUUID();
    const secret = providedSecret || `whsec_${crypto.randomBytes(24).toString('hex')}`;

    await defaultDb.query(
      `INSERT INTO webhooks (id, mailbox_id, url, secret, events, is_active)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [webhookId, mailboxId, url, secret, events],
    );

    res.status(201).json({
      success: true,
      data: {
        id: webhookId,
        mailboxId,
        url,
        secret,
        events,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/webhooks/:id/test - Send signed test ping to webhook URL
webhooksRouter.post('/:id/test', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const rows = (await defaultDb.query(`SELECT * FROM webhooks WHERE id = $1`, [id])) as any[];

    if (rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Webhook not found', 404);
    }

    const webhook = rows[0];
    const payload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        webhookId: webhook.id,
        message: 'This is a test notification from Eazzio Mail Webhook Engine',
      },
    };

    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(payloadString)
      .digest('hex');

    let responseStatus = 0;
    let responseBody = '';

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Eazzio-Mail-Webhook/1.0',
          'X-Eazzio-Signature': `sha256=${signature}`,
          'X-Eazzio-Event': 'webhook.test',
        },
        body: payloadString,
        signal: AbortSignal.timeout(5000),
      });

      responseStatus = response.status;
      responseBody = (await response.text()).slice(0, 1000);
    } catch (fetchErr: any) {
      responseStatus = 504;
      responseBody = `Delivery error: ${fetchErr.message}`;
    }

    // Record delivery in database
    await defaultDb.query(
      `INSERT INTO webhook_deliveries (webhook_id, event_type, payload, response_status, response_body)
       VALUES ($1, $2, $3, $4, $5)`,
      [webhook.id, 'webhook.test', payload, responseStatus, responseBody],
    );

    res.json({
      success: true,
      data: {
        webhookId: webhook.id,
        delivered: responseStatus >= 200 && responseStatus < 300,
        responseStatus,
        responseBody,
      },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/webhooks/:id - Delete a webhook registration
webhooksRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    await defaultDb.query(`DELETE FROM webhooks WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Webhook deleted successfully' });
  } catch (err) {
    next(err);
  }
});
