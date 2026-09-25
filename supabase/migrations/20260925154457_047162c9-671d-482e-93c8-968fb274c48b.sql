ALTER TABLE public.annual_goals
  ADD COLUMN IF NOT EXISTS progress_source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_activity_type text;

ALTER TABLE public.annual_goals
  DROP CONSTRAINT IF EXISTS annual_goals_progress_source_check;
ALTER TABLE public.annual_goals
  ADD CONSTRAINT annual_goals_progress_source_check
  CHECK (progress_source IN ('manual', 'time', 'tasks', 'distance'));

ALTER TABLE public.annual_goals
  DROP CONSTRAINT IF EXISTS annual_goals_source_activity_type_check;
ALTER TABLE public.annual_goals
  ADD CONSTRAINT annual_goals_source_activity_type_check
  CHECK (source_activity_type IS NULL OR source_activity_type IN ('run', 'walk', 'bike', 'hike'));

CREATE INDEX IF NOT EXISTS idx_annual_goals_source_project
  ON public.annual_goals(user_id, source_project_id)
  WHERE source_project_id IS NOT NULL;

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
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(NULLIF(timezone, ''), 'America/Sao_Paulo')
    INTO _tz
    FROM public.profiles
   WHERE user_id = _user_id;
  _tz := COALESCE(_tz, 'America/Sao_Paulo');
  _target_year := COALESCE(_year, EXTRACT(YEAR FROM (now() AT TIME ZONE _tz))::integer);
  _start_utc := make_timestamptz(_target_year, 1, 1, 0, 0, 0, _tz);
  _end_utc := make_timestamptz(_target_year + 1, 1, 1, 0, 0, 0, _tz);

  WITH computed AS (
    SELECT
      g.id,
      CASE g.progress_source
        WHEN 'time' THEN COALESCE((
          SELECT SUM(te.duration)::numeric / 3600
          FROM public.time_entries te
          WHERE te.user_id = _user_id
            AND te.project_id = g.source_project_id
            AND te.end_time IS NOT NULL
            AND te.start_time >= _start_utc
            AND te.start_time < _end_utc
        ), 0)
        WHEN 'tasks' THEN COALESCE((
          SELECT COUNT(*)::numeric
          FROM public.tasks t
          WHERE t.user_id = _user_id
            AND t.is_completed = true
            AND t.completed_at >= _start_utc
            AND t.completed_at < _end_utc
            AND (g.source_project_id IS NULL OR t.project_id = g.source_project_id)
        ), 0)
        WHEN 'distance' THEN COALESCE((
          SELECT SUM(ga.distance_meters)::numeric / 1000
          FROM public.gps_activities ga
          WHERE ga.user_id = _user_id
            AND ga.started_at >= _start_utc
            AND ga.started_at < _end_utc
            AND ga.activity_type = g.source_activity_type
        ), 0)
        ELSE g.current_value
      END AS value
    FROM public.annual_goals g
    WHERE g.user_id = _user_id
      AND g.year = _target_year
      AND g.archived = false
      AND g.progress_source <> 'manual'
  )
  UPDATE public.annual_goals g
     SET current_value = LEAST(g.target_value, computed.value),
         is_completed = computed.value >= g.target_value,
         completed_at = CASE
           WHEN computed.value >= g.target_value THEN COALESCE(g.completed_at, now())
           ELSE NULL
         END,
         updated_at = now()
    FROM computed
   WHERE g.id = computed.id;

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_my_automatic_annual_goals(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_my_automatic_annual_goals(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_my_automatic_annual_goals(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.duplicate_goals_to_year(_from integer, _to integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user_id uuid := auth.uid(); _count integer;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.annual_goals (
    user_id, category_id, year, title, description, goal_type,
    target_value, current_value, unit, frequency_period, position,
    progress_source, source_project_id, source_activity_type
  )
  SELECT
    user_id, category_id, _to, title, description, goal_type,
    target_value, 0, unit, frequency_period, position,
    progress_source, source_project_id, source_activity_type
  FROM public.annual_goals
  WHERE user_id = _user_id AND year = _from AND archived = false;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;