export interface DatabaseContext {
  userId?: string;
  role?: string;
}

export interface EazzioDatabase {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(fn: (tx: EazzioDatabase) => Promise<T>, context?: DatabaseContext): Promise<T>;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number }>;
  close?(): Promise<void>;
}
