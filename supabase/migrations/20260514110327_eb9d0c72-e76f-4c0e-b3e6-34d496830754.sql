-- Remove profile_background entirely (replaced by avatar flair which is already configured by user).
-- Keep room_background as the room frame/contour identifier (validation trigger stays).

-- Drop trigger and validator function for profile_background first
DROP TRIGGER IF EXISTS trg_validate_profile_background ON public.profiles;
DROP FUNCTION IF EXISTS public.validate_profile_background();

-- Rebuild RPCs without profile_background ----------------------------------

DROP FUNCTION IF EXISTS public.get_room_member_profiles(uuid);
CREATE FUNCTION public.get_room_member_profiles(_room_id uuid)
 RETURNS TABLE(
   user_id uuid, display_name text, friend_code text, avatar_url text,
   plan_tier text, avatar_flair text, avatar_flair_color text
 )
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.user_id, p.display_name, p.friend_code, p.avatar_url, p.plan_tier,
         p.avatar_flair, p.avatar_flair_color
  FROM public.profiles p
  JOIN public.room_members rm ON rm.user_id = p.user_id
  WHERE rm.room_id = _room_id
$function$;

DROP FUNCTION IF EXISTS public.get_member_public_stats(uuid);
CREATE FUNCTION public.get_member_public_stats(_user_id uuid)
 RETURNS TABLE(
   display_name text, avatar_url text, total_seconds bigint,
   is_stats_public boolean, plan_tier text,
   avatar_flair text, avatar_flair_color text
 )
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    CASE WHEN p.is_stats_public THEN p.display_name ELSE NULL END,
    CASE WHEN p.is_stats_public THEN p.avatar_url ELSE NULL END,
    CASE WHEN p.is_stats_public THEN COALESCE(SUM(te.duration),0)::bigint ELSE 0::bigint END,
    p.is_stats_public,
    CASE WHEN p.is_stats_public THEN p.plan_tier ELSE 'free' END,
    CASE WHEN p.is_stats_public THEN p.avatar_flair ELSE 'default' END,
    CASE WHEN p.is_stats_public THEN p.avatar_flair_color ELSE NULL END
  FROM public.profiles p
  LEFT JOIN public.time_entries te ON te.user_id = p.user_id AND te.end_time IS NOT NULL
  WHERE p.user_id = _user_id
  GROUP BY p.display_name, p.avatar_url, p.is_stats_public, p.plan_tier,
           p.avatar_flair, p.avatar_flair_color
$function$;

DROP FUNCTION IF EXISTS public.get_global_user_ranking(text);
CREATE FUNCTION public.get_global_user_ranking(_period text DEFAULT 'all'::text)
 RETURNS TABLE(
   user_id uuid, display_name text, avatar_url text, plan_tier text,
   total_seconds bigint, is_anonymous boolean,
   avatar_flair text, avatar_flair_color text
 )
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
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
      AND (CASE _period WHEN 'today' THEN te.start_time >= CURRENT_DATE
                        WHEN 'week'  THEN te.start_time >= (CURRENT_DATE - INTERVAL '7 days')
                        ELSE true END)
    GROUP BY te.user_id, p.display_name, p.avatar_url, p.plan_tier,
             p.is_stats_public, p.avatar_flair, p.avatar_flair_color
    ORDER BY 5 DESC LIMIT 10;
  END IF;
END; $function$;

-- Finally drop the column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS profile_background;