import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgresAdapter } from '../src/database/postgres-adapter/postgres-adapter.js';

describe('PostgreSQL Row Level Security (RLS) Comprehensive Integration Tests (TASK-003)', () => {
  const adminConnString =
    process.env.DATABASE_URL ||
    'postgresql://eazzio_user:eazzio_password@localhost:5432/eazzio_mail';
  const appConnString = 'postgresql://eazzio_app:eazzio_app_password@localhost:5432/eazzio_mail';

  let adminDb: PostgresAdapter;
  let appDb: PostgresAdapter;

  const testSuffix = Date.now().toString();

  // Tenant A IDs
  const userAId = crypto.randomUUID();
  const orgAId = crypto.randomUUID();
  const domainAId = crypto.randomUUID();
  const mailboxAId = crypto.randomUUID();
  const folderAId = crypto.randomUUID();
  const labelAId = crypto.randomUUID();
  const threadAId = crypto.randomUUID();
  const messageAId = crypto.randomUUID();
  const attachmentAId = crypto.randomUUID();
  const filterAId = crypto.randomUUID();

  // Tenant B IDs
  const userBId = crypto.randomUUID();
  const orgBId = crypto.randomUUID();
  const domainBId = crypto.randomUUID();
  const mailboxBId = crypto.randomUUID();
  const folderBId = crypto.randomUUID();
  const labelBId = crypto.randomUUID();
  const threadBId = crypto.randomUUID();
  const messageBId = crypto.randomUUID();
  const attachmentBId = crypto.randomUUID();
  const filterBId = crypto.randomUUID();

  beforeAll(async () => {
    adminDb = new PostgresAdapter(adminConnString);
    appDb = new PostgresAdapter(appConnString);

    // 1. Users
    await adminDb.query(
      `INSERT INTO users (id, email, password_hash, display_name) VALUES 
        ($1, $2, 'hashA', 'User A'),
        ($3, $4, 'hashB', 'User B')`,
      [userAId, `userA_${testSuffix}@eazzio.com`, userBId, `userB_${testSuffix}@eazzio.com`],
    );

    // 2. Organizations & Roles
    await adminDb.query(`INSERT INTO organizations (id, name) VALUES ($1, $2), ($3, $4)`, [
      orgAId,
      `Org A ${testSuffix}`,
      orgBId,
      `Org B ${testSuffix}`,
    ]);
    await adminDb.query(
      `INSERT INTO roles (scope_type, scope_id, user_id, role_name) VALUES 
        ('organization', $1, $2, 'org_admin'),
        ('organization', $3, $4, 'org_admin')`,
      [orgAId, userAId, orgBId, userBId],
    );

    // 3. Seed Tenant A Entities within Tenant A Context via appDb
    await appDb.transaction(
      async (tx) => {
        await tx.query(
          `INSERT INTO domains (id, organization_id, domain_name, verification_status) VALUES ($1, $2, $3, 'verified')`,
          [domainAId, orgAId, `doma-${testSuffix}.com`],
        );
        await tx.query(
          `INSERT INTO mailboxes (id, owner_user_id, domain_id, address) VALUES ($1, $2, $3, $4)`,
          [mailboxAId, userAId, domainAId, `userA@doma-${testSuffix}.com`],
        );
        await tx.query(
          `INSERT INTO folders (id, mailbox_id, name, kind) VALUES ($1, $2, 'Inbox A', 'inbox')`,
          [folderAId, mailboxAId],
        );
        await tx.query(
          `INSERT INTO labels (id, mailbox_id, name, color) VALUES ($1, $2, 'Work A', '#2D5BFF')`,
          [labelAId, mailboxAId],
        );
        await tx.query(
          `INSERT INTO threads (id, mailbox_id, subject_normalized, last_message_at, message_count) VALUES ($1, $2, 'subject a', now(), 1)`,
          [threadAId, mailboxAId],
        );
        await tx.query(
          `INSERT INTO messages (id, mailbox_id, folder_id, thread_id, message_id_header, from_address, subject, size_bytes, raw_object_key, direction) VALUES 
          ($1, $2, $3, $4, '<msgA@doma.com>', 'senderA@external.com', 'Subject A', 1024, 'objA', 'inbound')`,
          [messageAId, mailboxAId, folderAId, threadAId],
        );
        await tx.query(
          `INSERT INTO attachments (id, message_id, filename, mime_type, size_bytes, sha256_hash, object_key) VALUES 
          ($1, $2, 'fileA.pdf', 'application/pdf', 512, 'hashA', 'attA')`,
          [attachmentAId, messageAId],
        );
        await tx.query(
          `INSERT INTO filters (id, mailbox_id, conditions, actions) VALUES 
          ($1, $2, '{"from": "boss@a.com"}', '{"markImportant": true}')`,
          [filterAId, mailboxAId],
        );
      },
      { userId: userAId },
    );

    // 4. Seed Tenant B Entities within Tenant B Context via appDb
    await appDb.transaction(
      async (tx) => {
        await tx.query(
          `INSERT INTO domains (id, organization_id, domain_name, verification_status) VALUES ($1, $2, $3, 'verified')`,
          [domainBId, orgBId, `domb-${testSuffix}.com`],
        );
        await tx.query(
          `INSERT INTO mailboxes (id, owner_user_id, domain_id, address) VALUES ($1, $2, $3, $4)`,
          [mailboxBId, userBId, domainBId, `userB@domb-${testSuffix}.com`],
        );
        await tx.query(
          `INSERT INTO folders (id, mailbox_id, name, kind) VALUES ($1, $2, 'Inbox B', 'inbox')`,
          [folderBId, mailboxBId],
        );
        await tx.query(
          `INSERT INTO labels (id, mailbox_id, name, color) VALUES ($1, $2, 'Work B', '#FFA43D')`,
          [labelBId, mailboxBId],
        );
        await tx.query(
          `INSERT INTO threads (id, mailbox_id, subject_normalized, last_message_at, message_count) VALUES ($1, $2, 'subject b', now(), 1)`,
          [threadBId, mailboxBId],
        );
        await tx.query(
          `INSERT INTO messages (id, mailbox_id, folder_id, thread_id, message_id_header, from_address, subject, size_bytes, raw_object_key, direction) VALUES 
          ($1, $2, $3, $4, '<msgB@domb.com>', 'senderB@external.com', 'Subject B', 2048, 'objB', 'inbound')`,
          [messageBId, mailboxBId, folderBId, threadBId],
        );
        await tx.query(
          `INSERT INTO attachments (id, message_id, filename, mime_type, size_bytes, sha256_hash, object_key) VALUES 
          ($1, $2, 'fileB.pdf', 'application/pdf', 1024, 'hashB', 'attB')`,
          [attachmentBId, messageBId],
        );
        await tx.query(
          `INSERT INTO filters (id, mailbox_id, conditions, actions) VALUES 
          ($1, $2, '{"from": "boss@b.com"}', '{"markImportant": true}')`,
          [filterBId, mailboxBId],
        );
      },
      { userId: userBId },
    );
  });

  afterAll(async () => {
    // Teardown with admin connection
    await adminDb.query('DELETE FROM audit_log WHERE actor_user_id IN ($1, $2)', [
      userAId,
      userBId,
    ]);
    await adminDb.query('DELETE FROM users WHERE id IN ($1, $2)', [userAId, userBId]);
    await adminDb.query('DELETE FROM organizations WHERE id IN ($1, $2)', [orgAId, orgBId]);
    await appDb.close();
    await adminDb.close();
  });

  describe('1. Positive Legitimate Access Tests (User A)', () => {
    it('should allow User A to read own mailbox and all child entities', async () => {
      await appDb.transaction(
        async (tx) => {
          const mailboxes = await tx.query('SELECT id FROM mailboxes');
          expect(mailboxes).toHaveLength(1);
          expect(mailboxes[0]?.id).toBe(mailboxAId);

          const folders = await tx.query('SELECT id FROM folders');
          expect(folders).toHaveLength(1);
          expect(folders[0]?.id).toBe(folderAId);

          const labels = await tx.query('SELECT id FROM labels');
          expect(labels).toHaveLength(1);
          expect(labels[0]?.id).toBe(labelAId);

          const threads = await tx.query('SELECT id FROM threads');
          expect(threads).toHaveLength(1);
          expect(threads[0]?.id).toBe(threadAId);

          const messages = await tx.query('SELECT id FROM messages');
          expect(messages).toHaveLength(1);
          expect(messages[0]?.id).toBe(messageAId);

          const attachments = await tx.query('SELECT id FROM attachments');
          expect(attachments).toHaveLength(1);
          expect(attachments[0]?.id).toBe(attachmentAId);

          const filters = await tx.query('SELECT id FROM filters');
          expect(filters).toHaveLength(1);
          expect(filters[0]?.id).toBe(filterAId);

          const domains = await tx.query('SELECT id FROM domains');
          expect(domains).toHaveLength(1);
          expect(domains[0]?.id).toBe(domainAId);
        },
        { userId: userAId },
      );
    });

    it('should allow User A to create, update, and delete own folders and labels', async () => {
      const customFolderId = crypto.randomUUID();
      await appDb.transaction(
        async (tx) => {
          // INSERT own folder
          await tx.query(
            'INSERT INTO folders (id, mailbox_id, name, kind) VALUES ($1, $2, $3, $4)',
            [customFolderId, mailboxAId, 'Projects', 'custom'],
          );

          // UPDATE own folder
          await tx.query('UPDATE folders SET name = $1 WHERE id = $2', [
            'Archived Projects',
            customFolderId,
          ]);

          const updated = await tx.query<{ name: string }>(
            'SELECT name FROM folders WHERE id = $1',
            [customFolderId],
          );
          expect(updated[0]?.name).toBe('Archived Projects');

          // DELETE own folder
          await tx.query('DELETE FROM folders WHERE id = $1', [customFolderId]);
          const deleted = await tx.query('SELECT id FROM folders WHERE id = $1', [customFolderId]);
          expect(deleted).toHaveLength(0);
        },
        { userId: userAId },
      );
    });
  });

  describe('2. Negative Cross-Tenant SELECT Tests (User A attempting to view User B data)', () => {
    it('should not return User B mailbox to User A', async () => {
      await appDb.transaction(
        async (tx) => {
          const rows = await tx.query('SELECT id FROM mailboxes WHERE id = $1', [mailboxBId]);
          expect(rows).toHaveLength(0);
        },
        { userId: userAId },
      );
    });

    it('should not return User B folder to User A', async () => {
      await appDb.transaction(
        async (tx) => {
          const rows = await tx.query('SELECT id FROM folders WHERE id = $1', [folderBId]);
          expect(rows).toHaveLength(0);
        },
        { userId: userAId },
      );
    });

    it('should not return User B label to User A', async () => {
      await appDb.transaction(
        async (tx) => {
          const rows = await tx.query('SELECT id FROM labels WHERE id = $1', [labelBId]);
          expect(rows).toHaveLength(0);
        },
        { userId: userAId },
      );
    });

    it('should not return User B thread to User A', async () => {
      await appDb.transaction(
        async (tx) => {
          const rows = await tx.query('SELECT id FROM threads WHERE id = $1', [threadBId]);
          expect(rows).toHaveLength(0);
        },
        { userId: userAId },
      );
    });

    it('should not return User B message to User A', async () => {
      await appDb.transaction(
        async (tx) => {
          const rows = await tx.query('SELECT id FROM messages WHERE id = $1', [messageBId]);
          expect(rows).toHaveLength(0);
        },
        { userId: userAId },
      );
    });

    it('should not return User B attachment to User A', async () => {
      await appDb.transaction(
        async (tx) => {
          const rows = await tx.query('SELECT id FROM attachments WHERE id = $1', [attachmentBId]);
          expect(rows).toHaveLength(0);
        },
        { userId: userAId },
      );
    });

    it('should not return User B filter to User A', async () => {
      await appDb.transaction(
        async (tx) => {
          const rows = await tx.query('SELECT id FROM filters WHERE id = $1', [filterBId]);
          expect(rows).toHaveLength(0);
        },
        { userId: userAId },
      );
    });

    it('should not return User B domain to User A', async () => {
      await appDb.transaction(
        async (tx) => {
          const rows = await tx.query('SELECT id FROM domains WHERE id = $1', [domainBId]);
          expect(rows).toHaveLength(0);
        },
        { userId: userAId },
      );
    });
  });

  describe('3. Negative Cross-Tenant INSERT / WITH CHECK Tests (User A creating objects for User B)', () => {
    it('should block User A inserting a folder into User B mailbox', async () => {
      const maliciousFolderId = crypto.randomUUID();
      await expect(
        appDb.transaction(
          async (tx) => {
            await tx.query(
              'INSERT INTO folders (id, mailbox_id, name, kind) VALUES ($1, $2, $3, $4)',
              [maliciousFolderId, mailboxBId, 'Hacked Folder', 'custom'],
            );
          },
          { userId: userAId },
        ),
      ).rejects.toThrow();
    });

    it('should block User A inserting a label into User B mailbox', async () => {
      const maliciousLabelId = crypto.randomUUID();
      await expect(
        appDb.transaction(
          async (tx) => {
            await tx.query(
              'INSERT INTO labels (id, mailbox_id, name, color) VALUES ($1, $2, $3, $4)',
              [maliciousLabelId, mailboxBId, 'Hacked Label', '#FF0000'],
            );
          },
          { userId: userAId },
        ),
      ).rejects.toThrow();
    });

    it('should block User A inserting an attachment referencing User B message', async () => {
      const maliciousAttId = crypto.randomUUID();
      await expect(
        appDb.transaction(
          async (tx) => {
            await tx.query(
              'INSERT INTO attachments (id, message_id, filename, mime_type, size_bytes, sha256_hash, object_key) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [
                maliciousAttId,
                messageBId,
                'exploit.exe',
                'application/octet-stream',
                100,
                'hash',
                'key',
              ],
            );
          },
          { userId: userAId },
        ),
      ).rejects.toThrow();
    });

    it('should block User A inserting a domain into User B organization', async () => {
      const maliciousDomainId = crypto.randomUUID();
      await expect(
        appDb.transaction(
          async (tx) => {
            await tx.query(
              'INSERT INTO domains (id, organization_id, domain_name) VALUES ($1, $2, $3)',
              [maliciousDomainId, orgBId, `stolen-${testSuffix}.com`],
            );
          },
          { userId: userAId },
        ),
      ).rejects.toThrow();
    });
  });

  describe('4. Negative Ownership Reassignment / UPDATE Attacks', () => {
    it('should block User A reassigning own folder to User B mailbox', async () => {
      await expect(
        appDb.transaction(
          async (tx) => {
            await tx.query('UPDATE folders SET mailbox_id = $1 WHERE id = $2', [
              mailboxBId,
              folderAId,
            ]);
          },
          { userId: userAId },
        ),
      ).rejects.toThrow();
    });

    it('should block User A reassigning own label to User B mailbox', async () => {
      await expect(
        appDb.transaction(
          async (tx) => {
            await tx.query('UPDATE labels SET mailbox_id = $1 WHERE id = $2', [
              mailboxBId,
              labelAId,
            ]);
          },
          { userId: userAId },
        ),
      ).rejects.toThrow();
    });

    it('should block User A reassigning own domain to User B organization', async () => {
      await expect(
        appDb.transaction(
          async (tx) => {
            await tx.query('UPDATE domains SET organization_id = $1 WHERE id = $2', [
              orgBId,
              domainAId,
            ]);
          },
          { userId: userAId },
        ),
      ).rejects.toThrow();
    });
  });

  describe('5. Negative Cross-Tenant DELETE Attacks', () => {
    it('should not delete User B folder when User A attempts deletion', async () => {
      await appDb.transaction(
        async (tx) => {
          await tx.query('DELETE FROM folders WHERE id = $1', [folderBId]);
        },
        { userId: userAId },
      );

      // Verify User B folder is intact
      await appDb.transaction(
        async (tx) => {
          const rows = await tx.query('SELECT id FROM folders WHERE id = $1', [folderBId]);
          expect(rows).toHaveLength(1);
        },
        { userId: userBId },
      );
    });

    it('should not delete User B domain when User A attempts deletion', async () => {
      await appDb.transaction(
        async (tx) => {
          await tx.query('DELETE FROM domains WHERE id = $1', [domainBId]);
        },
        { userId: userAId },
      );

      // Verify User B domain is intact
      await appDb.transaction(
        async (tx) => {
          const rows = await tx.query('SELECT id FROM domains WHERE id = $1', [domainBId]);
          expect(rows).toHaveLength(1);
        },
        { userId: userBId },
      );
    });
  });

  describe('6. Immutable Audit Log Security Rules', () => {
    it('should reject UPDATE and DELETE operations on audit_log from application role', async () => {
      const testAuditId = crypto.randomUUID();

      // Insert audit record via appDb
      await appDb.query(
        `INSERT INTO audit_log (id, actor_user_id, actor_type, action, metadata) VALUES ($1, $2, 'user', 'login', '{"ip":"127.0.0.1"}')`,
        [testAuditId, userAId],
      );

      // Attempting to update audit log should be strictly denied
      await expect(
        appDb.query('UPDATE audit_log SET action = $1 WHERE id = $2', ['tampered', testAuditId]),
      ).rejects.toThrow();

      // Attempting to delete audit log should be strictly denied
      await expect(
        appDb.query('DELETE FROM audit_log WHERE id = $1', [testAuditId]),
      ).rejects.toThrow();
    });
  });
});
