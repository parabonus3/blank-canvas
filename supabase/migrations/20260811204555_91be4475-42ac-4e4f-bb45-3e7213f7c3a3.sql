CREATE OR REPLACE FUNCTION public.get_room_challenge_history(_room_id uuid)
RETURNS TABLE(
  challenge_id uuid,
  title text,
  description text,
  emoji text,
  period_type text,
  target_minutes integer,
  start_date date,
  end_date date,
  total_periods integer,
  created_at timestamp with time zone,
  members jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _tz text;
  _today date;
BEGIN
  IF NOT public.is_room_member(auth.uid(), _room_id) THEN
    RETURN;
  END IF;

  _tz := public.get_room_timezone(_room_id);
  _today := (now() AT TIME ZONE _tz)::date;

  RETURN QUERY
  WITH ended AS (
    SELECT c.*,
           CASE
             WHEN c.duration_days IS NOT NULL THEN LEAST((c.start_date + c.duration_days)::date, _today)
             ELSE _today
           END AS eff_end
      FROM public.room_challenges c
     WHERE c.room_id = _room_id
       AND (
         c.is_active = false
         OR (c.duration_days IS NOT NULL AND (c.start_date + c.duration_days) <= _today)
       )
  )
  SELECT e.id,
         e.title,
         e.description,
         e.emoji,
         e.period_type,
         e.target_minutes,
         e.start_date,
         e.eff_end AS end_date,
         GREATEST(
           1,
           CASE
             WHEN e.period_type = 'weekly'
               THEN (FLOOR((e.eff_end - date_trunc('week', e.start_date)::date) / 7.0) + 1)::int
             ELSE (e.eff_end - e.start_date)
           END
         ) AS total_periods,
         e.created_at,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
                    'user_id', rm.user_id,
                    'display_name', p.display_name,
                    'avatar_url', p.avatar_url,
                    'avatar_flair', p.avatar_flair,
                    'avatar_flair_color', p.avatar_flair_color,
                    'total_seconds', COALESCE(agg.total_seconds, 0),
                    'completed_periods', COALESCE(agg.completed_periods, 0)
                  ) ORDER BY COALESCE(agg.completed_periods, 0) DESC, COALESCE(agg.total_seconds, 0) DESC)
             FROM public.room_members rm
             JOIN public.profiles p ON p.user_id = rm.user_id
             LEFT JOIN LATERAL (
               SELECT COALESCE(SUM(rcp.seconds_in_period), 0)::int AS total_seconds,
                      COUNT(*) FILTER (WHERE rcp.completed)::int AS completed_periods
                 FROM public.room_challenge_progress rcp
                WHERE rcp.challenge_id = e.id AND rcp.user_id = rm.user_id
             ) agg ON true
            WHERE rm.room_id = _room_id
         ), '[]'::jsonb) AS members
    FROM ended e
   ORDER BY e.eff_end DESC, e.created_at DESC;
END; $function$;

REVOKE ALL ON FUNCTION public.get_room_challenge_history(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_room_challenge_history(uuid) TO authenticated;