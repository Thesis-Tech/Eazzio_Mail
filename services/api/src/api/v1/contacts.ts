import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireAuth } from '../../middleware/auth.js';
import { rateLimit, RateLimitPolicies } from '../../middleware/rate-limiter.js';
import { defaultDb } from '../../config/index.js';

export const contactsRouter: Router = Router();

contactsRouter.use(requireAuth);
contactsRouter.use(rateLimit(RateLimitPolicies.READ_API));

// GET /v1/contacts/suggest?q=
// Returns contact autocomplete suggestions from past from/to addresses
contactsRouter.get('/suggest', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userEmail = req.user?.email || '';
    const q = ((req.query.q as string) || '').trim().toLowerCase();

    if (!q) {
      res.json({ success: true, data: [] });
      return;
    }

    // Resolve mailbox for this user safely
    const mailboxRows = (await defaultDb.query(
      `SELECT id FROM mailboxes WHERE LOWER(address) = LOWER($1) OR owner_user_id::text = $2 LIMIT 1`,
      [userEmail, req.user?.userId || '']
    )) as any[];

    if (mailboxRows.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }
    const mailboxId = mailboxRows[0].id;

    // Query all unique from_address values from messages sent/received in this mailbox
    const rows = (await defaultDb.query(
      `SELECT DISTINCT from_address AS email
       FROM messages
       WHERE mailbox_id = $1
         AND LOWER(from_address) LIKE $2
         AND from_address NOT LIKE $3
       LIMIT 10`,
      [mailboxId, `%${q}%`, userEmail]
    )) as any[];

    // Also query recipient addresses from the recipients JSONB/table if available
    let recipientRows: any[] = [];
    try {
      recipientRows = (await defaultDb.query(
        `SELECT DISTINCT r->>'email' AS email
         FROM messages m,
              jsonb_array_elements(
                CASE jsonb_typeof(m.recipients) WHEN 'array' THEN m.recipients ELSE '[]'::jsonb END
              ) AS r
         WHERE m.mailbox_id = $1
           AND LOWER(r->>'email') LIKE $2
           AND r->>'email' NOT LIKE $3
         LIMIT 10`,
        [mailboxId, `%${q}%`, userEmail]
      )) as any[];
    } catch {
      // recipients column may not support jsonb ops; silently skip
    }

    const seen = new Set<string>();
    const combined: Array<{ email: string; name?: string }> = [];
    for (const row of [...rows, ...recipientRows]) {
      const email = (row.email || '').trim();
      if (email && !seen.has(email.toLowerCase())) {
        seen.add(email.toLowerCase());
        const name = email.split('@')[0]?.replace(/[._]/g, ' ') || '';
        combined.push({ email, name });
      }
    }

    res.json({ success: true, data: combined.slice(0, 10) });
  } catch (err) {
    next(err);
  }
});
