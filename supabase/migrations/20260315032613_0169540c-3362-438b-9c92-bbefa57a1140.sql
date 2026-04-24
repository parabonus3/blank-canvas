
CREATE OR REPLACE FUNCTION public.get_member_profile_stats(
  _user_id uuid,
  _room_id uuid
)
RETURNS TABLE(
  hours_today numeric,
  hours_week numeric,
  room_rank integer,
  streak integer,
  best_session integer,
  recent_activities jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _hours_today numeric;
  _hours_week numeric;
  _room_rank integer;
  _streak integer;
  _best_session integer;
  _recent jsonb;
  _check_date date;
  _has_activity boolean;
BEGIN
  -- Hours today
  SELECT COALESCE(SUM(te.duration), 0) / 3600.0
  INTO _hours_today
  FROM public.time_entries te
  WHERE te.user_id = _user_id
    AND te.end_time IS NOT NULL
    AND te.start_time >= CURRENT_DATE;

  -- Hours this week
  SELECT COALESCE(SUM(te.duration), 0) / 3600.0
  INTO _hours_week
  FROM public.time_entries te
  WHERE te.user_id = _user_id
    AND te.end_time IS NOT NULL
    AND te.start_time >= (CURRENT_DATE - INTERVAL '7 days');

  -- Room rank
  SELECT ranked.rank INTO _room_rank
  FROM (
    SELECT rm.user_id, ROW_NUMBER() OVER (ORDER BY rm.total_seconds DESC) AS rank
    FROM public.room_members rm
    WHERE rm.room_id = _room_id
  ) ranked
  WHERE ranked.user_id = _user_id;

  -- Streak
  _streak := 0;
  _check_date := CURRENT_DATE;
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.time_entries te
      WHERE te.user_id = _user_id
        AND te.end_time IS NOT NULL
        AND te.start_time::date = _check_date
    ) INTO _has_activity;

    IF NOT _has_activity AND _check_date < CURRENT_DATE THEN
      EXIT;
    END IF;

    IF _has_activity THEN
      _streak := _streak + 1;
    END IF;

    _check_date := _check_date - 1;
    IF _streak > 365 THEN EXIT; END IF;
  END LOOP;

  -- Best session
  SELECT COALESCE(MAX(te.duration), 0)::integer
  INTO _best_session
  FROM public.time_entries te
  WHERE te.user_id = _user_id AND te.end_time IS NOT NULL;

  -- Recent activities (last 5 from this room)
  SELECT COALESCE(jsonb_agg(row_to_json(sub.*)), '[]'::jsonb)
  INTO _recent
  FROM (
    SELECT ral.action_type, ral.metadata, ral.created_at
    FROM public.room_activity_log ral
    WHERE ral.room_id = _room_id AND ral.user_id = _user_id
    ORDER BY ral.created_at DESC
    LIMIT 5
  ) sub;

  RETURN QUERY SELECT _hours_today, _hours_week, COALESCE(_room_rank, 0)::integer, _streak, _best_session, _recent;
END;
$$;
