export interface SearchHit<T = Record<string, unknown>> {
  id: string;
  score: number;
  source: T;
}

export interface SearchResult<T = Record<string, unknown>> {
  total: number;
  hits: SearchHit<T>[];
}

export interface EazzioSearch {
  createIndexIfNotExists(index: string, mappings?: Record<string, unknown>): Promise<void>;
  deleteIndex(index: string): Promise<void>;
  indexDocument(index: string, id: string, doc: Record<string, unknown>): Promise<void>;
  deleteDocument(index: string, id: string): Promise<void>;
  search<T = Record<string, unknown>>(
    index: string,
    query: Record<string, unknown>,
  ): Promise<SearchResult<T>>;
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
}
