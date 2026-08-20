import { EazzioStorage } from './interface.js';

export class MemoryStorageAdapter implements EazzioStorage {
  private readonly store = new Map<string, { data: Buffer; contentType: string }>();

  public async put(
    key: string,
    data: Buffer,
    contentType: string
  ): Promise<{ key: string; sizeBytes: number }> {
    this.store.set(key, { data: Buffer.from(data), contentType });
    return { key, sizeBytes: data.length };
  }

  public async get(key: string): Promise<Buffer> {
    const item = this.store.get(key);
    if (!item) {
      throw new Error(`Object not found: ${key}`);
    }
    return Buffer.from(item.data);
  }

  public async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  public async getSignedUrl(key: string, _expiresInSeconds: number = 3600): Promise<string> {
    if (!this.store.has(key)) {
      throw new Error(`Object not found: ${key}`);
    }
    return `https://storage.eazzio.local/signed/${encodeURIComponent(key)}`;
  }

  public async healthCheck(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}
