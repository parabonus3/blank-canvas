
-- 1) time_entries.room_id (link da sessão à sala)
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.study_rooms(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_room_id ON public.time_entries(room_id) WHERE room_id IS NOT NULL;

-- 2) profile preference
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_room_challenge_alerts boolean NOT NULL DEFAULT true;

-- 3) room_challenges
CREATE TABLE IF NOT EXISTS public.room_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  emoji text DEFAULT '🎯',
  period_type text NOT NULL CHECK (period_type IN ('daily','weekly')),
  target_minutes integer NOT NULL CHECK (target_minutes BETWEEN 1 AND 1440),
  duration_days integer,
  start_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_room_challenges_room ON public.room_challenges(room_id, is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_challenges TO authenticated;
GRANT ALL ON public.room_challenges TO service_role;
ALTER TABLE public.room_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read challenges" ON public.room_challenges;
CREATE POLICY "members read challenges" ON public.room_challenges
  FOR SELECT TO authenticated
  USING (public.is_room_member(auth.uid(), room_id));

DROP POLICY IF EXISTS "owner insert challenges" ON public.room_challenges;
CREATE POLICY "owner insert challenges" ON public.room_challenges
  FOR INSERT TO authenticated
  WITH CHECK (public.is_room_owner(auth.uid(), room_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "owner update challenges" ON public.room_challenges;
CREATE POLICY "owner update challenges" ON public.room_challenges
  FOR UPDATE TO authenticated
  USING (public.is_room_owner(auth.uid(), room_id))
  WITH CHECK (public.is_room_owner(auth.uid(), room_id));

DROP POLICY IF EXISTS "owner delete challenges" ON public.room_challenges;
CREATE POLICY "owner delete challenges" ON public.room_challenges
  FOR DELETE TO authenticated
  USING (public.is_room_owner(auth.uid(), room_id));

CREATE TRIGGER trg_room_challenges_updated_at
  BEFORE UPDATE ON public.room_challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) room_challenge_progress
CREATE TABLE IF NOT EXISTS public.room_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.room_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  period_key text NOT NULL,
  period_start date NOT NULL,
  seconds_in_period integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id, period_key)
);
CREATE INDEX IF NOT EXISTS idx_rcp_challenge_user ON public.room_challenge_progress(challenge_id, user_id);
CREATE INDEX IF NOT EXISTS idx_rcp_period ON public.room_challenge_progress(challenge_id, period_start);

GRANT SELECT ON public.room_challenge_progress TO authenticated;
GRANT ALL ON public.room_challenge_progress TO service_role;
ALTER TABLE public.room_challenge_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read progress" ON public.room_challenge_progress;
CREATE POLICY "members read progress" ON public.room_challenge_progress
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.room_challenges c
      WHERE c.id = challenge_id AND public.is_room_member(auth.uid(), c.room_id)
    )
  );

-- 5) RPC: create challenge
CREATE OR REPLACE FUNCTION public.create_room_challenge(
  _room_id uuid,
  _title text,
  _description text DEFAULT NULL,
  _emoji text DEFAULT '🎯',
  _period_type text DEFAULT 'daily',
  _target_minutes integer DEFAULT 10,
  _duration_days integer DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_room_owner(_uid, _room_id) THEN
    RAISE EXCEPTION 'Only the room owner can create challenges';
  END IF;
  IF _period_type NOT IN ('daily','weekly') THEN
    RAISE EXCEPTION 'Invalid period_type';
  END IF;
  INSERT INTO public.room_challenges (room_id, created_by, title, description, emoji, period_type, target_minutes, duration_days)
  VALUES (_room_id, _uid, _title, _description, COALESCE(_emoji,'🎯'), _period_type, _target_minutes, _duration_days)
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

-- 6) RPC: update challenge
CREATE OR REPLACE FUNCTION public.update_room_challenge(
  _id uuid,
  _title text,
  _description text,
  _emoji text,
  _target_minutes integer,
  _duration_days integer,
  _is_active boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _room uuid;
BEGIN
  SELECT room_id INTO _room FROM public.room_challenges WHERE id = _id;
  IF _room IS NULL THEN RAISE EXCEPTION 'Challenge not found'; END IF;
  IF NOT public.is_room_owner(auth.uid(), _room) THEN
    RAISE EXCEPTION 'Only the room owner can update challenges';
  END IF;
  UPDATE public.room_challenges
    SET title = COALESCE(_title, title),
        description = _description,
        emoji = COALESCE(_emoji, emoji),
        target_minutes = COALESCE(_target_minutes, target_minutes),
        duration_days = _duration_days,
        is_active = COALESCE(_is_active, is_active)
   WHERE id = _id;
END; $$;

-- 7) RPC: delete challenge
CREATE OR REPLACE FUNCTION public.delete_room_challenge(_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _room uuid;
BEGIN
  SELECT room_id INTO _room FROM public.room_challenges WHERE id = _id;
  IF _room IS NULL THEN RETURN; END IF;
  IF NOT public.is_room_owner(auth.uid(), _room) THEN
    RAISE EXCEPTION 'Only the room owner can delete challenges';
  END IF;
  DELETE FROM public.room_challenges WHERE id = _id;
END; $$;

-- 8) Helper: compute period_key and period_start for a given timestamp
CREATE OR REPLACE FUNCTION public.compute_challenge_period(
  _period_type text, _at timestamptz, _tz text
) RETURNS TABLE(period_key text, period_start date)
LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
DECLARE _local_date date;
BEGIN
  _local_date := (_at AT TIME ZONE COALESCE(_tz,'UTC'))::date;
  IF _period_type = 'weekly' THEN
    period_start := date_trunc('week', _local_date)::date;
    period_key := to_char(period_start, 'IYYY-"W"IW');
  ELSE
    period_start := _local_date;
    period_key := to_char(_local_date, 'YYYY-MM-DD');
  END IF;
  RETURN NEXT;
END; $$;

-- 9) Internal: record progress for one user/room/seconds at given end_time
CREATE OR REPLACE FUNCTION public.record_room_challenge_progress(
  _room_id uuid, _user_id uuid, _seconds integer, _at timestamptz
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
  SELECT COALESCE(timezone,'UTC') INTO _tz FROM public.profiles WHERE user_id = _user_id;

  FOR _c IN
    SELECT * FROM public.room_challenges
    WHERE room_id = _room_id
      AND is_active = true
      AND start_date <= (_at AT TIME ZONE COALESCE(_tz,'UTC'))::date
      AND (duration_days IS NULL OR (start_date + duration_days) > (_at AT TIME ZONE COALESCE(_tz,'UTC'))::date)
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

    -- check completion AFTER upsert
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

-- 10) Trigger on time_entries: when an entry finishes with a room_id, record progress
CREATE OR REPLACE FUNCTION public.trg_time_entry_room_progress()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.end_time IS NOT NULL
     AND NEW.room_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.end_time IS NULL)
     AND NEW.duration > 0 THEN
    PERFORM public.record_room_challenge_progress(NEW.room_id, NEW.user_id, NEW.duration, NEW.end_time);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS time_entries_room_progress ON public.time_entries;
CREATE TRIGGER time_entries_room_progress
AFTER INSERT OR UPDATE OF end_time ON public.time_entries
FOR EACH ROW EXECUTE FUNCTION public.trg_time_entry_room_progress();

-- 11) Read RPC: challenges with per-member status for a room
CREATE OR REPLACE FUNCTION public.get_room_challenges_with_status(_room_id uuid)
RETURNS TABLE(
  challenge_id uuid,
  title text,
  description text,
  emoji text,
  period_type text,
  target_minutes integer,
  duration_days integer,
  start_date date,
  is_active boolean,
  created_at timestamptz,
  members jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.is_room_member(_uid, _room_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.id, c.title, c.description, c.emoji, c.period_type, c.target_minutes,
         c.duration_days, c.start_date, c.is_active, c.created_at,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'user_id', rm.user_id,
             'display_name', p.display_name,
             'avatar_url', p.avatar_url,
             'avatar_flair', p.avatar_flair,
             'avatar_flair_color', p.avatar_flair_color,
             'seconds_current', COALESCE(cur.seconds_in_period, 0),
             'completed_current', COALESCE(cur.completed, false),
             'last_completed_at', last_completed.completed_at,
             'completed_periods_total', COALESCE(stats.completed_count, 0),
             'days_since_completed', CASE
                WHEN last_completed.period_start IS NULL THEN NULL
                ELSE GREATEST(0, (CURRENT_DATE - last_completed.period_start))::int
             END
           ) ORDER BY p.display_name)
           FROM public.room_members rm
           JOIN public.profiles p ON p.user_id = rm.user_id
           LEFT JOIN LATERAL (
             SELECT seconds_in_period, completed
             FROM public.room_challenge_progress rcp
             WHERE rcp.challenge_id = c.id AND rcp.user_id = rm.user_id
               AND rcp.period_start = CASE WHEN c.period_type = 'weekly'
                                          THEN date_trunc('week', CURRENT_DATE)::date
                                          ELSE CURRENT_DATE END
             LIMIT 1
           ) cur ON true
           LEFT JOIN LATERAL (
             SELECT period_start, completed_at FROM public.room_challenge_progress rcp2
             WHERE rcp2.challenge_id = c.id AND rcp2.user_id = rm.user_id AND rcp2.completed = true
             ORDER BY period_start DESC LIMIT 1
           ) last_completed ON true
           LEFT JOIN LATERAL (
             SELECT COUNT(*)::int AS completed_count FROM public.room_challenge_progress rcp3
             WHERE rcp3.challenge_id = c.id AND rcp3.user_id = rm.user_id AND rcp3.completed = true
           ) stats ON true
           WHERE rm.room_id = _room_id
         ), '[]'::jsonb) AS members
    FROM public.room_challenges c
   WHERE c.room_id = _room_id
   ORDER BY c.is_active DESC, c.created_at DESC;
END; $$;

GRANT EXECUTE ON FUNCTION public.create_room_challenge(uuid,text,text,text,text,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_room_challenge(uuid,text,text,text,integer,integer,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_room_challenge(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_challenges_with_status(uuid) TO authenticated;

-- 12) Read RPC: per-member calendar
CREATE OR REPLACE FUNCTION public.get_member_challenge_calendar(
  _challenge_id uuid, _user_id uuid, _from date, _to date
) RETURNS TABLE(period_start date, seconds_in_period integer, completed boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _room uuid;
BEGIN
  SELECT room_id INTO _room FROM public.room_challenges WHERE id = _challenge_id;
  IF _room IS NULL OR NOT public.is_room_member(auth.uid(), _room) THEN RETURN; END IF;
  RETURN QUERY
  SELECT rcp.period_start, rcp.seconds_in_period, rcp.completed
    FROM public.room_challenge_progress rcp
   WHERE rcp.challenge_id = _challenge_id AND rcp.user_id = _user_id
     AND rcp.period_start BETWEEN _from AND _to
   ORDER BY rcp.period_start;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_member_challenge_calendar(uuid,uuid,date,date) TO authenticated;
