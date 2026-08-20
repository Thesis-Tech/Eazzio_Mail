export interface EazzioStorage {
  put(key: string, data: Buffer, contentType: string): Promise<{ key: string; sizeBytes: number }>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
  healthCheck(): Promise<{ ok: boolean }>;
}
