ALTER TABLE public.annual_goals
  DROP CONSTRAINT IF EXISTS annual_goals_source_activity_type_check;

ALTER TABLE public.annual_goals
  ADD CONSTRAINT annual_goals_source_activity_type_check
  CHECK (source_activity_type IS NULL OR source_activity_type IN ('run', 'walk', 'bike', 'ride', 'hike'));

CREATE OR REPLACE FUNCTION public.refresh_my_automatic_annual_goals(_year integer DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _tz text;
  _target_year integer;
  _start_utc timestamptz;
  _end_utc timestamptz;
  _updated integer := 0;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT COALESCE(NULLIF(timezone, ''), 'America/Sao_Paulo') INTO _tz
  FROM public.profiles WHERE user_id = _user_id;
  _tz := COALESCE(_tz, 'America/Sao_Paulo');
  _target_year := COALESCE(_year, EXTRACT(YEAR FROM (now() AT TIME ZONE _tz))::integer);
  _start_utc := make_timestamptz(_target_year, 1, 1, 0, 0, 0, _tz);
  _end_utc := make_timestamptz(_target_year + 1, 1, 1, 0, 0, 0, _tz);

  WITH computed AS (
    SELECT g.id,
      CASE g.progress_source
        WHEN 'time' THEN COALESCE((
          SELECT SUM(te.duration)::numeric / 3600 FROM public.time_entries te
          WHERE te.user_id = _user_id AND te.project_id = g.source_project_id
            AND te.end_time IS NOT NULL AND te.start_time >= _start_utc AND te.start_time < _end_utc
        ), 0)
        WHEN 'tasks' THEN COALESCE((
          SELECT COUNT(*)::numeric FROM public.tasks t
          WHERE t.user_id = _user_id AND t.is_completed = true
            AND t.completed_at >= _start_utc AND t.completed_at < _end_utc
            AND (g.source_project_id IS NULL OR t.project_id = g.source_project_id)
        ), 0)
        WHEN 'distance' THEN COALESCE((
          SELECT SUM(ga.distance_meters)::numeric / 1000 FROM public.gps_activities ga
          WHERE ga.user_id = _user_id AND ga.started_at >= _start_utc AND ga.started_at < _end_utc
            AND ga.activity_type = CASE WHEN g.source_activity_type = 'ride' THEN 'bike' ELSE g.source_activity_type END
        ), 0)
        ELSE g.current_value
      END AS value
    FROM public.annual_goals g
    WHERE g.user_id = _user_id AND g.year = _target_year
      AND g.archived = false AND g.progress_source <> 'manual'
  )
  UPDATE public.annual_goals g
  SET current_value = LEAST(g.target_value, computed.value),
      is_completed = computed.value >= g.target_value,
      completed_at = CASE WHEN computed.value >= g.target_value THEN COALESCE(g.completed_at, now()) ELSE NULL END,
      updated_at = now()
  FROM computed WHERE g.id = computed.id;

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END;
$$;