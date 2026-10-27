import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireAuth } from '../../middleware/auth.js';
import { SearchService } from '../../application/search-service.js';
import { OpenSearchQueryAdapter } from '../../application/opensearch-query-adapter.js';
import { defaultOpenSearch } from '../../config/index.js';
import { rateLimit, RateLimitPolicies } from '../../middleware/rate-limiter.js';

export const searchRouter: Router = Router();

searchRouter.use(requireAuth);
searchRouter.use(rateLimit(RateLimitPolicies.SEARCH));

const searchAdapter = new OpenSearchQueryAdapter(defaultOpenSearch);
const searchService = new SearchService(searchAdapter);

import { defaultDb } from '../../config/index.js';
import { SearchQueryParser } from '../../algorithms/search-query-parser.js';

// GET /v1/search
searchRouter.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string) || '';
    let mailboxId = (req.query.mailboxId as string) || '';
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    if (!mailboxId) {
      const userEmail = req.user!.email;
      const mbRows = (await defaultDb.query(
        `SELECT id FROM mailboxes WHERE owner_user_id = $1 OR LOWER(address) = LOWER($2) LIMIT 1`,
        [req.user!.userId, userEmail]
      )) as any[];
      if (mbRows.length > 0) {
        mailboxId = mbRows[0].id;
      }
    }

    if (!q.trim()) {
      res.json({ data: [], nextCursor: null });
      return;
    }

    // 1. Advanced Search Parser (Operators + Full-text tokenization)
    const filters = SearchQueryParser.parse(q);
    const { sql, params } = SearchQueryParser.buildSqlQuery(mailboxId, filters, limit);
    const rows = (await defaultDb.query(sql, params)) as any[];

    const items = rows.map((m: any) => ({
      id: m.id,
      threadId: m.thread_id,
      subject: m.subject || '(No Subject)',
      fromAddress: m.from_address,
      snippet: m.snippet || '',
      isRead: Boolean(m.is_read),
      isStarred: Boolean(m.is_starred),
      isImportant: Boolean(m.is_important),
      receivedAt: m.received_at,
      recipients: m.recipients,
    }));

    res.json({ success: true, data: items, nextCursor: null });
  } catch (err) {
    next(err);
  }
});

// GET /v1/search/autocomplete
searchRouter.get(
  '/autocomplete',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const prefix = req.query.prefix as string;
      const mailboxId = (req.query.mailboxId as string) || '';
      const suggestions = await searchService.autocomplete(prefix, mailboxId);
      res.json({ data: suggestions });
    } catch (err) {
      next(err);
    }
  },
);
