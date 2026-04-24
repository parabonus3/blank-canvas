
CREATE OR REPLACE FUNCTION public.get_friend_progress(_user_id uuid)
RETURNS TABLE(hours_today numeric, hours_week numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_public boolean;
BEGIN
  SELECT p.is_stats_public INTO _is_public
  FROM public.profiles p WHERE p.user_id = _user_id;

  IF _is_public IS NOT TRUE THEN
    RETURN QUERY SELECT 0::numeric, 0::numeric;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN te.start_time >= CURRENT_DATE THEN te.duration ELSE 0 END), 0) / 3600.0 AS hours_today,
    COALESCE(SUM(CASE WHEN te.start_time >= (CURRENT_DATE - INTERVAL '7 days') THEN te.duration ELSE 0 END), 0) / 3600.0 AS hours_week
  FROM public.time_entries te
  WHERE te.user_id = _user_id AND te.end_time IS NOT NULL;
END;
$$;
