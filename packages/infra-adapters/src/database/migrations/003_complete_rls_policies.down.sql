-- Down Migration: 003_complete_rls_policies.down.sql

DROP POLICY IF EXISTS outbound_queue_policy ON outbound_queue;
ALTER TABLE outbound_queue NO FORCE ROW LEVEL SECURITY;
ALTER TABLE outbound_queue DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS message_recipients_policy ON message_recipients;
ALTER TABLE message_recipients NO FORCE ROW LEVEL SECURITY;
ALTER TABLE message_recipients DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS message_labels_policy ON message_labels;
ALTER TABLE message_labels NO FORCE ROW LEVEL SECURITY;
ALTER TABLE message_labels DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS domain_aliases_mailbox_policy ON domain_aliases;
ALTER TABLE domain_aliases NO FORCE ROW LEVEL SECURITY;
ALTER TABLE domain_aliases DISABLE ROW LEVEL SECURITY;

ALTER TABLE audit_log NO FORCE ROW LEVEL SECURITY;
ALTER TABLE messages NO FORCE ROW LEVEL SECURITY;
ALTER TABLE mailboxes NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS domains_org_policy ON domains;
ALTER TABLE domains NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS filters_mailbox_policy ON filters;
ALTER TABLE filters NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attachments_message_policy ON attachments;
ALTER TABLE attachments NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS threads_mailbox_policy ON threads;
ALTER TABLE threads NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS labels_mailbox_policy ON labels;
ALTER TABLE labels NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS folders_mailbox_policy ON folders;
ALTER TABLE folders NO FORCE ROW LEVEL SECURITY;
