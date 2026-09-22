CREATE OR REPLACE FUNCTION public.get_user_streak_days(_user_id uuid)
RETURNS TABLE(day date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_tz AS (
    SELECT COALESCE(NULLIF(timezone, ''), 'America/Sao_Paulo') AS tz
    FROM public.profiles
    WHERE user_id = _user_id
  )
  SELECT DISTINCT (te.start_time AT TIME ZONE ut.tz)::date AS day
  FROM public.time_entries te
  CROSS JOIN user_tz ut
  WHERE te.user_id = _user_id
    AND te.end_time IS NOT NULL
  UNION
  SELECT DISTINCT unnest(COALESCE(sf.auto_used_dates, ARRAY[]::date[])) AS day
  FROM public.streak_freezes sf
  WHERE sf.user_id = _user_id;
$$;

REVOKE ALL ON FUNCTION public.get_user_streak_days(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_streak_days(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.calculate_user_streak(_user_id uuid, _as_of date DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tz text;
  _today date;
  _check_date date;
  _streak integer := 0;
BEGIN
  SELECT COALESCE(NULLIF(timezone, ''), 'America/Sao_Paulo')
  INTO _tz
  FROM public.profiles
  WHERE user_id = _user_id;

  IF _tz IS NULL THEN RETURN 0; END IF;
  _today := COALESCE(_as_of, (now() AT TIME ZONE _tz)::date);
  _check_date := _today;

  IF NOT EXISTS (SELECT 1 FROM public.get_user_streak_days(_user_id) d WHERE d.day = _check_date) THEN
    _check_date := _check_date - 1;
  END IF;

  WHILE EXISTS (SELECT 1 FROM public.get_user_streak_days(_user_id) d WHERE d.day = _check_date) LOOP
    _streak := _streak + 1;
    _check_date := _check_date - 1;
    EXIT WHEN _streak >= 3650;
  END LOOP;

  RETURN _streak;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_user_streak(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_user_streak(uuid, date) TO service_role;

CREATE OR REPLACE FUNCTION public.get_member_room_streak(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _is_public boolean := false;
BEGIN
  IF _caller IS NULL THEN RETURN 0; END IF;

  IF _caller <> _user_id THEN
    SELECT COALESCE(is_stats_public, false) INTO _is_public
    FROM public.profiles WHERE user_id = _user_id;
    IF NOT _is_public THEN RETURN 0; END IF;
  END IF;

  RETURN public.calculate_user_streak(_user_id, NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.get_member_room_streak(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_room_streak(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_best_ever_streak(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_days AS (
    SELECT day AS d FROM public.get_user_streak_days(_user_id)
  ), grouped AS (
    SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d))::integer AS grp
    FROM active_days
  )
  SELECT COALESCE(MAX(cnt), 0)::integer
  FROM (SELECT COUNT(*) AS cnt FROM grouped GROUP BY grp) s;
$$;

REVOKE ALL ON FUNCTION public.get_best_ever_streak(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_best_ever_streak(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.auto_consume_pending_freezes(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tz text;
  _last_active date;
  _d date;
  _yesterday date;
  _max_gap_start date;
  _my text;
  _row record;
  _bal integer;
  _consumed boolean;
BEGIN
  IF _user_id IS NULL OR (auth.uid() IS NOT NULL AND auth.uid() <> _user_id) THEN RETURN; END IF;

  SELECT COALESCE(NULLIF(timezone, ''), 'America/Sao_Paulo') INTO _tz
  FROM public.profiles WHERE user_id = _user_id;
  IF _tz IS NULL THEN RETURN; END IF;

  _yesterday := (now() AT TIME ZONE _tz)::date - 1;
  _max_gap_start := _yesterday - 59;

  SELECT MAX((start_time AT TIME ZONE _tz)::date) INTO _last_active
  FROM public.time_entries
  WHERE user_id = _user_id AND end_time IS NOT NULL;

  IF _last_active IS NULL OR _last_active >= _yesterday THEN RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('freeze:' || _user_id::text));
  _d := GREATEST(_last_active + 1, _max_gap_start);

  WHILE _d <= _yesterday LOOP
    _my := to_char(_d, 'YYYY-MM');
    _consumed := false;
    _row := NULL;

    SELECT id, total_granted, used, COALESCE(auto_used_dates, ARRAY[]::date[]) AS dates
    INTO _row
    FROM public.streak_freezes
    WHERE user_id = _user_id AND month_year = _my
    FOR UPDATE;

    IF _row.id IS NOT NULL AND _d = ANY(_row.dates) THEN
      _d := _d + 1;
      CONTINUE;
    END IF;

    IF _row.id IS NOT NULL AND _row.used < _row.total_granted THEN
      UPDATE public.streak_freezes
      SET used = used + 1,
          auto_used_dates = ARRAY(SELECT DISTINCT unnest(COALESCE(auto_used_dates, ARRAY[]::date[]) || ARRAY[_d]))
      WHERE id = _row.id;
      _consumed := true;
    ELSE
      SELECT balance INTO _bal FROM public.purchased_streak_freezes WHERE user_id = _user_id FOR UPDATE;
      IF COALESCE(_bal, 0) > 0 THEN
        UPDATE public.purchased_streak_freezes
        SET balance = balance - 1, total_used = total_used + 1, updated_at = now()
        WHERE user_id = _user_id;
        IF _row.id IS NULL THEN
          INSERT INTO public.streak_freezes (user_id, month_year, total_granted, used, auto_used_dates)
          VALUES (_user_id, _my, 0, 0, ARRAY[_d]);
        ELSE
          UPDATE public.streak_freezes
          SET auto_used_dates = ARRAY(SELECT DISTINCT unnest(COALESCE(auto_used_dates, ARRAY[]::date[]) || ARRAY[_d]))
          WHERE id = _row.id;
        END IF;
        _consumed := true;
      END IF;
    END IF;

    IF NOT _consumed THEN EXIT; END IF;
    _d := _d + 1;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_consume_pending_freezes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auto_consume_pending_freezes(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refresh_last_known_streak()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _current_streak integer;
  _best integer;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.auto_consume_pending_freezes(_user_id);
  _current_streak := public.calculate_user_streak(_user_id, NULL);
  _best := GREATEST(public.get_best_ever_streak(_user_id), _current_streak);
  PERFORM set_config('app.streak_write', 'on', true);
  UPDATE public.profiles
  SET last_known_streak = GREATEST(COALESCE(last_known_streak, 0), _best)
  WHERE user_id = _user_id;
  PERFORM set_config('app.streak_write', 'off', true);
  RETURN _current_streak;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_grant_streak_rescue()
RETURNS TABLE(granted boolean, days_rescued integer, new_streak integer, last_streak integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _tz text;
  _today date;
  _anchor date;
  _current_start date;
  _gap_end date;
  _gap_start date;
  _previous_end date;
  _previous_start date;
  _previous_streak integer := 0;
  _last_known integer := 0;
  _last_rescue timestamptz;
  _gap_days integer := 0;
  _max_cover integer := 0;
  _d date;
  _my text;
BEGIN
  granted := false; days_rescued := 0; new_streak := 0; last_streak := 0;
  IF _user_id IS NULL THEN RETURN NEXT; RETURN; END IF;

  SELECT COALESCE(NULLIF(timezone, ''), 'America/Sao_Paulo'),
         COALESCE(last_known_streak, 0), last_streak_rescue_at
  INTO _tz, _last_known, _last_rescue
  FROM public.profiles WHERE user_id = _user_id;

  _today := (now() AT TIME ZONE _tz)::date;
  _anchor := CASE WHEN EXISTS(SELECT 1 FROM public.get_user_streak_days(_user_id) x WHERE x.day = _today)
                  THEN _today ELSE _today - 1 END;
  new_streak := public.calculate_user_streak(_user_id, _today);
  last_streak := GREATEST(_last_known, public.get_best_ever_streak(_user_id));

  IF _last_rescue IS NOT NULL AND _last_rescue > now() - interval '30 days' THEN RETURN NEXT; RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.get_user_streak_days(_user_id) x WHERE x.day = _anchor) THEN RETURN NEXT; RETURN; END IF;

  _current_start := _anchor;
  WHILE EXISTS(SELECT 1 FROM public.get_user_streak_days(_user_id) x WHERE x.day = _current_start - 1) LOOP
    _current_start := _current_start - 1;
  END LOOP;

  _gap_end := _current_start - 1;
  _previous_end := _gap_end;
  WHILE _previous_end >= _gap_end - 7
    AND NOT EXISTS(SELECT 1 FROM public.get_user_streak_days(_user_id) x WHERE x.day = _previous_end)
  LOOP
    _previous_end := _previous_end - 1;
  END LOOP;

  IF NOT EXISTS(SELECT 1 FROM public.get_user_streak_days(_user_id) x WHERE x.day = _previous_end) THEN RETURN NEXT; RETURN; END IF;
  _gap_start := _previous_end + 1;
  _gap_days := (_gap_end - _gap_start) + 1;
  IF _gap_days < 1 OR _gap_days > 7 THEN RETURN NEXT; RETURN; END IF;

  _previous_start := _previous_end;
  WHILE EXISTS(SELECT 1 FROM public.get_user_streak_days(_user_id) x WHERE x.day = _previous_start - 1) LOOP
    _previous_start := _previous_start - 1;
  END LOOP;
  _previous_streak := (_previous_end - _previous_start) + 1;
  last_streak := GREATEST(last_streak, _previous_streak);
  IF _previous_streak < 15 THEN RETURN NEXT; RETURN; END IF;

  _max_cover := CASE WHEN _previous_streak >= 100 THEN 7 WHEN _previous_streak >= 60 THEN 5 WHEN _previous_streak >= 30 THEN 3 ELSE 2 END;
  IF _gap_days > _max_cover THEN RETURN NEXT; RETURN; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('streak-rescue:' || _user_id::text));
  _d := _gap_start;
  WHILE _d <= _gap_end LOOP
    _my := to_char(_d, 'YYYY-MM');
    INSERT INTO public.streak_freezes (user_id, month_year, total_granted, used, auto_used_dates)
    VALUES (_user_id, _my, 1, 1, ARRAY[_d])
    ON CONFLICT (user_id, month_year) DO UPDATE
    SET total_granted = public.streak_freezes.total_granted + CASE WHEN _d = ANY(COALESCE(public.streak_freezes.auto_used_dates, ARRAY[]::date[])) THEN 0 ELSE 1 END,
        used = public.streak_freezes.used + CASE WHEN _d = ANY(COALESCE(public.streak_freezes.auto_used_dates, ARRAY[]::date[])) THEN 0 ELSE 1 END,
        auto_used_dates = ARRAY(SELECT DISTINCT unnest(COALESCE(public.streak_freezes.auto_used_dates, ARRAY[]::date[]) || ARRAY[_d]));
    _d := _d + 1;
  END LOOP;

  new_streak := public.calculate_user_streak(_user_id, _today);
  PERFORM set_config('app.streak_write', 'on', true);
  UPDATE public.profiles
  SET last_streak_rescue_at = now(),
      last_known_streak = GREATEST(COALESCE(last_known_streak, 0), new_streak, last_streak)
  WHERE user_id = _user_id;
  PERFORM set_config('app.streak_write', 'off', true);

  granted := true; days_rescued := _gap_days;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_streak_shield_status()
RETURNS TABLE(current_streak integer, best_streak integer, monthly_allowance integer, monthly_used integer, monthly_remaining integer, purchased_balance integer, rescue_available boolean, rescue_days_cover integer, rescue_days_absent integer, rescue_next_available_in integer, last_rescue_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _tz text;
  _today date;
  _anchor date;
  _current_start date;
  _gap_end date;
  _previous_end date;
  _previous_start date;
  _previous_streak integer := 0;
  _last_rescue timestamptz;
  _granted integer := 0;
  _used integer := 0;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  SELECT COALESCE(NULLIF(timezone,''),'America/Sao_Paulo'), last_streak_rescue_at
  INTO _tz, _last_rescue FROM public.profiles WHERE user_id=_user_id;
  _today := (now() AT TIME ZONE _tz)::date;
  current_streak := public.calculate_user_streak(_user_id, _today);
  SELECT GREATEST(COALESCE(last_known_streak,0), public.get_best_ever_streak(_user_id), current_streak)
  INTO best_streak FROM public.profiles WHERE user_id=_user_id;
  monthly_allowance := public.get_monthly_freeze_allowance(_user_id);
  SELECT COALESCE(total_granted,0), COALESCE(used,0) INTO _granted,_used
  FROM public.streak_freezes WHERE user_id=_user_id AND month_year=to_char(_today,'YYYY-MM');
  monthly_used := COALESCE(_used,0);
  monthly_remaining := GREATEST(0,GREATEST(monthly_allowance,COALESCE(_granted,0))-monthly_used);
  SELECT COALESCE(balance,0) INTO purchased_balance FROM public.purchased_streak_freezes WHERE user_id=_user_id;
  purchased_balance := COALESCE(purchased_balance,0);
  last_rescue_at := _last_rescue;
  rescue_next_available_in := CASE WHEN _last_rescue IS NULL THEN 0 ELSE GREATEST(0,30-EXTRACT(DAY FROM now()-_last_rescue)::integer) END;
  rescue_available := false; rescue_days_absent := 0; rescue_days_cover := 0;

  _anchor := CASE WHEN EXISTS(SELECT 1 FROM public.get_user_streak_days(_user_id) x WHERE x.day=_today) THEN _today ELSE _today-1 END;
  IF EXISTS(SELECT 1 FROM public.get_user_streak_days(_user_id) x WHERE x.day=_anchor) THEN
    _current_start := _anchor;
    WHILE EXISTS(SELECT 1 FROM public.get_user_streak_days(_user_id) x WHERE x.day=_current_start-1) LOOP _current_start:=_current_start-1; END LOOP;
    _gap_end := _current_start-1; _previous_end:=_gap_end;
    WHILE _previous_end>=_gap_end-7 AND NOT EXISTS(SELECT 1 FROM public.get_user_streak_days(_user_id) x WHERE x.day=_previous_end) LOOP _previous_end:=_previous_end-1; END LOOP;
    IF EXISTS(SELECT 1 FROM public.get_user_streak_days(_user_id) x WHERE x.day=_previous_end) THEN
      rescue_days_absent := (_gap_end-_previous_end);
      _previous_start:=_previous_end;
      WHILE EXISTS(SELECT 1 FROM public.get_user_streak_days(_user_id) x WHERE x.day=_previous_start-1) LOOP _previous_start:=_previous_start-1; END LOOP;
      _previous_streak:=(_previous_end-_previous_start)+1;
      rescue_days_cover:=LEAST(rescue_days_absent,CASE WHEN _previous_streak>=100 THEN 7 WHEN _previous_streak>=60 THEN 5 WHEN _previous_streak>=30 THEN 3 ELSE 2 END);
      rescue_available:=_previous_streak>=15 AND rescue_days_absent BETWEEN 1 AND 7 AND rescue_days_cover=rescue_days_absent AND rescue_next_available_in=0;
    END IF;
  END IF;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_room_members_streaks(_room_id uuid)
RETURNS TABLE(user_id uuid, streak integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rm.user_id, public.calculate_user_streak(rm.user_id, NULL)
  FROM public.room_members rm
  WHERE rm.room_id = _room_id
    AND public.is_room_member(_room_id, auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_room_members_streaks(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_room_members_streaks(uuid) TO authenticated, service_role;