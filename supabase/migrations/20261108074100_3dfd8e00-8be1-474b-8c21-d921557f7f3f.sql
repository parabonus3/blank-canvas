ALTER TABLE public.time_blocks ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS block_reminders boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS time_blocks_reminder_idx ON public.time_blocks (start_at) WHERE reminder_sent_at IS NULL AND is_done = false;