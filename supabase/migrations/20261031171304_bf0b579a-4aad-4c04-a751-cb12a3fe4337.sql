CREATE OR REPLACE FUNCTION public.join_live_room_session(_session_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO s FROM room_sessions WHERE id = _session_id;
  IF NOT FOUND OR s.is_cancelled OR now() < s.start_at - interval '5 minutes' OR now() >= s.end_at THEN
    RAISE EXCEPTION 'session not live';
  END IF;
  IF NOT is_room_member(auth.uid(), s.room_id) THEN RAISE EXCEPTION 'not a member'; END IF;
  INSERT INTO room_session_attendees(session_id, user_id, confirmed) VALUES (_session_id, auth.uid(), true)
    ON CONFLICT (session_id, user_id) DO UPDATE SET confirmed = true;
  UPDATE study_rooms SET focus_session_end_at = s.end_at,
    focus_session_duration = GREATEST(1, ceil(extract(epoch FROM (s.end_at - GREATEST(s.start_at, now()))) / 60)::int),
    focus_session_started_by = s.created_by, focus_session_start_at = NULL
  WHERE id = s.room_id AND (focus_session_end_at IS NULL OR focus_session_end_at <= now());
  UPDATE room_members SET focus_session_joined = true WHERE room_id = s.room_id AND user_id = auth.uid();
  RETURN s.room_id;
END $$;
REVOKE ALL ON FUNCTION public.join_live_room_session(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.join_live_room_session(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_room_focus_summary(_room_id uuid, _start timestamptz, _end timestamptz)
RETURNS TABLE(total_seconds bigint, people integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(sum(GREATEST(0, extract(epoch FROM (LEAST(COALESCE(e.end_time, now()), _end) - GREATEST(e.start_time, _start))))),0)::bigint,
         count(DISTINCT e.user_id)::int
  FROM time_entries e
  WHERE is_room_member(auth.uid(), _room_id) AND e.room_id = _room_id
    AND e.start_time < _end AND COALESCE(e.end_time, now()) > _start
    AND _end - _start <= interval '24 hours';
$$;
REVOKE ALL ON FUNCTION public.get_room_focus_summary(uuid, timestamptz, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_room_focus_summary(uuid, timestamptz, timestamptz) TO authenticated;

CREATE TABLE public.user_social_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_type text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_type)
);
GRANT SELECT ON public.user_social_achievements TO authenticated;
GRANT ALL ON public.user_social_achievements TO service_role;
ALTER TABLE public.user_social_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own social achievements" ON public.user_social_achievements
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.check_social_achievements()
RETURNS SETOF text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); tz text; group_n int; kept boolean; duel boolean; chal boolean; same7 boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT COALESCE(timezone,'America/Sao_Paulo') INTO tz FROM profiles WHERE user_id = uid;
  WITH ov AS (
    SELECT s.id, s.start_at, s.end_at,
      sum(GREATEST(0, extract(epoch FROM (LEAST(COALESCE(e.end_time, now()), s.end_at) - GREATEST(e.start_time, s.start_at))))) AS secs
    FROM room_sessions s JOIN time_entries e ON e.room_id = s.room_id AND e.user_id = uid
      AND e.start_time < s.end_at AND COALESCE(e.end_time, now()) > s.start_at
    WHERE NOT s.is_cancelled AND s.start_at < now()
    GROUP BY s.id, s.start_at, s.end_at)
  SELECT count(*) FILTER (WHERE secs >= 600),
         bool_or(secs >= 0.5 * extract(epoch FROM (end_at - start_at)) AND EXISTS (
           SELECT 1 FROM room_session_attendees a WHERE a.session_id = ov.id AND a.user_id = uid AND a.confirmed))
  INTO group_n, kept FROM ov;
  duel := EXISTS (SELECT 1 FROM duels WHERE winner_id = uid AND status = 'finished');
  chal := EXISTS (SELECT 1 FROM room_challenge_progress WHERE user_id = uid AND completed);
  same7 := EXISTS (SELECT 1 FROM (SELECT room_id, count(DISTINCT (start_time AT TIME ZONE tz)::date) d
    FROM time_entries WHERE user_id = uid AND room_id IS NOT NULL AND end_time IS NOT NULL GROUP BY room_id) x WHERE d >= 7);
  INSERT INTO user_social_achievements(user_id, achievement_type)
  SELECT uid, t FROM (VALUES ('group_first', group_n >= 1), ('group_five', group_n >= 5), ('kept_promise', COALESCE(kept,false)),
    ('duel_win', duel), ('challenge_done', chal), ('same_room_7', same7)) v(t, ok)
  WHERE ok ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT achievement_type FROM user_social_achievements WHERE user_id = uid;
END $$;
REVOKE ALL ON FUNCTION public.check_social_achievements() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.check_social_achievements() TO authenticated;