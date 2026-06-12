
CREATE OR REPLACE FUNCTION public.get_global_user_ranking(_period text DEFAULT 'all'::text, _tz text DEFAULT 'UTC'::text)
 RETURNS TABLE(user_id uuid, display_name text, avatar_url text, plan_tier text, total_seconds bigint, is_anonymous boolean, avatar_flair text, avatar_flair_color text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _start timestamptz;
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
    RETURN;
  END IF;

  IF _period = 'today' THEN
    _start := public.start_of_day_in_tz(_tz);
  ELSIF _period = 'week' THEN
    _start := public.start_of_day_in_tz(_tz) - INTERVAL '6 days';
  ELSE
    _start := NULL;
  END IF;

  RETURN QUERY
  SELECT te.user_id,
    CASE WHEN p.is_stats_public THEN p.display_name ELSE 'Anonymous' END,
    CASE WHEN p.is_stats_public THEN p.avatar_url ELSE NULL END,
    CASE WHEN p.is_stats_public THEN p.plan_tier ELSE 'free' END,
    COALESCE(SUM(te.duration),0)::bigint AS secs,
    NOT p.is_stats_public,
    CASE WHEN p.is_stats_public THEN p.avatar_flair ELSE 'default' END,
    CASE WHEN p.is_stats_public THEN p.avatar_flair_color ELSE NULL END
  FROM public.time_entries te
  JOIN public.profiles p ON p.user_id = te.user_id
  WHERE te.end_time IS NOT NULL
    AND (_start IS NULL OR te.start_time >= _start)
  GROUP BY te.user_id, p.display_name, p.avatar_url, p.plan_tier,
           p.is_stats_public, p.avatar_flair, p.avatar_flair_color
  HAVING COALESCE(SUM(te.duration),0) > 0
  ORDER BY secs DESC
  LIMIT 50;
END; $function$;
