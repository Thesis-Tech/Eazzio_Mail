-- Down Migration: 006_snooze_and_schedule.down.sql

DROP INDEX IF EXISTS idx_outbound_queue_scheduled;
ALTER TABLE outbound_queue DROP COLUMN IF EXISTS scheduled_at;
ALTER TABLE messages DROP COLUMN IF EXISTS scheduled_at;

DROP INDEX IF EXISTS idx_threads_snoozed;
DROP INDEX IF EXISTS idx_messages_snoozed;

ALTER TABLE threads DROP COLUMN IF EXISTS is_snoozed;
ALTER TABLE threads DROP COLUMN IF EXISTS snoozed_until;
ALTER TABLE messages DROP COLUMN IF EXISTS is_snoozed;
ALTER TABLE messages DROP COLUMN IF EXISTS snoozed_until;
