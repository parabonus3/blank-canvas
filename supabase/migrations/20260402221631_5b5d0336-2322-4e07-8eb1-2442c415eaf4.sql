
-- Create streak_freezes table
CREATE TABLE public.streak_freezes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month_year text NOT NULL,
  total_granted integer NOT NULL DEFAULT 0,
  used integer NOT NULL DEFAULT 0,
  auto_used_dates date[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month_year)
);

ALTER TABLE public.streak_freezes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak freezes"
ON public.streak_freezes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streak freezes"
ON public.streak_freezes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streak freezes"
ON public.streak_freezes FOR UPDATE
USING (auth.uid() = user_id);

-- Update get_member_room_streak to consider freeze dates
CREATE OR REPLACE FUNCTION public.get_member_room_streak(_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _streak integer := 0;
  _check_date date := CURRENT_DATE;
  _has_activity boolean;
  _has_freeze boolean;
BEGIN
  LOOP
    -- Check if user had activity on this date
    SELECT EXISTS(
      SELECT 1 FROM public.time_entries te
      WHERE te.user_id = _user_id
        AND te.end_time IS NOT NULL
        AND te.start_time::date = _check_date
    ) INTO _has_activity;

    -- If no activity, check if a freeze was used on this date
    IF NOT _has_activity THEN
      SELECT EXISTS(
        SELECT 1 FROM public.streak_freezes sf
        WHERE sf.user_id = _user_id
          AND _check_date = ANY(sf.auto_used_dates)
      ) INTO _has_freeze;
    ELSE
      _has_freeze := false;
    END IF;

    -- If no activity and no freeze, and it's a past date, break
    IF NOT _has_activity AND NOT _has_freeze AND _check_date < CURRENT_DATE THEN
      EXIT;
    END IF;

    -- Count the day if there was activity or a freeze
    IF _has_activity OR _has_freeze THEN
      _streak := _streak + 1;
    END IF;

    _check_date := _check_date - 1;

    IF _streak > 365 THEN EXIT; END IF;
  END LOOP;

  RETURN _streak;
END;
$function$;
