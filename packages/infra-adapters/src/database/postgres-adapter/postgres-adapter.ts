import pg from 'pg';
import { EazzioDatabase, DatabaseContext } from '../interface.js';

const { Pool } = pg;

export interface PostgresConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | { rejectUnauthorized?: boolean; ca?: string };
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  statementTimeoutMillis?: number;
}

export class PostgresClientAdapter implements EazzioDatabase {
  constructor(private readonly client: pg.PoolClient) {}

  public async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const res = await this.client.query(sql, params);
    return res.rows as T[];
  }

  public async transaction<T>(
    fn: (tx: EazzioDatabase) => Promise<T>,
    context?: DatabaseContext,
  ): Promise<T> {
    // Nested transaction support via PostgreSQL SAVEPOINT
    const savepointName = `sp_${crypto.randomUUID().replace(/-/g, '')}`;
    await this.client.query(`SAVEPOINT ${savepointName}`);
    if (context?.userId) {
      await this.client.query(`SELECT set_config('app.current_user_id', $1, true)`, [
        context.userId,
      ]);
    }
    if (context?.role) {
      await this.client.query(`SELECT set_config('app.current_role', $1, true)`, [context.role]);
    }

    try {
      const result = await fn(this);
      await this.client.query(`RELEASE SAVEPOINT ${savepointName}`);
      return result;
    } catch (err) {
      await this.client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      throw err;
    }
  }

  public async healthCheck(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.client.query('SELECT 1');
      return { ok: true, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }
}

export class PostgresAdapter implements EazzioDatabase {
  private readonly pool: pg.Pool;

  constructor(configOrUrl: string | PostgresConfig) {
    if (typeof configOrUrl === 'string') {
      if (!configOrUrl || !configOrUrl.trim()) {
        throw new Error('PostgresAdapter: Connection string cannot be empty');
      }
      this.pool = new Pool({
        connectionString: configOrUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    } else {
      if (!configOrUrl.connectionString && !configOrUrl.host) {
        throw new Error('PostgresAdapter: Either connectionString or host must be provided');
      }
      this.pool = new Pool({
        connectionString: configOrUrl.connectionString,
        host: configOrUrl.host,
        port: configOrUrl.port ?? 5432,
        database: configOrUrl.database,
        user: configOrUrl.user,
        password: configOrUrl.password,
        ssl: configOrUrl.ssl,
        max: configOrUrl.maxConnections ?? 20,
        idleTimeoutMillis: configOrUrl.idleTimeoutMillis ?? 30000,
        connectionTimeoutMillis: configOrUrl.connectionTimeoutMillis ?? 5000,
        statement_timeout: configOrUrl.statementTimeoutMillis,
      });
    }

    this.pool.on('error', (err) => {
      // Prevent unhandled errors on idle pool clients from crashing process
      console.error('[PostgresAdapter Pool Error]', err.message);
    });
  }

  public async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const res = await this.pool.query(sql, params);
    return res.rows as T[];
  }

  public async transaction<T>(
    fn: (tx: EazzioDatabase) => Promise<T>,
    context?: DatabaseContext,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (context?.userId) {
        // Set transaction-local session parameter (is_local = true)
        await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [context.userId]);
      }
      if (context?.role) {
        await client.query(`SELECT set_config('app.current_role', $1, true)`, [context.role]);
      }

      const txAdapter = new PostgresClientAdapter(client);
      const result = await fn(txAdapter);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Ignore rollback failure if connection was already closed
      }
      throw err;
    } finally {
      // Clear any session-level state before releasing client back to the pool
      try {
        await client.query('RESET ALL');
      } catch {
        // Client might already be disconnected
      }
      client.release();
    }
  }

  public async healthCheck(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.pool.query('SELECT 1');
      return { ok: true, latencyMs: Math.max(1, Date.now() - start) };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public getPoolStats(): { total: number; idle: number; waiting: number } {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }
}
