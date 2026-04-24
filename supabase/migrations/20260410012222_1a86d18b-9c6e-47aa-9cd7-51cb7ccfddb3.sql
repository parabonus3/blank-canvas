
DROP FUNCTION IF EXISTS public.get_member_profile_stats(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_member_profile_stats(_user_id uuid, _room_id uuid)
RETURNS TABLE(hours_today numeric, hours_week numeric, room_rank integer, streak integer, best_session integer, recent_activities jsonb, global_streak integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _hours_today numeric;
  _hours_week numeric;
  _room_rank integer;
  _streak integer;
  _global_streak integer;
  _best_session integer;
  _recent jsonb;
  _check_date date;
  _has_activity boolean;
  _has_freeze boolean;
BEGIN
  SELECT COALESCE(SUM(te.duration), 0) / 3600.0
  INTO _hours_today
  FROM public.time_entries te
  WHERE te.user_id = _user_id AND te.end_time IS NOT NULL AND te.start_time >= CURRENT_DATE;

  SELECT COALESCE(SUM(te.duration), 0) / 3600.0
  INTO _hours_week
  FROM public.time_entries te
  WHERE te.user_id = _user_id AND te.end_time IS NOT NULL AND te.start_time >= (CURRENT_DATE - INTERVAL '7 days');

  SELECT ranked.rank INTO _room_rank
  FROM (
    SELECT rm.user_id, ROW_NUMBER() OVER (ORDER BY rm.total_seconds DESC) AS rank
    FROM public.room_members rm WHERE rm.room_id = _room_id
  ) ranked WHERE ranked.user_id = _user_id;

  -- Room streak (without freezes)
  _streak := 0;
  _check_date := CURRENT_DATE;
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.time_entries te
      WHERE te.user_id = _user_id AND te.end_time IS NOT NULL AND te.start_time::date = _check_date
    ) INTO _has_activity;
    IF NOT _has_activity AND _check_date < CURRENT_DATE THEN EXIT; END IF;
    IF _has_activity THEN _streak := _streak + 1; END IF;
    _check_date := _check_date - 1;
    IF _streak > 365 THEN EXIT; END IF;
  END LOOP;

  -- Global streak (with freezes)
  _global_streak := 0;
  _check_date := CURRENT_DATE;
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.time_entries te
      WHERE te.user_id = _user_id AND te.end_time IS NOT NULL AND te.start_time::date = _check_date
    ) INTO _has_activity;
    _has_freeze := false;
    IF NOT _has_activity THEN
      SELECT EXISTS(
        SELECT 1 FROM public.streak_freezes sf
        WHERE sf.user_id = _user_id AND _check_date = ANY(sf.auto_used_dates)
      ) INTO _has_freeze;
    END IF;
    IF NOT _has_activity AND NOT _has_freeze AND _check_date < CURRENT_DATE THEN EXIT; END IF;
    IF _has_activity OR _has_freeze THEN _global_streak := _global_streak + 1; END IF;
    _check_date := _check_date - 1;
    IF _global_streak > 365 THEN EXIT; END IF;
  END LOOP;

  SELECT COALESCE(MAX(te.duration), 0)::integer
  INTO _best_session
  FROM public.time_entries te WHERE te.user_id = _user_id AND te.end_time IS NOT NULL;

  SELECT COALESCE(jsonb_agg(row_to_json(sub.*)), '[]'::jsonb)
  INTO _recent
  FROM (
    SELECT ral.action_type, ral.metadata, ral.created_at
    FROM public.room_activity_log ral
    WHERE ral.room_id = _room_id AND ral.user_id = _user_id
    ORDER BY ral.created_at DESC LIMIT 5
  ) sub;

  RETURN QUERY SELECT _hours_today, _hours_week, COALESCE(_room_rank, 0)::integer, _streak, _best_session, _recent, _global_streak;
END;
$function$;
