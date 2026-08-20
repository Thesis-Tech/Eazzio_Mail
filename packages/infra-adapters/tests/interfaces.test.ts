import { describe, it, expect } from 'vitest';
import {
  EazzioDatabase,
  EazzioStorage,
  EazzioCache,
  EazzioAI,
  EazzioEmailTransport,
} from '../src/index.js';

describe('Infra Adapter Interfaces', () => {
  it('should define valid TypeScript interface types', () => {
    const mockDb: EazzioDatabase = {
      query: async () => [],
      transaction: async (fn) => fn(mockDb),
      healthCheck: async () => ({ ok: true, latencyMs: 1 }),
    };
    expect(mockDb.healthCheck).toBeDefined();
  });
});
