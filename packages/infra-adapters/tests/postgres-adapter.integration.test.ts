import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgresAdapter } from '../src/database/postgres-adapter/postgres-adapter.js';

describe('PostgresAdapter Live PostgreSQL Integration Tests', () => {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://eazzio_user:eazzio_password@localhost:5432/eazzio_mail';
  let db: PostgresAdapter;

  beforeAll(async () => {
    db = new PostgresAdapter(connectionString);
  });

  afterAll(async () => {
    await db.close();
  });

  it('1. should connect and pass healthCheck against real PostgreSQL', async () => {
    const health = await db.healthCheck();
    expect(health.ok).toBe(true);
    expect(health.latencyMs).toBeGreaterThanOrEqual(1);
  });

  it('2. should execute simple SELECT query and return structured rows', async () => {
    const rows = await db.query<{ result: number }>('SELECT 42 as result');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.result).toBe(42);
  });

  it('3. should execute parameterized query correctly', async () => {
    const rows = await db.query<{ sum: number }>('SELECT ($1::int + $2::int) as sum', [15, 27]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sum).toBe(42);
  });

  it('4. should safely handle SQL injection payloads as literal parameters', async () => {
    const maliciousInput = "test' OR '1'='1'; DROP TABLE non_existent_table; --";
    const rows = await db.query<{ email: string }>('SELECT email FROM users WHERE email = $1', [
      maliciousInput,
    ]);
    // Should execute safely and find 0 rows without syntax or injection errors
    expect(rows).toHaveLength(0);
  });

  it('5. should execute real transactions and COMMIT persisted state', async () => {
    const testOrgId = crypto.randomUUID();
    const testOrgName = `Test Org ${Date.now()}`;

    await db.transaction(async (tx) => {
      await tx.query('INSERT INTO organizations (id, name) VALUES ($1, $2)', [
        testOrgId,
        testOrgName,
      ]);
    });

    const rows = await db.query<{ id: string; name: string }>(
      'SELECT id, name FROM organizations WHERE id = $1',
      [testOrgId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe(testOrgName);

    // Clean up
    await db.query('DELETE FROM organizations WHERE id = $1', [testOrgId]);
  });

  it('6. should ROLLBACK transaction changes when an error is thrown inside callback', async () => {
    const testOrgId = crypto.randomUUID();
    const testOrgName = `Rollback Org ${Date.now()}`;

    await expect(
      db.transaction(async (tx) => {
        await tx.query('INSERT INTO organizations (id, name) VALUES ($1, $2)', [
          testOrgId,
          testOrgName,
        ]);
        throw new Error('Simulated application failure during transaction');
      }),
    ).rejects.toThrow('Simulated application failure during transaction');

    const rows = await db.query('SELECT id FROM organizations WHERE id = $1', [testOrgId]);
    expect(rows).toHaveLength(0);
  });

  it('7. should support nested transaction savepoints with rollback isolation', async () => {
    const org1Id = crypto.randomUUID();
    const org2Id = crypto.randomUUID();

    await db.transaction(async (outerTx) => {
      await outerTx.query('INSERT INTO organizations (id, name) VALUES ($1, $2)', [
        org1Id,
        'Outer Org',
      ]);

      // Inner savepoint that fails
      try {
        await outerTx.transaction(async (innerTx) => {
          await innerTx.query('INSERT INTO organizations (id, name) VALUES ($1, $2)', [
            org2Id,
            'Inner Org',
          ]);
          throw new Error('Inner failure');
        });
      } catch {
        // Handled inner error
      }
    });

    const rowsOrg1 = await db.query('SELECT id FROM organizations WHERE id = $1', [org1Id]);
    const rowsOrg2 = await db.query('SELECT id FROM organizations WHERE id = $1', [org2Id]);

    expect(rowsOrg1).toHaveLength(1);
    expect(rowsOrg2).toHaveLength(0);

    // Clean up
    await db.query('DELETE FROM organizations WHERE id = $1', [org1Id]);
  });

  it('8. should safely set transaction session context (app.current_user_id)', async () => {
    const testUserId = crypto.randomUUID();

    await db.transaction(
      async (tx) => {
        const rows = await tx.query<{ current_user: string }>(
          `SELECT current_setting('app.current_user_id', true) as current_user`,
        );
        expect(rows[0]?.current_user).toBe(testUserId);
      },
      { userId: testUserId },
    );
  });

  it('9. should NOT leak session user context across pooled connections (Context Isolation)', async () => {
    const userA = crypto.randomUUID();

    // User A executes with session context
    await db.transaction(
      async (tx) => {
        const rows = await tx.query<{ current_user: string }>(
          `SELECT current_setting('app.current_user_id', true) as current_user`,
        );
        expect(rows[0]?.current_user).toBe(userA);
      },
      { userId: userA },
    );

    // Subsequent query on pool must NOT have User A context
    const nextRows = await db.query<{ current_user: string | null }>(
      `SELECT current_setting('app.current_user_id', true) as current_user`,
    );
    expect(nextRows[0]?.current_user == null || nextRows[0]?.current_user === '').toBe(true);
  });

  it('10. should track pool statistics and release connections back to pool', async () => {
    const initialStats = db.getPoolStats();
    expect(initialStats.total).toBeGreaterThanOrEqual(0);

    const concurrentQueries = Array.from({ length: 5 }, (_, i) =>
      db.query<{ idx: number }>('SELECT $1::int as idx', [i]),
    );
    const results = await Promise.all(concurrentQueries);
    expect(results).toHaveLength(5);

    const afterStats = db.getPoolStats();
    expect(afterStats.waiting).toBe(0);
  });
});
