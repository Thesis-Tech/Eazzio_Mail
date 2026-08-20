import { describe, it, expect } from 'vitest';
import { PostgresAdapter } from '../src/database/postgres-adapter/postgres-adapter.js';
import { SupabaseAdapter } from '../src/database/supabase-adapter/supabase-adapter.js';
import { EazzioDatabase } from '../src/database/interface.js';

describe('Database Adapter Contract Tests (DECISIONS.md D-004)', () => {
  const adapters: { name: string; adapter: EazzioDatabase }[] = [
    { name: 'PostgresAdapter', adapter: new PostgresAdapter('postgresql://localhost:5432/test') },
    { name: 'SupabaseAdapter', adapter: new SupabaseAdapter('postgresql://supabase:5432/test') }
  ];

  adapters.forEach(({ name, adapter }) => {
    describe(`${name} compliance`, () => {
      it('should implement healthCheck correctly', async () => {
        const health = await adapter.healthCheck();
        expect(health.ok).toBe(true);
        expect(health.latencyMs).toBeGreaterThan(0);
      });

      it('should execute query method without throwing', async () => {
        const results = await adapter.query('SELECT 1');
        expect(Array.isArray(results)).toBe(true);
      });

      it('should support transaction isolation wrapper', async () => {
        const txResult = await adapter.transaction(async (tx) => {
          return tx.healthCheck();
        });
        expect(txResult.ok).toBe(true);
      });
    });
  });
});
