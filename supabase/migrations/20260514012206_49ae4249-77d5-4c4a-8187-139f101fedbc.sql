
DROP FUNCTION IF EXISTS public.get_public_rooms_ranking_by_period(text, text, text, text);
CREATE FUNCTION public.get_public_rooms_ranking_by_period(
  _period text DEFAULT 'all',
  _category text DEFAULT NULL,
  _search text DEFAULT NULL,
  _country text DEFAULT NULL
)
RETURNS TABLE(
  room_id uuid, name text, description text, room_type text, invite_code text,
  member_count bigint, online_count bigint, studying_count bigint,
  total_seconds bigint, period_seconds bigint, goal_hours integer, slug text, country text,
  is_public boolean, room_background text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sr.id,
    CASE WHEN sr.is_public THEN sr.name ELSE 'Sala privada' END,
    CASE WHEN sr.is_public THEN sr.description ELSE NULL END,
    sr.room_type,
    NULL::text,
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id),
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_online = true),
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_timer_active = true
       AND rm.last_active_at >= (now() - INTERVAL '15 minutes')),
    (SELECT COALESCE(SUM(te.duration),0)::bigint FROM public.time_entries te
      WHERE te.user_id IN (SELECT rm2.user_id FROM public.room_members rm2 WHERE rm2.room_id = sr.id)
        AND te.end_time IS NOT NULL),
    (SELECT COALESCE(SUM(te.duration),0)::bigint FROM public.time_entries te
      WHERE te.user_id IN (SELECT rm2.user_id FROM public.room_members rm2 WHERE rm2.room_id = sr.id)
        AND te.end_time IS NOT NULL
        AND (CASE _period WHEN 'today' THEN te.start_time >= CURRENT_DATE
                          WHEN 'week'  THEN te.start_time >= (CURRENT_DATE - INTERVAL '7 days')
                          WHEN 'month' THEN te.start_time >= (CURRENT_DATE - INTERVAL '30 days')
                          ELSE true END)),
    sr.goal_hours, sr.slug, sr.country, sr.is_public,
    CASE WHEN sr.is_public THEN sr.room_background ELSE 'none' END
  FROM public.study_rooms sr
  WHERE sr.is_active = true
    AND (
      sr.is_public = true
      OR (
        _period = 'now'
        AND EXISTS (
          SELECT 1 FROM public.room_members rm
          WHERE rm.room_id = sr.id AND rm.is_timer_active = true
            AND rm.last_active_at >= (now() - INTERVAL '15 minutes')
        )
      )
    )
    AND (_category IS NULL OR sr.room_type = _category)
    AND (_search IS NULL OR (sr.is_public AND sr.name ILIKE '%' || _search || '%'))
    AND (_country IS NULL OR sr.country = _country)
  ORDER BY 8 DESC, 10 DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_rooms_ranking_by_period(text, text, text, text) TO anon, authenticated;
