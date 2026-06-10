
-- Fix get_room_challenges_with_status to use each member's timezone for "current period"
CREATE OR REPLACE FUNCTION public.get_room_challenges_with_status(_room_id uuid)
 RETURNS TABLE(challenge_id uuid, title text, description text, emoji text, period_type text, target_minutes integer, duration_days integer, start_date date, is_active boolean, created_at timestamptz, members jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.is_room_member(_uid, _room_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.id, c.title, c.description, c.emoji, c.period_type, c.target_minutes,
         c.duration_days, c.start_date, c.is_active, c.created_at,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'user_id', rm.user_id,
             'display_name', p.display_name,
             'avatar_url', p.avatar_url,
             'avatar_flair', p.avatar_flair,
             'avatar_flair_color', p.avatar_flair_color,
             'seconds_current', COALESCE(cur.seconds_in_period, 0),
             'completed_current', COALESCE(cur.completed, false),
             'last_completed_at', last_completed.completed_at,
             'completed_periods_total', COALESCE(stats.completed_count, 0),
             'days_since_completed', CASE
                WHEN last_completed.period_start IS NULL THEN NULL
                ELSE GREATEST(0, ((now() AT TIME ZONE COALESCE(p.timezone,'UTC'))::date - last_completed.period_start))::int
             END
           ) ORDER BY p.display_name)
           FROM public.room_members rm
           JOIN public.profiles p ON p.user_id = rm.user_id
           LEFT JOIN LATERAL (
             SELECT (cp.period_key) AS period_key, (cp.period_start) AS period_start
             FROM public.compute_challenge_period(c.period_type, now(), COALESCE(p.timezone,'UTC')) cp
           ) per ON true
           LEFT JOIN LATERAL (
             SELECT seconds_in_period, completed
             FROM public.room_challenge_progress rcp
             WHERE rcp.challenge_id = c.id AND rcp.user_id = rm.user_id
               AND rcp.period_key = per.period_key
             LIMIT 1
           ) cur ON true
           LEFT JOIN LATERAL (
             SELECT period_start, completed_at FROM public.room_challenge_progress rcp2
             WHERE rcp2.challenge_id = c.id AND rcp2.user_id = rm.user_id AND rcp2.completed = true
             ORDER BY period_start DESC LIMIT 1
           ) last_completed ON true
           LEFT JOIN LATERAL (
             SELECT COUNT(*)::int AS completed_count FROM public.room_challenge_progress rcp3
             WHERE rcp3.challenge_id = c.id AND rcp3.user_id = rm.user_id AND rcp3.completed = true
           ) stats ON true
           WHERE rm.room_id = _room_id
         ), '[]'::jsonb) AS members
    FROM public.room_challenges c
   WHERE c.room_id = _room_id
   ORDER BY c.is_active DESC, c.created_at DESC;
END; $function$;

-- Dedupe room_achievements, keep earliest
DELETE FROM public.room_achievements a
USING public.room_achievements b
WHERE a.ctid < b.ctid
  AND a.room_id = b.room_id
  AND a.achievement_type = b.achievement_type;

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.room_achievements
  ADD CONSTRAINT room_achievements_room_type_unique UNIQUE (room_id, achievement_type);
