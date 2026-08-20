import { Client, ClientOptions } from '@opensearch-project/opensearch';
import { EazzioSearch, SearchResult, SearchHit } from '../interface.js';

export interface OpenSearchConfig {
  node?: string;
  nodes?: string[];
  auth?: {
    username?: string;
    password?: string;
  };
  ssl?: {
    rejectUnauthorized?: boolean;
  };
  requestTimeout?: number;
  maxRetries?: number;
}

export class OpenSearchAdapter implements EazzioSearch {
  private readonly client: Client;

  constructor(config?: string | OpenSearchConfig) {
    if (typeof config === 'string') {
      this.client = new Client({
        node: config,
        ssl: { rejectUnauthorized: false },
      });
    } else if (config) {
      const options: ClientOptions = {
        node:
          config.node ??
          (config.nodes ? undefined : process.env.OPENSEARCH_URL || 'http://localhost:9200'),
        nodes: config.nodes,
        auth:
          config.auth?.username && config.auth?.password
            ? {
                username: config.auth.username,
                password: config.auth.password,
              }
            : undefined,
        ssl: config.ssl ?? { rejectUnauthorized: false },
        requestTimeout: config.requestTimeout ?? 10000,
        maxRetries: config.maxRetries ?? 3,
      };
      this.client = new Client(options);
    } else {
      this.client = new Client({
        node: process.env.OPENSEARCH_URL || 'http://localhost:9200',
        ssl: { rejectUnauthorized: false },
        requestTimeout: 10000,
      });
    }
  }

  public async createIndexIfNotExists(
    index: string,
    mappings?: Record<string, unknown>,
  ): Promise<void> {
    const exists = await this.client.indices.exists({ index });
    if (!exists.body) {
      await this.client.indices.create({
        index,
        body: mappings ? { mappings } : undefined,
      });
    }
  }

  public async deleteIndex(index: string): Promise<void> {
    const exists = await this.client.indices.exists({ index });
    if (exists.body) {
      await this.client.indices.delete({ index });
    }
  }

  public async indexDocument(
    index: string,
    id: string,
    doc: Record<string, unknown>,
  ): Promise<void> {
    await this.client.index({
      index,
      id,
      body: doc,
      refresh: true,
    });
  }

  public async deleteDocument(index: string, id: string): Promise<void> {
    try {
      await this.client.delete({
        index,
        id,
        refresh: true,
      });
    } catch (err: unknown) {
      const opensearchError = err as { statusCode?: number };
      if (opensearchError.statusCode !== 404) {
        throw err;
      }
    }
  }

  public async search<T = Record<string, unknown>>(
    index: string,
    query: Record<string, unknown>,
  ): Promise<SearchResult<T>> {
    const res = await this.client.search({
      index,
      body: query,
    });

    const hitsBody = res.body.hits;
    const total =
      typeof hitsBody.total === 'number' ? hitsBody.total : (hitsBody.total?.value ?? 0);

    const hits: SearchHit<T>[] = (hitsBody.hits || []).map((hit: any) => ({
      id: hit._id ?? '',
      score: hit._score ?? 0,
      source: hit._source as T,
    }));

    return {
      total,
      hits,
    };
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const res = await this.client.cluster.health();
      const status = res.body?.status;
      return status === 'green' || status === 'yellow';
    } catch {
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.client.close();
  }
}
