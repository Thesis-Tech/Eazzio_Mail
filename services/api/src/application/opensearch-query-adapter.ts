import { OpenSearchAdapter } from '@eazzio/infra-adapters';
import { SearchQueryAdapter, SearchQueryParams, SearchResultItem } from './search-service.js';

export class OpenSearchQueryAdapter implements SearchQueryAdapter {
  constructor(
    private readonly opensearch: OpenSearchAdapter,
    private readonly indexName: string = 'messages',
  ) {}

  public async query(
    params: SearchQueryParams,
  ): Promise<{ items: SearchResultItem[]; nextCursor?: string | null }> {
    const mustClauses: Record<string, unknown>[] = [
      {
        multi_match: {
          query: params.q,
          fields: ['subject^2', 'snippet', 'body', 'from_address'],
        },
      },
    ];

    if (params.mailboxId) {
      mustClauses.push({
        match: { mailbox_id: params.mailboxId },
      });
    }

    if (params.folderId) {
      mustClauses.push({
        match: { folder_id: params.folderId },
      });
    }

    const limit = params.limit ?? 20;

    try {
      const res = await this.opensearch.search<Record<string, unknown>>(this.indexName, {
        size: limit,
        query: {
          bool: {
            must: mustClauses,
          },
        },
      });

      const items: SearchResultItem[] = res.hits.map((hit) => {
        const src = hit.source;
        return {
          id: hit.id,
          subject: (src.subject as string) || '',
          fromAddress: (src.from_address as string) || (src.from as string) || '',
          snippet: (src.snippet as string) || '',
          receivedAt: (src.received_at as string) || new Date().toISOString(),
        };
      });

      return { items, nextCursor: null };
    } catch {
      return { items: [], nextCursor: null };
    }
  }

  public async autocomplete(prefix: string, mailboxId: string): Promise<string[]> {
    try {
      const res = await this.opensearch.search<Record<string, unknown>>(this.indexName, {
        size: 5,
        query: {
          bool: {
            must: [
              { match: { mailbox_id: mailboxId } },
              { prefix: { subject: prefix.toLowerCase() } },
            ],
          },
        },
      });

      return res.hits.map((hit) => (hit.source.subject as string) || '').filter(Boolean);
    } catch {
      return [];
    }
  }
}
