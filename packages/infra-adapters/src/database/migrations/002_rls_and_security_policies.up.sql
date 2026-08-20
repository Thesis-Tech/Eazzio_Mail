-- Enable Row Level Security (RLS) on tenant-scoped tables
ALTER TABLE mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_aliases ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies based on current session user context
CREATE POLICY mailbox_isolation_policy ON mailboxes
  FOR ALL
  USING (owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY message_isolation_policy ON messages
  FOR ALL
  USING (
    mailbox_id IN (
      SELECT id FROM mailboxes WHERE owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    )
  );

CREATE POLICY folder_isolation_policy ON folders
  FOR ALL
  USING (
    mailbox_id IN (
      SELECT id FROM mailboxes WHERE owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    )
  );

CREATE POLICY label_isolation_policy ON labels
  FOR ALL
  USING (
    mailbox_id IN (
      SELECT id FROM mailboxes WHERE owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    )
  );

-- Append-only audit log: revoke UPDATE and DELETE from all application roles
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;
