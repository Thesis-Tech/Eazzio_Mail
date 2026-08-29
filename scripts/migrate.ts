import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://eazzio_user:eazzio_password@localhost:5432/eazzio_mail';

const migrationsDir = path.resolve(
  __dirname,
  '../packages/infra-adapters/src/database/migrations',
);

async function runMigrations() {
  console.log(`🔌 Connecting to PostgreSQL at ${databaseUrl.replace(/:[^:@]+@/, ':****@')}...`);
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    // Ensure helper roles exist for RLS policies
    console.log('👤 Ensuring application roles exist...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'eazzio_app') THEN
          CREATE ROLE eazzio_app WITH LOGIN PASSWORD 'eazzio_app_password';
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'eazzio_ai_gateway') THEN
          CREATE ROLE eazzio_ai_gateway WITH LOGIN PASSWORD 'eazzio_ai_password';
        END IF;
      END
      $$;
    `);

    // Ensure migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const appliedResult = await client.query<{ version: string }>(
      'SELECT version FROM schema_migrations ORDER BY version ASC',
    );
    const appliedVersions = new Set(appliedResult.rows.map((r) => r.version));

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'))
      .sort();

    for (const file of files) {
      if (appliedVersions.has(file)) {
        console.log(`⏭️  Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`⚙️  Applying migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [file],
        );
        await client.query('COMMIT');
        console.log(`✅ Applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Migration failed on ${file}:`, err);
        throw err;
      }
    }

    console.log('🎉 All database migrations applied successfully!');
  } finally {
    await client.end();
  }
}

runMigrations().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
