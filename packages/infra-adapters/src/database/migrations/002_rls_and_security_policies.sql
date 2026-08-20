-- Up Migration: 002_rls_and_security_policies.sql

-- Enable RLS on core tenant-scoped tables
ALTER TABLE mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 1. Mailbox Ownership RLS Policy
CREATE POLICY mailbox_owner_policy ON mailboxes
  FOR ALL
  USING (owner_user_id = current_setting('app.current_user_id', true)::uuid);

-- 2. Messages Tenant/Mailbox Scoped Policy
CREATE POLICY messages_mailbox_policy ON messages
  FOR ALL
  USING (mailbox_id IN (
    SELECT id FROM mailboxes WHERE owner_user_id = current_setting('app.current_user_id', true)::uuid
  ));

-- 3. Append-Only Audit Log Policy (No application role UPDATE/DELETE)
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;
REVOKE UPDATE, DELETE ON audit_log FROM eazzio_user;

CREATE POLICY audit_log_insert_only ON audit_log
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY audit_log_select_policy ON audit_log
  FOR SELECT
  USING (
    -- Platform admin or actor
    actor_user_id = current_setting('app.current_user_id', true)::uuid
    OR current_setting('app.current_role', true) = 'platform_admin'
  );

-- 4. AI Gateway Role DB Permissions (DECISIONS.md D-007, Security.md Section 8.4)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eazzio_ai_gateway') THEN
    CREATE ROLE eazzio_ai_gateway;
  END IF;
END
$$;

-- Grant select to AI Gateway for summarization/classification
GRANT SELECT ON messages, threads, mailboxes TO eazzio_ai_gateway;

-- Explicitly revoke write permissions on decision fields from AI role
REVOKE INSERT, UPDATE, DELETE ON messages FROM eazzio_ai_gateway;
REVOKE INSERT, UPDATE, DELETE ON outbound_queue FROM eazzio_ai_gateway;
REVOKE INSERT, UPDATE, DELETE ON audit_log FROM eazzio_ai_gateway;
