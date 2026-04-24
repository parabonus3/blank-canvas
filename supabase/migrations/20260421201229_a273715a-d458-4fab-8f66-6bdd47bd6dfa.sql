CREATE OR REPLACE FUNCTION public.get_public_rooms_ranking_by_period(_period text DEFAULT 'all'::text, _category text DEFAULT NULL::text, _search text DEFAULT NULL::text, _country text DEFAULT NULL::text)
 RETURNS TABLE(room_id uuid, name text, description text, room_type text, invite_code text, member_count bigint, online_count bigint, studying_count bigint, total_seconds bigint, period_seconds bigint, goal_hours integer, slug text, country text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    sr.id, sr.name, sr.description, sr.room_type,
    NULL::text,
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id),
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_online = true),
    (SELECT COUNT(*) FROM public.room_members rm
       WHERE rm.room_id = sr.id
         AND rm.is_timer_active = true
         AND rm.last_active_at >= (now() - INTERVAL '2 hours 5 minutes')),
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
      (SELECT COUNT(*) FROM public.room_members rm
         WHERE rm.room_id = sr.id
           AND rm.is_timer_active = true
           AND rm.last_active_at >= (now() - INTERVAL '2 hours 5 minutes'))
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
$function$;

CREATE OR REPLACE FUNCTION public.get_room_public_preview(_invite_code text)
 RETURNS TABLE(room_id uuid, name text, description text, room_type text, member_count bigint, online_count bigint, studying_count bigint, total_seconds bigint, goal_hours integer, goal_label text, focus_session_end_at timestamp with time zone, focus_session_duration integer, top_members jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    (SELECT COUNT(*) FROM public.room_members rm
       WHERE rm.room_id = sr.id
         AND rm.is_timer_active = true
         AND rm.last_active_at >= (now() - INTERVAL '2 hours 5 minutes')) AS studying_count,
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
$function$;