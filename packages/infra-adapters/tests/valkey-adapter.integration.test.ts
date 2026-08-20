import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ValkeyCacheAdapter } from '../src/cache/valkey-adapter/valkey-adapter.js';

describe('ValkeyCacheAdapter Integration Tests (TASK-005)', () => {
  let cache: ValkeyCacheAdapter;
  const testPrefix = `test:${Date.now()}:`;

  beforeAll(async () => {
    cache = new ValkeyCacheAdapter({
      host: 'localhost',
      port: 6379,
    });
  });

  afterAll(async () => {
    await cache.close();
  });

  it('should pass healthCheck ping', async () => {
    const isHealthy = await cache.healthCheck();
    expect(isHealthy).toBe(true);
  });

  it('should set and get values with string keys', async () => {
    const key = `${testPrefix}foo`;
    await cache.set(key, 'bar');

    const value = await cache.get(key);
    expect(value).toBe('bar');
  });

  it('should delete keys successfully', async () => {
    const key = `${testPrefix}to_delete`;
    await cache.set(key, 'value');
    expect(await cache.get(key)).toBe('value');

    await cache.del(key);
    expect(await cache.get(key)).toBeNull();
  });

  it('should support atomic increment and TTL expiration', async () => {
    const key = `${testPrefix}counter`;
    const count1 = await cache.incr(key, 2); // 2s TTL
    expect(count1).toBe(1);

    const count2 = await cache.incr(key);
    expect(count2).toBe(2);

    const value = await cache.get(key);
    expect(value).toBe('2');

    // Wait 2.1 seconds for TTL expiration
    await new Promise((resolve) => setTimeout(resolve, 2100));
    expect(await cache.get(key)).toBeNull();
  });

  it('should support TTL on set', async () => {
    const key = `${testPrefix}ttl_set`;
    await cache.set(key, 'temporary', 1); // 1s TTL

    expect(await cache.get(key)).toBe('temporary');

    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(await cache.get(key)).toBeNull();
  });
});
