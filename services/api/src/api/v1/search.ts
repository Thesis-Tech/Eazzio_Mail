import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireAuth } from '../../middleware/auth.js';
import { SearchService } from '../../application/search-service.js';

export const searchRouter: Router = Router();

searchRouter.use(requireAuth);

// Mock search adapter for API query surface
const mockSearchAdapter = {
  query: async () => ({ items: [], nextCursor: null }),
  autocomplete: async (prefix: string) => [`${prefix} suggestion 1`, `${prefix} suggestion 2`]
};

const searchService = new SearchService(mockSearchAdapter);

// GET /v1/search
searchRouter.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string;
    const mailboxId = (req.query.mailboxId as string) || 'default-mailbox';
    const results = await searchService.search({ q, mailboxId });
    res.json({ data: results.items, nextCursor: results.nextCursor });
  } catch (err) {
    next(err);
  }
});

// GET /v1/search/autocomplete
searchRouter.get('/autocomplete', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const prefix = req.query.prefix as string;
    const mailboxId = (req.query.mailboxId as string) || 'default-mailbox';
    const suggestions = await searchService.autocomplete(prefix, mailboxId);
    res.json({ data: suggestions });
  } catch (err) {
    next(err);
  }
});
