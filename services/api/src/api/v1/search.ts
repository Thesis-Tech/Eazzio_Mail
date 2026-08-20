import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireAuth } from '../../middleware/auth.js';
import { SearchService } from '../../application/search-service.js';
import { OpenSearchQueryAdapter } from '../../application/opensearch-query-adapter.js';
import { defaultOpenSearch } from '../../config/index.js';

export const searchRouter: Router = Router();

searchRouter.use(requireAuth);

const searchAdapter = new OpenSearchQueryAdapter(defaultOpenSearch);
const searchService = new SearchService(searchAdapter);

// GET /v1/search
searchRouter.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string;
    const mailboxId = (req.query.mailboxId as string) || '';
    const folderId = req.query.folderId as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const results = await searchService.search({ q, mailboxId, folderId, limit });
    res.json({ data: results.items, nextCursor: results.nextCursor });
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
