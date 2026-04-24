
-- 1. Update RPC to filter paused users from "now" ranking
CREATE OR REPLACE FUNCTION public.get_global_user_ranking(_period text DEFAULT 'all'::text)
 RETURNS TABLE(user_id uuid, display_name text, avatar_url text, plan_tier text, total_seconds bigint, is_anonymous boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _period = 'now' THEN
    RETURN QUERY
    SELECT
      te.user_id,
      CASE WHEN p.is_stats_public THEN p.display_name ELSE 'Anonymous'::text END,
      CASE WHEN p.is_stats_public THEN p.avatar_url ELSE NULL::text END,
      CASE WHEN p.is_stats_public THEN p.plan_tier ELSE 'free'::text END,
      EXTRACT(EPOCH FROM (now() - MAX(te.start_time)))::bigint AS total_seconds,
      NOT p.is_stats_public AS is_anonymous
    FROM public.time_entries te
    JOIN public.profiles p ON p.user_id = te.user_id
    WHERE te.end_time IS NULL
      AND te.start_time >= (now() - INTERVAL '24 hours')
      AND EXISTS (
        SELECT 1 FROM public.room_members rm
        WHERE rm.user_id = te.user_id AND rm.is_timer_active = true
      )
    GROUP BY te.user_id, p.display_name, p.avatar_url, p.plan_tier, p.is_stats_public
    ORDER BY MAX(te.start_time) ASC
    LIMIT 10;
  ELSE
    RETURN QUERY
    SELECT
      te.user_id,
      CASE WHEN p.is_stats_public THEN p.display_name ELSE 'Anonymous'::text END,
      CASE WHEN p.is_stats_public THEN p.avatar_url ELSE NULL::text END,
      CASE WHEN p.is_stats_public THEN p.plan_tier ELSE 'free'::text END,
      COALESCE(SUM(te.duration), 0)::bigint AS total_seconds,
      NOT p.is_stats_public AS is_anonymous
    FROM public.time_entries te
    JOIN public.profiles p ON p.user_id = te.user_id
    WHERE te.end_time IS NOT NULL
      AND (
        CASE _period
          WHEN 'today' THEN te.start_time >= CURRENT_DATE
          WHEN 'week' THEN te.start_time >= (CURRENT_DATE - INTERVAL '7 days')
          ELSE true
        END
      )
    GROUP BY te.user_id, p.display_name, p.avatar_url, p.plan_tier, p.is_stats_public
    ORDER BY total_seconds DESC
    LIMIT 10;
  END IF;
END;
$function$;

-- 2. Add last_user_read_at to support_tickets
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS last_user_read_at timestamp with time zone;

-- 3. Allow ticket owners to update last_user_read_at
CREATE POLICY "Users can update own ticket read status"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
