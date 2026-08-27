import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Migrations & RLS Scripts Integrity', () => {
  const migrationsDir = path.resolve(__dirname, '../src/database/migrations');

  it('should have matching rollback scripts for every migration', () => {
    const files = fs.readdirSync(migrationsDir);
    const upFiles = files.filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'));
    const downFiles = files.filter((f) => f.endsWith('.down.sql'));

    expect(upFiles.length).toBe(6);
    expect(downFiles.length).toBe(6);

    for (const up of upFiles) {
      const baseName = up.replace('.sql', '');
      expect(downFiles).toContain(`${baseName}.down.sql`);
    }
  });

  it('should enforce append-only audit_log policy in migration 002', () => {
    const rlsSql = fs.readFileSync(
      path.join(migrationsDir, '002_rls_and_security_policies.sql'),
      'utf-8',
    );
    expect(rlsSql).toContain('REVOKE UPDATE, DELETE ON audit_log');
    expect(rlsSql).toContain('CREATE POLICY audit_log_insert_only');
  });

  it('should enforce AI gateway write revocation in migration 002', () => {
    const rlsSql = fs.readFileSync(
      path.join(migrationsDir, '002_rls_and_security_policies.sql'),
      'utf-8',
    );
    expect(rlsSql).toContain('REVOKE INSERT, UPDATE, DELETE ON messages FROM eazzio_ai_gateway');
    expect(rlsSql).toContain(
      'REVOKE INSERT, UPDATE, DELETE ON outbound_queue FROM eazzio_ai_gateway',
    );
  });

  it('should define complete tenant-scoped policies in migration 003', () => {
    const rlsSql = fs.readFileSync(
      path.join(migrationsDir, '003_complete_rls_policies.sql'),
      'utf-8',
    );
    expect(rlsSql).toContain('CREATE POLICY folders_mailbox_policy ON folders');
    expect(rlsSql).toContain('CREATE POLICY labels_mailbox_policy ON labels');
    expect(rlsSql).toContain('CREATE POLICY threads_mailbox_policy ON threads');
    expect(rlsSql).toContain('CREATE POLICY attachments_message_policy ON attachments');
    expect(rlsSql).toContain('CREATE POLICY filters_mailbox_policy ON filters');
    expect(rlsSql).toContain('CREATE POLICY domains_org_policy ON domains');
  });
});
