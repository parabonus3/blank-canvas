
CREATE OR REPLACE FUNCTION public.get_room_members_streaks(_room_id uuid)
RETURNS TABLE(user_id uuid, streak integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _member RECORD;
  _check_date date;
  _has_activity boolean;
  _streak integer;
BEGIN
  FOR _member IN SELECT rm.user_id FROM public.room_members rm WHERE rm.room_id = _room_id
  LOOP
    _streak := 0;
    _check_date := CURRENT_DATE;
    LOOP
      SELECT EXISTS(
        SELECT 1 FROM public.time_entries te
        WHERE te.user_id = _member.user_id
          AND te.end_time IS NOT NULL
          AND te.start_time::date = _check_date
      ) INTO _has_activity;

      IF NOT _has_activity AND _check_date < CURRENT_DATE THEN
        EXIT;
      END IF;

      IF _has_activity THEN
        _streak := _streak + 1;
      END IF;

      _check_date := _check_date - 1;
      IF _streak > 365 THEN EXIT; END IF;
    END LOOP;

    user_id := _member.user_id;
    streak := _streak;
    RETURN NEXT;
  END LOOP;
END;
$$;
