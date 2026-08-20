import { AppError } from '../middleware/error-handler.js';

export interface SearchQueryParams {
  q: string;
  mailboxId: string;
  folderId?: string;
  labelId?: string;
  limit?: number;
  cursor?: string;
}

export interface SearchResultItem {
  id: string;
  subject: string;
  fromAddress: string;
  snippet: string;
  receivedAt: string;
}

export interface SearchQueryAdapter {
  query(params: SearchQueryParams): Promise<{ items: SearchResultItem[]; nextCursor?: string | null }>;
  autocomplete(prefix: string, mailboxId: string): Promise<string[]>;
}

export class SearchService {
  constructor(private readonly searchAdapter: SearchQueryAdapter) {}

  public async search(params: SearchQueryParams): Promise<{ items: SearchResultItem[]; nextCursor?: string | null }> {
    if (!params.q || params.q.trim().length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Search query cannot be empty', 400);
    }
    return await this.searchAdapter.query(params);
  }

  public async autocomplete(prefix: string, mailboxId: string): Promise<string[]> {
    if (!prefix || prefix.trim().length < 2) {
      return [];
    }
    return await this.searchAdapter.autocomplete(prefix.trim(), mailboxId);
  }
}
