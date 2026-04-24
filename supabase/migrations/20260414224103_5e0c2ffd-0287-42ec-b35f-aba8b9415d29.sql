
DROP FUNCTION IF EXISTS public.get_member_public_stats(uuid);

CREATE OR REPLACE FUNCTION public.get_member_public_stats(_user_id uuid)
 RETURNS TABLE(display_name text, avatar_url text, total_seconds bigint, is_stats_public boolean, plan_tier text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.display_name,
    p.avatar_url,
    COALESCE(SUM(te.duration), 0)::bigint AS total_seconds,
    p.is_stats_public,
    p.plan_tier
  FROM public.profiles p
  LEFT JOIN public.time_entries te ON te.user_id = p.user_id AND te.end_time IS NOT NULL
  WHERE p.user_id = _user_id
  GROUP BY p.display_name, p.avatar_url, p.is_stats_public, p.plan_tier
$function$;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_replies;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
