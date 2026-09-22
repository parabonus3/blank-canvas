CREATE OR REPLACE FUNCTION public.get_my_streak_status()
RETURNS TABLE(current_streak integer, best_streak integer, studied_today boolean, local_today date, timezone text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _tz text;
  _today date;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(NULLIF(p.timezone, ''), 'America/Sao_Paulo')
  INTO _tz
  FROM public.profiles p
  WHERE p.user_id = _user_id;

  IF _tz IS NULL THEN RETURN; END IF;
  _today := (now() AT TIME ZONE _tz)::date;

  current_streak := public.calculate_user_streak(_user_id, _today);
  best_streak := GREATEST(
    COALESCE((SELECT p.last_known_streak FROM public.profiles p WHERE p.user_id = _user_id), 0),
    public.get_best_ever_streak(_user_id),
    current_streak
  );
  studied_today := EXISTS(
    SELECT 1 FROM public.time_entries te
    WHERE te.user_id = _user_id
      AND te.end_time IS NOT NULL
      AND (te.start_time AT TIME ZONE _tz)::date = _today
  );
  local_today := _today;
  timezone := _tz;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_streak_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_streak_status() TO authenticated, service_role;