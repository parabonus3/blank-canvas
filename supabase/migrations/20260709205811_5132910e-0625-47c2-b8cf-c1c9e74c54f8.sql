
DROP FUNCTION IF EXISTS public.get_room_challenges_with_status(uuid);

CREATE OR REPLACE FUNCTION public.get_room_challenges_with_status(_room_id uuid)
 RETURNS TABLE(challenge_id uuid, title text, description text, emoji text, period_type text, target_minutes integer, duration_days integer, start_date date, is_active boolean, is_ended boolean, created_at timestamp with time zone, members jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tz text;
  _today date;
  _week_start date;
BEGIN
  IF NOT public.is_room_member(auth.uid(), _room_id) THEN
    RETURN;
  END IF;
  _tz := public.get_room_timezone(_room_id);
  _today := (now() AT TIME ZONE _tz)::date;
  _week_start := date_trunc('week', _today)::date;

  RETURN QUERY
  SELECT c.id, c.title, c.description, c.emoji, c.period_type, c.target_minutes,
         c.duration_days, c.start_date, c.is_active,
         (c.duration_days IS NOT NULL AND (c.start_date + c.duration_days) <= _today) AS is_ended,
         c.created_at,
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
                ELSE GREATEST(0, (_today - last_completed.period_start))::int
             END
           ) ORDER BY p.display_name)
           FROM public.room_members rm
           JOIN public.profiles p ON p.user_id = rm.user_id
           LEFT JOIN LATERAL (
             SELECT seconds_in_period, completed
             FROM public.room_challenge_progress rcp
             WHERE rcp.challenge_id = c.id AND rcp.user_id = rm.user_id
               AND rcp.period_start = CASE WHEN c.period_type = 'weekly' THEN _week_start ELSE _today END
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
   ORDER BY (c.duration_days IS NOT NULL AND (c.start_date + c.duration_days) <= _today) ASC,
            c.is_active DESC, c.created_at DESC;
END; $function$;
