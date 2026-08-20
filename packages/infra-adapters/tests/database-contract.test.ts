import { describe, it, expect } from 'vitest';
import { PostgresAdapter } from '../src/database/postgres-adapter/postgres-adapter.js';
import { SupabaseAdapter } from '../src/database/supabase-adapter/supabase-adapter.js';

describe('Database Adapter Contract & Configuration Tests (DECISIONS.md D-004)', () => {
  it('should throw clear error when initialized with empty connection string', () => {
    expect(() => new PostgresAdapter('')).toThrowError(
      'PostgresAdapter: Connection string cannot be empty',
    );
    expect(() => new PostgresAdapter('   ')).toThrowError(
      'PostgresAdapter: Connection string cannot be empty',
    );
  });

  it('should throw clear error when initialized with invalid config object', () => {
    expect(() => new PostgresAdapter({} as any)).toThrowError(
      'PostgresAdapter: Either connectionString or host must be provided',
    );
  });

  it('should instantiate PostgresAdapter and SupabaseAdapter with valid configuration', () => {
    const pgAdapter = new PostgresAdapter('postgresql://localhost:5432/eazzio_mail');
    expect(pgAdapter).toBeDefined();
    expect(typeof pgAdapter.query).toBe('function');
    expect(typeof pgAdapter.transaction).toBe('function');
    expect(typeof pgAdapter.healthCheck).toBe('function');

    const supabaseAdapter = new SupabaseAdapter({
      host: 'localhost',
      port: 5432,
      database: 'eazzio_mail',
      user: 'eazzio_user',
      password: 'eazzio_password',
    });
    expect(supabaseAdapter).toBeDefined();
    expect(typeof supabaseAdapter.query).toBe('function');
    expect(typeof supabaseAdapter.transaction).toBe('function');
  });

  it('should report health failure gracefully on unreachable host without hanging', async () => {
    const unreachableAdapter = new PostgresAdapter({
      host: '127.0.0.1',
      port: 54399, // Unused port
      database: 'invalid_db',
      user: 'invalid_user',
      password: 'invalid_password',
      connectionTimeoutMillis: 1000,
    });

    const health = await unreachableAdapter.healthCheck();
    expect(health.ok).toBe(false);
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    await unreachableAdapter.close();
  });
});
