
-- Add is_public and slug columns to study_rooms
ALTER TABLE public.study_rooms ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
ALTER TABLE public.study_rooms ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- RLS: Allow anyone to SELECT public rooms (for preview and explore pages)
CREATE POLICY "Anyone can view public rooms"
ON public.study_rooms
FOR SELECT
TO anon, authenticated
USING (is_public = true);

-- RPC: Get room public preview data (no auth required)
CREATE OR REPLACE FUNCTION public.get_room_public_preview(_invite_code text)
RETURNS TABLE(
  room_id uuid,
  name text,
  description text,
  room_type text,
  member_count bigint,
  online_count bigint,
  studying_count bigint,
  total_seconds bigint,
  goal_hours integer,
  goal_label text,
  focus_session_end_at timestamptz,
  focus_session_duration integer,
  top_members jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _room_id uuid;
BEGIN
  SELECT sr.id INTO _room_id
  FROM public.study_rooms sr
  WHERE sr.invite_code = upper(_invite_code) AND sr.is_active = true;

  IF _room_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    sr.id AS room_id,
    sr.name,
    sr.description,
    sr.room_type,
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id) AS member_count,
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_online = true) AS online_count,
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_timer_active = true) AS studying_count,
    (SELECT COALESCE(SUM(rm.total_seconds), 0)::bigint FROM public.room_members rm WHERE rm.room_id = sr.id) AS total_seconds,
    sr.goal_hours,
    sr.goal_label,
    sr.focus_session_end_at,
    sr.focus_session_duration,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'display_name', p.display_name,
        'total_seconds', rm2.total_seconds
      ) ORDER BY rm2.total_seconds DESC), '[]'::jsonb)
      FROM (SELECT * FROM public.room_members rm2 WHERE rm2.room_id = sr.id ORDER BY rm2.total_seconds DESC LIMIT 3) rm2
      JOIN public.profiles p ON p.user_id = rm2.user_id
    ) AS top_members
  FROM public.study_rooms sr
  WHERE sr.id = _room_id;
END;
$$;

-- RPC: Get public rooms ranking
CREATE OR REPLACE FUNCTION public.get_public_rooms_ranking(_category text DEFAULT NULL)
RETURNS TABLE(
  room_id uuid,
  name text,
  description text,
  room_type text,
  invite_code text,
  member_count bigint,
  online_count bigint,
  total_seconds bigint,
  goal_hours integer,
  slug text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    sr.id AS room_id,
    sr.name,
    sr.description,
    sr.room_type,
    sr.invite_code,
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id) AS member_count,
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_online = true) AS online_count,
    (SELECT COALESCE(SUM(rm.total_seconds), 0)::bigint FROM public.room_members rm WHERE rm.room_id = sr.id) AS total_seconds,
    sr.goal_hours,
    sr.slug
  FROM public.study_rooms sr
  WHERE sr.is_active = true AND sr.is_public = true
    AND (_category IS NULL OR sr.room_type = _category)
  ORDER BY total_seconds DESC
  LIMIT 50;
$$;

-- RPC: Get room activity heatmap (hours 0-23)
CREATE OR REPLACE FUNCTION public.get_room_activity_heatmap(_room_id uuid)
RETURNS TABLE(hour_of_day integer, total_minutes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    EXTRACT(HOUR FROM te.start_time)::integer AS hour_of_day,
    COALESCE(SUM(te.duration) / 60, 0)::bigint AS total_minutes
  FROM public.time_entries te
  WHERE te.user_id IN (SELECT rm.user_id FROM public.room_members rm WHERE rm.room_id = _room_id)
    AND te.end_time IS NOT NULL
    AND te.start_time >= NOW() - INTERVAL '30 days'
  GROUP BY hour_of_day
  ORDER BY hour_of_day;
$$;

-- RPC: Get room streak (consecutive days with activity)
CREATE OR REPLACE FUNCTION public.get_room_streak(_room_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _streak integer := 0;
  _check_date date := CURRENT_DATE;
  _has_activity boolean;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.time_entries te
      WHERE te.user_id IN (SELECT rm.user_id FROM public.room_members rm WHERE rm.room_id = _room_id)
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

  RETURN _streak;
END;
$$;
