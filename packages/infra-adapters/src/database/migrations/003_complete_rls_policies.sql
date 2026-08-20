-- Up Migration: 003_complete_rls_policies.sql

-- 1. Folders Tenant/Mailbox Scoped Policy
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders FORCE ROW LEVEL SECURITY;
CREATE POLICY folders_mailbox_policy ON folders
  FOR ALL
  USING (mailbox_id IN (
    SELECT id FROM mailboxes WHERE owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  ))
  WITH CHECK (mailbox_id IN (
    SELECT id FROM mailboxes WHERE owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  ));

-- 2. Labels Tenant/Mailbox Scoped Policy
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels FORCE ROW LEVEL SECURITY;
CREATE POLICY labels_mailbox_policy ON labels
  FOR ALL
  USING (mailbox_id IN (
    SELECT id FROM mailboxes WHERE owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  ))
  WITH CHECK (mailbox_id IN (
    SELECT id FROM mailboxes WHERE owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  ));

-- 3. Threads Tenant/Mailbox Scoped Policy
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads FORCE ROW LEVEL SECURITY;
CREATE POLICY threads_mailbox_policy ON threads
  FOR ALL
  USING (mailbox_id IN (
    SELECT id FROM mailboxes WHERE owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  ))
  WITH CHECK (mailbox_id IN (
    SELECT id FROM mailboxes WHERE owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  ));

-- 4. Attachments Tenant Scoped Policy (via Messages -> Mailboxes)
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments FORCE ROW LEVEL SECURITY;
CREATE POLICY attachments_message_policy ON attachments
  FOR ALL
  USING (message_id IN (
    SELECT m.id FROM messages m
    JOIN mailboxes mb ON m.mailbox_id = mb.id
    WHERE mb.owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  ))
  WITH CHECK (message_id IN (
    SELECT m.id FROM messages m
    JOIN mailboxes mb ON m.mailbox_id = mb.id
    WHERE mb.owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  ));

-- 5. Filters Tenant/Mailbox Scoped Policy
ALTER TABLE filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE filters FORCE ROW LEVEL SECURITY;
CREATE POLICY filters_mailbox_policy ON filters
  FOR ALL
  USING (mailbox_id IN (
    SELECT id FROM mailboxes WHERE owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  ))
  WITH CHECK (mailbox_id IN (
    SELECT id FROM mailboxes WHERE owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  ));

-- 6. Domains Organization / Platform Admin Policy
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains FORCE ROW LEVEL SECURITY;
CREATE POLICY domains_org_policy ON domains
  FOR ALL
  USING (
    organization_id IN (
      SELECT scope_id FROM roles
      WHERE user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        AND scope_type = 'organization'
    )
    OR current_setting('app.current_role', true) = 'platform_admin'
  )
  WITH CHECK (
    organization_id IN (
      SELECT scope_id FROM roles
      WHERE user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        AND scope_type = 'organization'
    )
    OR current_setting('app.current_role', true) = 'platform_admin'
  );

-- 7. Force RLS on pre-existing tables to prevent owner bypass
ALTER TABLE mailboxes FORCE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

-- 8. Supporting Auxiliary Tables
ALTER TABLE domain_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_aliases FORCE ROW LEVEL SECURITY;
CREATE POLICY domain_aliases_mailbox_policy ON domain_aliases
  FOR ALL
  USING (target_mailbox_id IN (
    SELECT id FROM mailboxes WHERE owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  ))
  WITH CHECK (target_mailbox_id IN (
    SELECT id FROM mailboxes WHERE owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  ));

ALTER TABLE message_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_labels FORCE ROW LEVEL SECURITY;
CREATE POLICY message_labels_policy ON message_labels
  FOR ALL
  USING (message_id IN (
    SELECT m.id FROM messages m
    JOIN mailboxes mb ON m.mailbox_id = mb.id
    WHERE mb.owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  ))
  WITH CHECK (message_id IN (
    SELECT m.id FROM messages m
    JOIN mailboxes mb ON m.mailbox_id = mb.id
    WHERE mb.owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  ));

ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_recipients FORCE ROW LEVEL SECURITY;
CREATE POLICY message_recipients_policy ON message_recipients
  FOR ALL
  USING (message_id IN (
    SELECT m.id FROM messages m
    JOIN mailboxes mb ON m.mailbox_id = mb.id
    WHERE mb.owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  ))
  WITH CHECK (message_id IN (
    SELECT m.id FROM messages m
    JOIN mailboxes mb ON m.mailbox_id = mb.id
    WHERE mb.owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  ));

ALTER TABLE outbound_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_queue FORCE ROW LEVEL SECURITY;
CREATE POLICY outbound_queue_policy ON outbound_queue
  FOR ALL
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN mailboxes mb ON m.mailbox_id = mb.id
      WHERE mb.owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    )
    OR current_setting('app.current_role', true) IN ('platform_admin', 'system_service')
  )
  WITH CHECK (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN mailboxes mb ON m.mailbox_id = mb.id
      WHERE mb.owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    )
    OR current_setting('app.current_role', true) IN ('platform_admin', 'system_service')
  );

-- 9. Standard Non-Superuser Application Role (NOSUPERUSER, NOBYPASSRLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eazzio_app') THEN
    CREATE ROLE eazzio_app WITH LOGIN PASSWORD 'eazzio_app_password' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO eazzio_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO eazzio_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO eazzio_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO eazzio_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO eazzio_app;

-- Strict Immutability for Audit Log: Revoke UPDATE and DELETE on audit_log from application role
REVOKE UPDATE, DELETE ON audit_log FROM eazzio_app;
