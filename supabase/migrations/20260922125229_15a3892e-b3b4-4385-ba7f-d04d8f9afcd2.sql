CREATE OR REPLACE FUNCTION public.get_my_streak_status()
RETURNS TABLE(current_streak integer, best_streak integer, studied_today boolean, local_today date, timezone text)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _tz text;
  _today date;
  _anchor date;
  _check date;
  _current integer := 0;
  _best integer := 0;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(NULLIF(p.timezone, ''), 'America/Sao_Paulo')
  INTO _tz
  FROM public.profiles p
  WHERE p.user_id = _user_id;
  IF _tz IS NULL THEN RETURN; END IF;

  _today := (now() AT TIME ZONE _tz)::date;
  studied_today := EXISTS(
    SELECT 1 FROM public.time_entries te
    WHERE te.user_id = _user_id
      AND te.end_time IS NOT NULL
      AND (te.start_time AT TIME ZONE _tz)::date = _today
  );
  _anchor := CASE WHEN studied_today THEN _today ELSE _today - 1 END;
  _check := _anchor;

  WHILE EXISTS (
    SELECT 1 FROM public.time_entries te
    WHERE te.user_id = _user_id AND te.end_time IS NOT NULL
      AND (te.start_time AT TIME ZONE _tz)::date = _check
    UNION ALL
    SELECT 1 FROM public.streak_freezes sf
    WHERE sf.user_id = _user_id AND _check = ANY(COALESCE(sf.auto_used_dates, ARRAY[]::date[]))
  ) LOOP
    _current := _current + 1;
    _check := _check - 1;
    EXIT WHEN _current >= 3650;
  END LOOP;

  WITH active_days AS (
    SELECT DISTINCT (te.start_time AT TIME ZONE _tz)::date AS d
    FROM public.time_entries te
    WHERE te.user_id = _user_id AND te.end_time IS NOT NULL
    UNION
    SELECT DISTINCT unnest(COALESCE(sf.auto_used_dates, ARRAY[]::date[]))
    FROM public.streak_freezes sf WHERE sf.user_id = _user_id
  ), grouped AS (
    SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d))::integer AS grp FROM active_days
  )
  SELECT COALESCE(MAX(cnt), 0)::integer INTO _best
  FROM (SELECT COUNT(*) cnt FROM grouped GROUP BY grp) s;

  current_streak := _current;
  best_streak := GREATEST(
    COALESCE((SELECT p.last_known_streak FROM public.profiles p WHERE p.user_id = _user_id), 0),
    _best,
    _current
  );
  local_today := _today;
  timezone := _tz;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_streak_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_streak_status() TO authenticated, service_role;