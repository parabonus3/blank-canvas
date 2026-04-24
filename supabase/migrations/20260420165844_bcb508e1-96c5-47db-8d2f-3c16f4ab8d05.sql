-- Add columns to profiles for streak rescue system
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_streak_rescue_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_known_streak integer NOT NULL DEFAULT 0;

-- Function: refresh_last_known_streak
-- Called after a study session ends; bumps last_known_streak to current streak if higher
CREATE OR REPLACE FUNCTION public.refresh_last_known_streak()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _current_streak integer;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  _current_streak := public.get_member_room_streak(_user_id);

  UPDATE public.profiles
  SET last_known_streak = GREATEST(COALESCE(last_known_streak, 0), _current_streak)
  WHERE user_id = _user_id;

  RETURN _current_streak;
END;
$$;

-- Function: check_and_grant_streak_rescue
-- Evaluates if user is eligible for a retroactive streak rescue and grants it.
CREATE OR REPLACE FUNCTION public.check_and_grant_streak_rescue()
RETURNS TABLE(granted boolean, days_rescued integer, new_streak integer, last_streak integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _current_streak integer;
  _last_known integer;
  _last_rescue timestamptz;
  _days_absent integer := 0;
  _max_cover integer := 0;
  _check_date date;
  _has_activity boolean;
  _has_freeze boolean;
  _i integer;
  _month_year text;
  _freeze_id uuid;
  _existing_dates date[];
  _new_dates date[];
  _granted_count integer := 0;
  _final_streak integer;
BEGIN
  granted := false;
  days_rescued := 0;
  new_streak := 0;
  last_streak := 0;

  IF _user_id IS NULL THEN
    RETURN NEXT;
    RETURN;
  END IF;

  -- Load profile state
  SELECT COALESCE(last_known_streak, 0), last_streak_rescue_at
  INTO _last_known, _last_rescue
  FROM public.profiles WHERE user_id = _user_id;

  last_streak := _last_known;

  -- Compute current streak
  _current_streak := public.get_member_room_streak(_user_id);
  new_streak := _current_streak;

  -- Eligibility checks
  IF _current_streak > 0 THEN RETURN NEXT; RETURN; END IF;
  IF _last_known < 15 THEN RETURN NEXT; RETURN; END IF;
  IF _last_rescue IS NOT NULL AND _last_rescue > (now() - INTERVAL '30 days') THEN
    RETURN NEXT; RETURN;
  END IF;

  -- Determine consecutive absence days going back from yesterday
  _check_date := CURRENT_DATE - 1;
  WHILE _days_absent < 10 LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.time_entries te
      WHERE te.user_id = _user_id AND te.end_time IS NOT NULL
        AND te.start_time::date = _check_date
    ) INTO _has_activity;
    SELECT EXISTS(
      SELECT 1 FROM public.streak_freezes sf
      WHERE sf.user_id = _user_id AND _check_date = ANY(sf.auto_used_dates)
    ) INTO _has_freeze;
    EXIT WHEN _has_activity OR _has_freeze;
    _days_absent := _days_absent + 1;
    _check_date := _check_date - 1;
  END LOOP;

  -- Must be 1-7 days absent
  IF _days_absent < 1 OR _days_absent > 7 THEN
    RETURN NEXT; RETURN;
  END IF;

  -- Progressive scale: max coverage based on last_known_streak
  IF _last_known >= 100 THEN _max_cover := 7;
  ELSIF _last_known >= 60 THEN _max_cover := 5;
  ELSIF _last_known >= 30 THEN _max_cover := 3;
  ELSE _max_cover := 2; -- 15-29
  END IF;

  _granted_count := LEAST(_days_absent, _max_cover);

  -- Build dates to add (the absent dates from yesterday going back)
  _new_dates := ARRAY[]::date[];
  FOR _i IN 1.._granted_count LOOP
    _new_dates := array_append(_new_dates, (CURRENT_DATE - _i)::date);
  END LOOP;

  -- Insert / update streak_freezes for current month
  _month_year := to_char(CURRENT_DATE, 'YYYY-MM');

  SELECT id, COALESCE(auto_used_dates, ARRAY[]::date[])
  INTO _freeze_id, _existing_dates
  FROM public.streak_freezes
  WHERE user_id = _user_id AND month_year = _month_year;

  IF _freeze_id IS NULL THEN
    INSERT INTO public.streak_freezes (user_id, month_year, total_granted, used, auto_used_dates)
    VALUES (_user_id, _month_year, _granted_count, _granted_count, _new_dates);
  ELSE
    UPDATE public.streak_freezes
    SET auto_used_dates = ARRAY(SELECT DISTINCT unnest(_existing_dates || _new_dates)),
        used = used + _granted_count,
        total_granted = total_granted + _granted_count
    WHERE id = _freeze_id;
  END IF;

  -- Mark rescue timestamp
  UPDATE public.profiles
  SET last_streak_rescue_at = now()
  WHERE user_id = _user_id;

  -- Recompute streak after rescue
  _final_streak := public.get_member_room_streak(_user_id);

  -- Update last_known_streak with new value (in case it grew)
  UPDATE public.profiles
  SET last_known_streak = GREATEST(last_known_streak, _final_streak)
  WHERE user_id = _user_id;

  granted := true;
  days_rescued := _granted_count;
  new_streak := _final_streak;
  RETURN NEXT;
END;
$$;