-- Rollback Migration 004: Drop body_text and body_html columns
ALTER TABLE messages DROP COLUMN IF EXISTS body_text;
ALTER TABLE messages DROP COLUMN IF EXISTS body_html;
