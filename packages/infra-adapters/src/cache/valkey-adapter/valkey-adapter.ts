import { Redis, RedisOptions } from 'ioredis';
import { EazzioCache } from '../interface.js';

export interface ValkeyConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  url?: string;
  keyPrefix?: string;
  connectTimeout?: number;
  maxRetriesPerRequest?: number;
}

export class ValkeyCacheAdapter implements EazzioCache {
  private readonly client: Redis;

  constructor(config?: string | ValkeyConfig) {
    if (typeof config === 'string') {
      this.client = new Redis(config, {
        lazyConnect: false,
        maxRetriesPerRequest: 3,
      });
    } else if (config) {
      if (config.url) {
        this.client = new Redis(config.url, {
          keyPrefix: config.keyPrefix,
          maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
          connectTimeout: config.connectTimeout ?? 5000,
        });
      } else {
        const options: RedisOptions = {
          host: config.host ?? 'localhost',
          port: config.port ?? 6379,
          password: config.password,
          db: config.db ?? 0,
          keyPrefix: config.keyPrefix,
          maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
          connectTimeout: config.connectTimeout ?? 5000,
        };
        this.client = new Redis(options);
      }
    } else {
      this.client = new Redis({
        host: process.env.VALKEY_HOST || 'localhost',
        port: Number(process.env.VALKEY_PORT) || 6379,
        password: process.env.VALKEY_PASSWORD || undefined,
        maxRetriesPerRequest: 3,
      });
    }
  }

  public async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  public async incr(key: string, ttlSeconds?: number): Promise<number> {
    const val = await this.client.incr(key);
    if (val === 1 && ttlSeconds && ttlSeconds > 0) {
      await this.client.expire(key, ttlSeconds);
    }
    return val;
  }

  public async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.client.quit();
  }
}
