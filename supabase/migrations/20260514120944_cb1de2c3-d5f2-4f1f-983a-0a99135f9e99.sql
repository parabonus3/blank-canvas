
-- Drop ambiguous (older) overloads
DROP FUNCTION IF EXISTS public.get_public_rooms_ranking_by_period(text, text, text, text);
DROP FUNCTION IF EXISTS public.get_global_user_ranking(text);
DROP FUNCTION IF EXISTS public.get_room_daily_progress(uuid, text);

-- Recreate the 5-arg/2-arg/3-arg versions with UTC default
CREATE OR REPLACE FUNCTION public.get_public_rooms_ranking_by_period(
  _period text DEFAULT 'all'::text,
  _category text DEFAULT NULL::text,
  _search text DEFAULT NULL::text,
  _country text DEFAULT NULL::text,
  _tz text DEFAULT 'UTC'::text
)
RETURNS TABLE(room_id uuid, name text, description text, room_type text, invite_code text, member_count bigint, online_count bigint, studying_count bigint, total_seconds bigint, period_seconds bigint, goal_hours integer, slug text, country text, is_public boolean, room_background text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        AND (CASE _period
              WHEN 'today' THEN te.start_time >= public.start_of_day_in_tz(_tz)
              WHEN 'week'  THEN te.start_time >= (public.start_of_day_in_tz(_tz) - INTERVAL '6 days')
              WHEN 'month' THEN te.start_time >= (public.start_of_day_in_tz(_tz) - INTERVAL '29 days')
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
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_rooms_ranking_by_period(text, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_global_user_ranking(
  _period text DEFAULT 'all'::text,
  _tz text DEFAULT 'UTC'::text
)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, plan_tier text, total_seconds bigint, is_anonymous boolean, avatar_flair text, avatar_flair_color text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _period = 'now' THEN
    RETURN QUERY
    SELECT te.user_id,
      CASE WHEN p.is_stats_public THEN p.display_name ELSE 'Anonymous' END,
      CASE WHEN p.is_stats_public THEN p.avatar_url ELSE NULL END,
      CASE WHEN p.is_stats_public THEN p.plan_tier ELSE 'free' END,
      GREATEST(EXTRACT(EPOCH FROM (now()-MAX(te.start_time)))::bigint - COALESCE(MAX(te.paused_seconds),0)::bigint, 0),
      NOT p.is_stats_public,
      CASE WHEN p.is_stats_public THEN p.avatar_flair ELSE 'default' END,
      CASE WHEN p.is_stats_public THEN p.avatar_flair_color ELSE NULL END
    FROM public.time_entries te
    JOIN public.profiles p ON p.user_id = te.user_id
    WHERE te.end_time IS NULL AND te.paused_at IS NULL
      AND te.start_time >= (now() - INTERVAL '24 hours')
    GROUP BY te.user_id, p.display_name, p.avatar_url, p.plan_tier,
             p.is_stats_public, p.avatar_flair, p.avatar_flair_color
    ORDER BY 5 DESC LIMIT 10;
  ELSE
    RETURN QUERY
    SELECT te.user_id,
      CASE WHEN p.is_stats_public THEN p.display_name ELSE 'Anonymous' END,
      CASE WHEN p.is_stats_public THEN p.avatar_url ELSE NULL END,
      CASE WHEN p.is_stats_public THEN p.plan_tier ELSE 'free' END,
      COALESCE(SUM(te.duration),0)::bigint,
      NOT p.is_stats_public,
      CASE WHEN p.is_stats_public THEN p.avatar_flair ELSE 'default' END,
      CASE WHEN p.is_stats_public THEN p.avatar_flair_color ELSE NULL END
    FROM public.time_entries te
    JOIN public.profiles p ON p.user_id = te.user_id
    WHERE te.end_time IS NOT NULL
      AND (CASE _period
             WHEN 'today' THEN te.start_time >= public.start_of_day_in_tz(_tz)
             WHEN 'week'  THEN te.start_time >= (public.start_of_day_in_tz(_tz) - INTERVAL '6 days')
             ELSE true END)
    GROUP BY te.user_id, p.display_name, p.avatar_url, p.plan_tier,
             p.is_stats_public, p.avatar_flair, p.avatar_flair_color
    ORDER BY 5 DESC LIMIT 10;
  END IF;
END; $function$;

GRANT EXECUTE ON FUNCTION public.get_global_user_ranking(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_room_daily_progress(
  _room_id uuid,
  _period text DEFAULT 'today'::text,
  _tz text DEFAULT 'UTC'::text
)
RETURNS TABLE(total_seconds_today bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(te.duration),0)::bigint
  FROM public.time_entries te
  WHERE te.user_id IN (SELECT rm.user_id FROM public.room_members rm WHERE rm.room_id = _room_id)
    AND te.end_time IS NOT NULL
    AND CASE _period
          WHEN 'today' THEN te.start_time >= public.start_of_day_in_tz(_tz)
          WHEN 'week'  THEN te.start_time >= (public.start_of_day_in_tz(_tz) - INTERVAL '6 days')
          WHEN 'month' THEN te.start_time >= (public.start_of_day_in_tz(_tz) - INTERVAL '29 days')
          ELSE true END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_room_daily_progress(uuid, text, text) TO authenticated;
