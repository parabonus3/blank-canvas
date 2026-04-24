-- Fix 1: New RPC for room ranking by period
CREATE OR REPLACE FUNCTION public.get_room_ranking_by_period(
  _room_id uuid,
  _period text DEFAULT 'all'
)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, total_seconds bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    rm.user_id,
    p.display_name,
    p.avatar_url,
    COALESCE(SUM(te.duration) FILTER (
      WHERE te.end_time IS NOT NULL
        AND CASE _period
          WHEN 'today' THEN te.start_time >= CURRENT_DATE
          WHEN 'week'  THEN te.start_time >= (CURRENT_DATE - INTERVAL '7 days')
          WHEN 'month' THEN te.start_time >= (CURRENT_DATE - INTERVAL '30 days')
          ELSE true
        END
    ), 0)::bigint AS total_seconds
  FROM public.room_members rm
  JOIN public.profiles p ON p.user_id = rm.user_id
  LEFT JOIN public.time_entries te ON te.user_id = rm.user_id
  WHERE rm.room_id = _room_id
    AND public.is_room_member(auth.uid(), _room_id)
  GROUP BY rm.user_id, p.display_name, p.avatar_url
  ORDER BY total_seconds DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_room_ranking_by_period(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_room_ranking_by_period(uuid, text) TO authenticated;

-- Fix 3: Extend get_room_daily_progress with period param (backward compatible default = today)
CREATE OR REPLACE FUNCTION public.get_room_daily_progress(
  _room_id uuid,
  _period text DEFAULT 'today'
)
RETURNS TABLE(total_seconds_today bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(te.duration), 0)::bigint AS total_seconds_today
  FROM public.time_entries te
  WHERE te.user_id IN (
    SELECT rm.user_id FROM public.room_members rm WHERE rm.room_id = _room_id
  )
  AND te.end_time IS NOT NULL
  AND CASE _period
    WHEN 'today' THEN te.start_time >= CURRENT_DATE
    WHEN 'week'  THEN te.start_time >= (CURRENT_DATE - INTERVAL '7 days')
    WHEN 'month' THEN te.start_time >= (CURRENT_DATE - INTERVAL '30 days')
    ELSE true
  END;
$$;

-- Fix 4: get_public_rooms_ranking_by_period — total_seconds from time_entries; ordering fixed
CREATE OR REPLACE FUNCTION public.get_public_rooms_ranking_by_period(
  _period text DEFAULT 'all',
  _category text DEFAULT NULL,
  _search text DEFAULT NULL,
  _country text DEFAULT NULL
)
RETURNS TABLE(
  room_id uuid, name text, description text, room_type text, invite_code text,
  member_count bigint, online_count bigint, studying_count bigint,
  total_seconds bigint, period_seconds bigint, goal_hours integer, slug text, country text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    sr.id, sr.name, sr.description, sr.room_type,
    NULL::text,
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id),
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_online = true),
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_timer_active = true),
    (
      SELECT COALESCE(SUM(te.duration), 0)::bigint
      FROM public.time_entries te
      WHERE te.user_id IN (SELECT rm2.user_id FROM public.room_members rm2 WHERE rm2.room_id = sr.id)
        AND te.end_time IS NOT NULL
    ) AS total_seconds,
    (
      SELECT COALESCE(SUM(te.duration), 0)::bigint
      FROM public.time_entries te
      WHERE te.user_id IN (SELECT rm2.user_id FROM public.room_members rm2 WHERE rm2.room_id = sr.id)
        AND te.end_time IS NOT NULL
        AND (CASE _period
              WHEN 'today' THEN te.start_time >= CURRENT_DATE
              WHEN 'week'  THEN te.start_time >= (CURRENT_DATE - INTERVAL '7 days')
              WHEN 'month' THEN te.start_time >= (CURRENT_DATE - INTERVAL '30 days')
              ELSE true END)
    ) AS period_seconds,
    sr.goal_hours, sr.slug, sr.country
  FROM public.study_rooms sr
  WHERE sr.is_active = true AND sr.is_public = true
    AND (_category IS NULL OR sr.room_type = _category)
    AND (_search IS NULL OR sr.name ILIKE '%' || _search || '%')
    AND (_country IS NULL OR sr.country = _country)
  ORDER BY
    CASE WHEN _period = 'now' THEN
      (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_timer_active = true)
    ELSE 0 END DESC,
    (
      SELECT COALESCE(SUM(te.duration), 0)::bigint
      FROM public.time_entries te
      WHERE te.user_id IN (SELECT rm2.user_id FROM public.room_members rm2 WHERE rm2.room_id = sr.id)
        AND te.end_time IS NOT NULL
        AND (CASE _period
              WHEN 'today' THEN te.start_time >= CURRENT_DATE
              WHEN 'week'  THEN te.start_time >= (CURRENT_DATE - INTERVAL '7 days')
              WHEN 'month' THEN te.start_time >= (CURRENT_DATE - INTERVAL '30 days')
              ELSE true END)
    ) DESC
  LIMIT 50;
$$;

-- Fix 5: get_public_rooms_ranking (legacy) — total_seconds from time_entries
CREATE OR REPLACE FUNCTION public.get_public_rooms_ranking(
  _category text DEFAULT NULL,
  _search text DEFAULT NULL,
  _country text DEFAULT NULL
)
RETURNS TABLE(
  room_id uuid, name text, description text, room_type text, invite_code text,
  member_count bigint, online_count bigint, studying_count bigint,
  total_seconds bigint, goal_hours integer, slug text, country text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    sr.id, sr.name, sr.description, sr.room_type,
    NULL::text,
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id),
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_online = true),
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_timer_active = true),
    (
      SELECT COALESCE(SUM(te.duration), 0)::bigint
      FROM public.time_entries te
      WHERE te.user_id IN (SELECT rm2.user_id FROM public.room_members rm2 WHERE rm2.room_id = sr.id)
        AND te.end_time IS NOT NULL
    ) AS total_seconds,
    sr.goal_hours, sr.slug, sr.country
  FROM public.study_rooms sr
  WHERE sr.is_active = true AND sr.is_public = true
    AND (_category IS NULL OR sr.room_type = _category)
    AND (_search IS NULL OR sr.name ILIKE '%' || _search || '%')
    AND (_country IS NULL OR sr.country = _country)
  ORDER BY (
    SELECT COALESCE(SUM(te.duration), 0)::bigint
    FROM public.time_entries te
    WHERE te.user_id IN (SELECT rm2.user_id FROM public.room_members rm2 WHERE rm2.room_id = sr.id)
      AND te.end_time IS NOT NULL
  ) DESC
  LIMIT 50;
$$;