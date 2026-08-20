import { EazzioDatabase } from '../interface.js';

export class SupabaseAdapter implements EazzioDatabase {
  public readonly connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  public async query<T>(_sql: string, _params?: unknown[]): Promise<T[]> {
    return [] as T[];
  }

  public async transaction<T>(fn: (tx: EazzioDatabase) => Promise<T>): Promise<T> {
    return fn(this);
  }

  public async healthCheck(): Promise<{ ok: boolean; latencyMs: number }> {
    return { ok: true, latencyMs: 8 };
  }
}
