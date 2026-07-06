
-- 1) Add nullable challenge_id to time_entries
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS challenge_id uuid NULL
    REFERENCES public.room_challenges(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_challenge
  ON public.time_entries(challenge_id)
  WHERE challenge_id IS NOT NULL;

-- 2) Update record_room_challenge_progress to accept an optional single challenge target
CREATE OR REPLACE FUNCTION public.record_room_challenge_progress(
  _room_id uuid,
  _user_id uuid,
  _seconds integer,
  _at timestamptz,
  _challenge_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tz text;
  _c record;
  _p record;
  _target_seconds integer;
  _new_total integer;
  _was_completed boolean;
BEGIN
  IF _seconds IS NULL OR _seconds <= 0 THEN RETURN; END IF;
  _tz := public.get_room_timezone(_room_id);

  FOR _c IN
    SELECT * FROM public.room_challenges
    WHERE room_id = _room_id
      AND is_active = true
      AND start_date <= (_at AT TIME ZONE _tz)::date
      AND (duration_days IS NULL OR (start_date + duration_days) > (_at AT TIME ZONE _tz)::date)
      AND (_challenge_id IS NULL OR id = _challenge_id)
  LOOP
    SELECT * INTO _p FROM public.compute_challenge_period(_c.period_type, _at, _tz);
    _target_seconds := _c.target_minutes * 60;

    INSERT INTO public.room_challenge_progress (
      challenge_id, user_id, period_key, period_start, seconds_in_period, completed, completed_at
    ) VALUES (
      _c.id, _user_id, _p.period_key, _p.period_start, _seconds,
      _seconds >= _target_seconds,
      CASE WHEN _seconds >= _target_seconds THEN now() ELSE NULL END
    )
    ON CONFLICT (challenge_id, user_id, period_key) DO UPDATE
      SET seconds_in_period = public.room_challenge_progress.seconds_in_period + EXCLUDED.seconds_in_period,
          updated_at = now();

    SELECT completed, seconds_in_period INTO _was_completed, _new_total
      FROM public.room_challenge_progress
     WHERE challenge_id = _c.id AND user_id = _user_id AND period_key = _p.period_key;

    IF NOT _was_completed AND _new_total >= _target_seconds THEN
      UPDATE public.room_challenge_progress
        SET completed = true, completed_at = now()
        WHERE challenge_id = _c.id AND user_id = _user_id AND period_key = _p.period_key;
    END IF;
  END LOOP;
END; $$;

-- 3) Update the time_entries trigger to forward the chosen challenge_id
CREATE OR REPLACE FUNCTION public.trg_time_entry_room_progress()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.end_time IS NOT NULL
     AND NEW.room_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.end_time IS NULL)
     AND NEW.duration > 0 THEN
    PERFORM public.record_room_challenge_progress(
      NEW.room_id, NEW.user_id, NEW.duration, NEW.end_time, NEW.challenge_id
    );
  END IF;
  RETURN NEW;
END; $$;
