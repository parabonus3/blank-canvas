
-- =============================================================
-- 1) NEW COLUMNS
-- =============================================================
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS confirmed_intervals INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_background TEXT NOT NULL DEFAULT 'none';

ALTER TABLE public.study_rooms
  ADD COLUMN IF NOT EXISTS room_background TEXT NOT NULL DEFAULT 'none';

-- =============================================================
-- 2) DYNAMIC 12H LIMIT
-- =============================================================
CREATE OR REPLACE FUNCTION public.enforce_time_entry_max_duration()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_window  INTEGER := 7200;
  abs_max      INTEGER := 86400;
  net_seconds  INTEGER;
  wall_seconds INTEGER;
  dyn_max      INTEGER;
  confirms     INTEGER;
BEGIN
  IF NEW.end_time IS NULL OR NEW.start_time IS NULL THEN
    RETURN NEW;
  END IF;

  wall_seconds := GREATEST(0, EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER);
  net_seconds  := GREATEST(0, wall_seconds - COALESCE(NEW.paused_seconds, 0));
  confirms     := COALESCE(NEW.confirmed_intervals, 0);

  IF NEW.duration IS NULL THEN
    NEW.duration := net_seconds;
  END IF;

  dyn_max := LEAST(abs_max, base_window * (1 + confirms));

  IF NEW.duration > dyn_max THEN
    NEW.duration := dyn_max;
    NEW.end_time := NEW.start_time + make_interval(secs => dyn_max + COALESCE(NEW.paused_seconds, 0));
    NEW.notes := COALESCE(NEW.notes, '') ||
      CASE WHEN NEW.notes IS NULL OR NEW.notes = '' THEN '' ELSE ' ' END ||
      '[ajustada para ' || (dyn_max / 3600) || 'h: ' || confirms || ' confirmacao(oes) de presenca]';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_time_entry_max_duration ON public.time_entries;
CREATE TRIGGER trg_enforce_time_entry_max_duration
BEFORE INSERT OR UPDATE ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.enforce_time_entry_max_duration();

-- =============================================================
-- 3) PRESENCE CONFIRMATION RPC
-- =============================================================
CREATE OR REPLACE FUNCTION public.confirm_presence_time_entry(_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE public.time_entries
     SET confirmed_intervals = COALESCE(confirmed_intervals, 0) + 1,
         last_heartbeat_at   = now()
   WHERE id = _entry_id
     AND user_id = _uid
     AND end_time IS NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_presence_time_entry(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.confirm_presence_time_entry(uuid) TO authenticated;

-- =============================================================
-- 4) BACKGROUND VALIDATION (tier enforcement)
-- =============================================================
CREATE OR REPLACE FUNCTION public.background_allowed_for_tier(_bg text, _tier text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _bg IS NULL OR _bg = 'none' OR _bg = '' THEN true
    WHEN _bg LIKE 'free-%'    THEN true
    WHEN _bg LIKE 'pro-%'     THEN _tier IN ('pro', 'premium')
    WHEN _bg LIKE 'premium-%' THEN _tier = 'premium'
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.validate_profile_background()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.profile_background IS DISTINCT FROM COALESCE(OLD.profile_background, 'none') THEN
    IF NOT public.background_allowed_for_tier(NEW.profile_background, COALESCE(NEW.plan_tier, 'free')) THEN
      NEW.profile_background := 'none';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profile_background ON public.profiles;
CREATE TRIGGER trg_validate_profile_background
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_profile_background();

CREATE OR REPLACE FUNCTION public.validate_room_background()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _owner_tier text;
BEGIN
  IF NEW.room_background IS DISTINCT FROM COALESCE(OLD.room_background, 'none') THEN
    SELECT COALESCE(p.plan_tier, 'free') INTO _owner_tier
    FROM public.profiles p
    WHERE p.user_id = NEW.owner_id;

    IF NOT public.background_allowed_for_tier(NEW.room_background, COALESCE(_owner_tier, 'free')) THEN
      NEW.room_background := 'none';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_room_background ON public.study_rooms;
CREATE TRIGGER trg_validate_room_background
BEFORE INSERT OR UPDATE ON public.study_rooms
FOR EACH ROW
EXECUTE FUNCTION public.validate_room_background();

-- =============================================================
-- 5) UPDATE PUBLIC PREVIEW FUNCTIONS
-- =============================================================
DROP FUNCTION IF EXISTS public.get_room_member_profiles(uuid);
CREATE FUNCTION public.get_room_member_profiles(_room_id uuid)
 RETURNS TABLE(
   user_id uuid, display_name text, friend_code text, avatar_url text,
   plan_tier text, avatar_flair text, avatar_flair_color text,
   profile_background text
 )
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.user_id, p.display_name, p.friend_code, p.avatar_url, p.plan_tier,
         p.avatar_flair, p.avatar_flair_color, p.profile_background
  FROM public.profiles p
  JOIN public.room_members rm ON rm.user_id = p.user_id
  WHERE rm.room_id = _room_id
$function$;

DROP FUNCTION IF EXISTS public.get_member_public_stats(uuid);
CREATE FUNCTION public.get_member_public_stats(_user_id uuid)
 RETURNS TABLE(
   display_name text, avatar_url text, total_seconds bigint,
   is_stats_public boolean, plan_tier text,
   avatar_flair text, avatar_flair_color text,
   profile_background text
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
    CASE WHEN p.is_stats_public THEN p.avatar_flair_color ELSE NULL END,
    CASE WHEN p.is_stats_public THEN p.profile_background ELSE 'none' END
  FROM public.profiles p
  LEFT JOIN public.time_entries te ON te.user_id = p.user_id AND te.end_time IS NOT NULL
  WHERE p.user_id = _user_id
  GROUP BY p.display_name, p.avatar_url, p.is_stats_public, p.plan_tier,
           p.avatar_flair, p.avatar_flair_color, p.profile_background
$function$;

DROP FUNCTION IF EXISTS public.get_global_user_ranking(text);
CREATE FUNCTION public.get_global_user_ranking(_period text DEFAULT 'all'::text)
 RETURNS TABLE(
   user_id uuid, display_name text, avatar_url text, plan_tier text,
   total_seconds bigint, is_anonymous boolean,
   avatar_flair text, avatar_flair_color text,
   profile_background text
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
      CASE WHEN p.is_stats_public THEN p.avatar_flair_color ELSE NULL END,
      CASE WHEN p.is_stats_public THEN p.profile_background ELSE 'none' END
    FROM public.time_entries te
    JOIN public.profiles p ON p.user_id = te.user_id
    WHERE te.end_time IS NULL AND te.paused_at IS NULL
      AND te.start_time >= (now() - INTERVAL '24 hours')
    GROUP BY te.user_id, p.display_name, p.avatar_url, p.plan_tier,
             p.is_stats_public, p.avatar_flair, p.avatar_flair_color, p.profile_background
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
      CASE WHEN p.is_stats_public THEN p.avatar_flair_color ELSE NULL END,
      CASE WHEN p.is_stats_public THEN p.profile_background ELSE 'none' END
    FROM public.time_entries te
    JOIN public.profiles p ON p.user_id = te.user_id
    WHERE te.end_time IS NOT NULL
      AND (CASE _period WHEN 'today' THEN te.start_time >= CURRENT_DATE
                        WHEN 'week'  THEN te.start_time >= (CURRENT_DATE - INTERVAL '7 days')
                        ELSE true END)
    GROUP BY te.user_id, p.display_name, p.avatar_url, p.plan_tier,
             p.is_stats_public, p.avatar_flair, p.avatar_flair_color, p.profile_background
    ORDER BY 5 DESC LIMIT 10;
  END IF;
END; $function$;

DROP FUNCTION IF EXISTS public.get_room_public_preview(text);
CREATE FUNCTION public.get_room_public_preview(_invite_code text)
 RETURNS TABLE(
   room_id uuid, name text, description text, room_type text,
   member_count bigint, online_count bigint, studying_count bigint,
   total_seconds bigint, goal_hours integer, goal_label text,
   focus_session_end_at timestamp with time zone, focus_session_duration integer,
   top_members jsonb, room_background text
 )
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
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
    ) AS top_members,
    sr.room_background
  FROM public.study_rooms sr
  WHERE sr.id = _room_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_room_public_preview(text) TO anon, authenticated;
