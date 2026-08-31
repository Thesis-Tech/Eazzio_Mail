-- Up Migration: 007_user_preferences.sql
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  density               TEXT NOT NULL DEFAULT 'default',
  theme                 TEXT NOT NULL DEFAULT 'dark-oled',
  inbox_type            TEXT NOT NULL DEFAULT 'default',
  reading_pane          TEXT NOT NULL DEFAULT 'right',
  conversation_view     BOOLEAN NOT NULL DEFAULT true,
  signature_text        TEXT NOT NULL DEFAULT '',
  signature_enabled     BOOLEAN NOT NULL DEFAULT false,
  auto_reply_enabled    BOOLEAN NOT NULL DEFAULT false,
  auto_reply_subject    TEXT NOT NULL DEFAULT '',
  auto_reply_body       TEXT NOT NULL DEFAULT '',
  auto_reply_start_date TIMESTAMPTZ,
  auto_reply_end_date   TIMESTAMPTZ,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_enabled         BOOLEAN NOT NULL DEFAULT true,
  spam_threshold        NUMERIC(3,2) NOT NULL DEFAULT 0.85,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
