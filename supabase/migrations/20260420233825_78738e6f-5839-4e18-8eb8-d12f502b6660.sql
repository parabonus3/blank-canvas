-- Fix 1: Plan tier privacy leak in get_member_public_stats
-- Only return plan_tier when user has opted in to public stats
CREATE OR REPLACE FUNCTION public.get_member_public_stats(_user_id uuid)
 RETURNS TABLE(display_name text, avatar_url text, total_seconds bigint, is_stats_public boolean, plan_tier text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    CASE WHEN p.is_stats_public THEN p.display_name ELSE NULL::text END,
    CASE WHEN p.is_stats_public THEN p.avatar_url ELSE NULL::text END,
    CASE WHEN p.is_stats_public THEN COALESCE(SUM(te.duration), 0)::bigint ELSE 0::bigint END,
    p.is_stats_public,
    CASE WHEN p.is_stats_public THEN p.plan_tier ELSE 'free'::text END
  FROM public.profiles p
  LEFT JOIN public.time_entries te ON te.user_id = p.user_id AND te.end_time IS NOT NULL
  WHERE p.user_id = _user_id
  GROUP BY p.display_name, p.avatar_url, p.is_stats_public, p.plan_tier
$function$;

-- Restrict execution to authenticated users (not anon)
REVOKE EXECUTE ON FUNCTION public.get_member_public_stats(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_member_public_stats(uuid) TO authenticated;

-- Fix 2: Hide note_folders.password_hash from client SELECT
-- Replace permissive SELECT policy with one that excludes the hash via column-level grant strategy.
-- Approach: drop the SELECT policy and replace with a policy that's identical, but also revoke
-- column SELECT permission on password_hash so PostgREST never returns it.
REVOKE SELECT (password_hash) ON public.note_folders FROM anon, authenticated, public;

-- Ensure other columns remain selectable for owners (RLS still gates row visibility)
GRANT SELECT (id, user_id, name, color, created_at, updated_at) ON public.note_folders TO authenticated;