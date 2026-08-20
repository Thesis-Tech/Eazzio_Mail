-- Up Migration: 001_initial_schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- 1.1 Identity & Access
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  display_name    TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  mfa_enabled     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfa_totp_secrets (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret_encrypted TEXT NOT NULL,
  confirmed_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_label    TEXT,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS api_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scopes          TEXT[] NOT NULL,
  token_hash      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type      TEXT NOT NULL, -- platform | organization | domain | mailbox
  scope_id        UUID,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_name       TEXT NOT NULL,
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 Organizations & Domains
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  policy          JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS domains (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  domain_name         TEXT UNIQUE NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  mx_verified         BOOLEAN NOT NULL DEFAULT false,
  spf_verified        BOOLEAN NOT NULL DEFAULT false,
  dkim_verified       BOOLEAN NOT NULL DEFAULT false,
  dmarc_verified      BOOLEAN NOT NULL DEFAULT false,
  dkim_private_key_ref TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS domain_aliases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id         UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  alias_address     CITEXT UNIQUE NOT NULL,
  target_mailbox_id UUID NOT NULL,
  is_disposable     BOOLEAN NOT NULL DEFAULT false,
  expires_at        TIMESTAMPTZ
);

-- 1.3 Mailbox Core
CREATE TABLE IF NOT EXISTS mailboxes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id       UUID REFERENCES domains(id),
  address         CITEXT UNIQUE NOT NULL,
  quota_bytes     BIGINT NOT NULL DEFAULT 5368709120,
  used_bytes      BIGINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key constraint from domain_aliases to mailboxes now that mailboxes table exists
ALTER TABLE domain_aliases
  ADD CONSTRAINT fk_domain_aliases_target_mailbox
  FOREIGN KEY (target_mailbox_id) REFERENCES mailboxes(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS folders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id      UUID NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES folders(id),
  name            TEXT NOT NULL,
  kind            TEXT NOT NULL DEFAULT 'custom',
  UNIQUE (mailbox_id, parent_folder_id, name)
);

CREATE TABLE IF NOT EXISTS labels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id      UUID NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  color           TEXT,
  UNIQUE (mailbox_id, name)
);

CREATE TABLE IF NOT EXISTS threads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id          UUID NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  subject_normalized  TEXT,
  last_message_at     TIMESTAMPTZ NOT NULL,
  message_count       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id          UUID NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  folder_id           UUID NOT NULL REFERENCES folders(id),
  thread_id           UUID REFERENCES threads(id),
  message_id_header   TEXT NOT NULL,
  in_reply_to         TEXT,
  references_header   TEXT,
  from_address        CITEXT NOT NULL,
  subject             TEXT,
  snippet             TEXT,
  size_bytes          INTEGER NOT NULL,
  raw_object_key      TEXT NOT NULL,
  is_read             BOOLEAN NOT NULL DEFAULT false,
  is_starred          BOOLEAN NOT NULL DEFAULT false,
  is_important        BOOLEAN NOT NULL DEFAULT false,
  spam_score          NUMERIC(5,4),
  auth_results        JSONB,
  direction           TEXT NOT NULL,
  delivery_state      TEXT,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_labels (
  message_id          UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  label_id            UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, label_id)
);

CREATE TABLE IF NOT EXISTS message_recipients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id          UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  address             CITEXT NOT NULL,
  kind                TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id          UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  filename            TEXT NOT NULL,
  mime_type           TEXT NOT NULL,
  size_bytes          INTEGER NOT NULL,
  sha256_hash         TEXT NOT NULL,
  object_key          TEXT NOT NULL,
  scan_status         TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS filters (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id          UUID NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  conditions          JSONB NOT NULL,
  actions             JSONB NOT NULL,
  is_enabled          BOOLEAN NOT NULL DEFAULT true,
  priority            INTEGER NOT NULL DEFAULT 0
);

-- 1.4 Delivery & Audit
CREATE TABLE IF NOT EXISTS outbound_queue (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id          UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  recipient_address   CITEXT NOT NULL,
  state               TEXT NOT NULL DEFAULT 'queued',
  attempt_count       INTEGER NOT NULL DEFAULT 0,
  next_attempt_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error          TEXT,
  idempotency_key     TEXT UNIQUE NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id       UUID REFERENCES users(id),
  actor_type          TEXT NOT NULL,
  action              TEXT NOT NULL,
  target_type         TEXT,
  target_id           UUID,
  metadata            JSONB NOT NULL DEFAULT '{}',
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_inbox ON messages(mailbox_id, folder_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(mailbox_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_outbound_queue_poll ON outbound_queue(state, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_mailboxes_owner ON mailboxes(owner_user_id);
