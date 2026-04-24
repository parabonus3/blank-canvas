
DROP FUNCTION IF EXISTS public.get_public_rooms_ranking(text, text, text);

CREATE OR REPLACE FUNCTION public.get_public_rooms_ranking(
  _category text DEFAULT NULL,
  _search text DEFAULT NULL,
  _country text DEFAULT NULL
)
RETURNS TABLE(
  room_id uuid, name text, description text, room_type text, invite_code text,
  member_count bigint, online_count bigint, studying_count bigint, total_seconds bigint,
  goal_hours integer, slug text, country text
)
LANGUAGE sql
STABLE SECURITY DEFINER
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
    sr.goal_hours,
    sr.slug,
    sr.country
  FROM public.study_rooms sr
  WHERE sr.is_active = true AND sr.is_public = true
    AND (_category IS NULL OR sr.room_type = _category)
    AND (_search IS NULL OR sr.name ILIKE '%' || _search || '%')
    AND (_country IS NULL OR sr.country = _country)
  ORDER BY total_seconds DESC
  LIMIT 50;
$$;
