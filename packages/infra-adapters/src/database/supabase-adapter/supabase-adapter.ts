import { PostgresAdapter, PostgresConfig } from '../postgres-adapter/postgres-adapter.js';
import { EazzioDatabase, DatabaseContext } from '../interface.js';

export class SupabaseAdapter implements EazzioDatabase {
  private readonly adapter: PostgresAdapter;

  constructor(configOrUrl: string | PostgresConfig) {
    this.adapter = new PostgresAdapter(configOrUrl);
  }

  public async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.adapter.query<T>(sql, params);
  }

  public async transaction<T>(
    fn: (tx: EazzioDatabase) => Promise<T>,
    context?: DatabaseContext,
  ): Promise<T> {
    return this.adapter.transaction<T>(fn, context);
  }

  public async healthCheck(): Promise<{ ok: boolean; latencyMs: number }> {
    return this.adapter.healthCheck();
  }

  public async close(): Promise<void> {
    return this.adapter.close();
  }
}
