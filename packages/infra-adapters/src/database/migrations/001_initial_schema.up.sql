-- Extension for UUID and case-insensitive text
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- 1.1 Identity & Access
CREATE TABLE IF NOT EXISTS users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           citext UNIQUE NOT NULL,
  password_hash   text NOT NULL,
  display_name    text,
  status          text NOT NULL DEFAULT 'active',
  mfa_enabled     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfa_totp_secrets (
  user_id          uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret_encrypted text NOT NULL,
  confirmed_at     timestamptz
);

CREATE TABLE IF NOT EXISTS sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_label    text,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  revoked_at      timestamptz
);

CREATE TABLE IF NOT EXISTS api_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scopes          text[] NOT NULL,
  token_hash      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz,
  revoked_at      timestamptz
);

CREATE TABLE IF NOT EXISTS roles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type      text NOT NULL,
  scope_id        uuid,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_name       text NOT NULL,
  granted_at      timestamptz NOT NULL DEFAULT now()
);

-- 1.2 Organizations & Domains
CREATE TABLE IF NOT EXISTS organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  policy          jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS domains (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid REFERENCES organizations(id) ON DELETE CASCADE,
  domain_name         text UNIQUE NOT NULL,
  verification_status text NOT NULL DEFAULT 'pending',
  mx_verified         boolean NOT NULL DEFAULT false,
  spf_verified        boolean NOT NULL DEFAULT false,
  dkim_verified       boolean NOT NULL DEFAULT false,
  dmarc_verified      boolean NOT NULL DEFAULT false,
  dkim_private_key_ref text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  activated_at        timestamptz
);

-- 1.3 Mailbox Core
CREATE TABLE IF NOT EXISTS mailboxes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id       uuid REFERENCES domains(id),
  address         citext UNIQUE NOT NULL,
  quota_bytes     bigint NOT NULL DEFAULT 5368709120,
  used_bytes      bigint NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS domain_aliases (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id         uuid NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  alias_address     citext UNIQUE NOT NULL,
  target_mailbox_id uuid NOT NULL REFERENCES mailboxes(id),
  is_disposable     boolean NOT NULL DEFAULT false,
  expires_at        timestamptz
);

CREATE TABLE IF NOT EXISTS folders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id       uuid NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  parent_folder_id uuid REFERENCES folders(id),
  name             text NOT NULL,
  kind             text NOT NULL DEFAULT 'custom',
  UNIQUE (mailbox_id, parent_folder_id, name)
);

CREATE TABLE IF NOT EXISTS labels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id      uuid NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  name            text NOT NULL,
  color           text,
  UNIQUE (mailbox_id, name)
);

CREATE TABLE IF NOT EXISTS threads (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id         uuid NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  subject_normalized text,
  last_message_at    timestamptz NOT NULL,
  message_count      integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id        uuid NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  folder_id         uuid NOT NULL REFERENCES folders(id),
  thread_id         uuid REFERENCES threads(id),
  message_id_header text NOT NULL,
  in_reply_to       text,
  references_header text,
  from_address      citext NOT NULL,
  subject           text,
  snippet           text,
  size_bytes        integer NOT NULL,
  raw_object_key    text NOT NULL,
  is_read           boolean NOT NULL DEFAULT false,
  is_starred        boolean NOT NULL DEFAULT false,
  is_important      boolean NOT NULL DEFAULT false,
  spam_score        numeric(5,4),
  auth_results      jsonb,
  direction         text NOT NULL,
  delivery_state    text,
  received_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_labels (
  message_id      uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  label_id        uuid NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, label_id)
);

CREATE TABLE IF NOT EXISTS message_recipients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  address         citext NOT NULL,
  kind            text NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  filename        text NOT NULL,
  mime_type       text NOT NULL,
  size_bytes      integer NOT NULL,
  sha256_hash     text NOT NULL,
  object_key      text NOT NULL,
  scan_status     text NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS filters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id      uuid NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  conditions      jsonb NOT NULL,
  actions         jsonb NOT NULL,
  is_enabled      boolean NOT NULL DEFAULT true,
  priority        integer NOT NULL DEFAULT 0
);

-- 1.4 Delivery & Audit
CREATE TABLE IF NOT EXISTS outbound_queue (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id        uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  recipient_address citext NOT NULL,
  state             text NOT NULL DEFAULT 'queued',
  attempt_count     integer NOT NULL DEFAULT 0,
  next_attempt_at   timestamptz NOT NULL DEFAULT now(),
  last_error        text,
  idempotency_key   text UNIQUE NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   uuid REFERENCES users(id),
  actor_type      text NOT NULL,
  action          text NOT NULL,
  target_type     text,
  target_id       uuid,
  metadata        jsonb NOT NULL DEFAULT '{}',
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_messages_inbox ON messages(mailbox_id, folder_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(mailbox_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_outbound_queue ON outbound_queue(state, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_domain_aliases ON domain_aliases(alias_address);
CREATE INDEX IF NOT EXISTS idx_mailboxes_address ON mailboxes(address);
