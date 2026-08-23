-- Migration 004: Add body_text and body_html columns to messages table
-- These columns store the parsed email body content extracted by MimeParser
-- during the inbound pipeline, enabling full body rendering in the web UI.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS body_text TEXT DEFAULT '';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS body_html TEXT DEFAULT '';
