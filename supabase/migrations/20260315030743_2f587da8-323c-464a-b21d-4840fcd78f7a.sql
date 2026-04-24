
-- 1. Add focus_session_start_at for countdown before collective session
ALTER TABLE public.study_rooms ADD COLUMN IF NOT EXISTS focus_session_start_at timestamptz DEFAULT NULL;

-- 2. RPC for temporal ranking of public rooms by period
CREATE OR REPLACE FUNCTION public.get_public_rooms_ranking_by_period(
  _period text DEFAULT 'all',
  _category text DEFAULT NULL,
  _search text DEFAULT NULL,
  _country text DEFAULT NULL
)
RETURNS TABLE(
  room_id uuid,
  name text,
  description text,
  room_type text,
  invite_code text,
  member_count bigint,
  online_count bigint,
  studying_count bigint,
  total_seconds bigint,
  period_seconds bigint,
  goal_hours integer,
  slug text,
  country text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    sr.id AS room_id,
    sr.name,
    sr.description,
    sr.room_type,
    sr.invite_code,
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id) AS member_count,
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_online = true) AS online_count,
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_timer_active = true) AS studying_count,
    (SELECT COALESCE(SUM(rm.total_seconds), 0)::bigint FROM public.room_members rm WHERE rm.room_id = sr.id) AS total_seconds,
    (
      SELECT COALESCE(SUM(te.duration), 0)::bigint
      FROM public.time_entries te
      WHERE te.user_id IN (SELECT rm2.user_id FROM public.room_members rm2 WHERE rm2.room_id = sr.id)
        AND te.end_time IS NOT NULL
        AND (
          CASE _period
            WHEN 'today' THEN te.start_time >= CURRENT_DATE
            WHEN 'week' THEN te.start_time >= (CURRENT_DATE - INTERVAL '7 days')
            ELSE true
          END
        )
    ) AS period_seconds,
    sr.goal_hours,
    sr.slug,
    sr.country
  FROM public.study_rooms sr
  WHERE sr.is_active = true AND sr.is_public = true
    AND (_category IS NULL OR sr.room_type = _category)
    AND (_search IS NULL OR sr.name ILIKE '%' || _search || '%')
    AND (_country IS NULL OR sr.country = _country)
  ORDER BY
    CASE WHEN _period = 'now' THEN 0 ELSE 1 END,
    CASE WHEN _period = 'now' THEN (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_timer_active = true) ELSE 0 END DESC,
    (
      SELECT COALESCE(SUM(te.duration), 0)::bigint
      FROM public.time_entries te
      WHERE te.user_id IN (SELECT rm2.user_id FROM public.room_members rm2 WHERE rm2.room_id = sr.id)
        AND te.end_time IS NOT NULL
        AND (
          CASE _period
            WHEN 'today' THEN te.start_time >= CURRENT_DATE
            WHEN 'week' THEN te.start_time >= (CURRENT_DATE - INTERVAL '7 days')
            ELSE true
          END
        )
    ) DESC
  LIMIT 50;
$$;
