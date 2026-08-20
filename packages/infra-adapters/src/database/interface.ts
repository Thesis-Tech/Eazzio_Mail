export interface EazzioDatabase {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(fn: (tx: EazzioDatabase) => Promise<T>): Promise<T>;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number }>;
}
