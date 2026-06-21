CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.mark_stale_members_offline()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.room_members
     SET is_online = false
   WHERE is_online = true
     AND (last_active_at IS NULL OR last_active_at < now() - interval '3 minutes');
$$;

-- Unschedule prior job with the same name if it exists, then reschedule.
DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'mark_stale_members_offline_every_2min';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'mark_stale_members_offline_every_2min',
  '*/2 * * * *',
  $$SELECT public.mark_stale_members_offline();$$
);

-- One-off cleanup of the historical "stuck online" rows.
SELECT public.mark_stale_members_offline();