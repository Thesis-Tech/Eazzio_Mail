-- Up Migration: 006_snooze_and_schedule.sql

-- Add snooze columns to messages and threads
ALTER TABLE messages ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_snoozed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE threads ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;
ALTER TABLE threads ADD COLUMN IF NOT EXISTS is_snoozed BOOLEAN NOT NULL DEFAULT false;

-- Add indexes for efficient snooze lookup
CREATE INDEX IF NOT EXISTS idx_messages_snoozed ON messages (mailbox_id, is_snoozed, snoozed_until);
CREATE INDEX IF NOT EXISTS idx_threads_snoozed ON threads (mailbox_id, is_snoozed, snoozed_until);

-- Add scheduled delivery columns to messages and outbound_queue
ALTER TABLE messages ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE outbound_queue ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Add index for scheduled delivery queue processing
CREATE INDEX IF NOT EXISTS idx_outbound_queue_scheduled ON outbound_queue (state, scheduled_at, next_attempt_at);
