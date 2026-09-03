-- =====================================================================
-- FASE 3: rotinas de foco, duelos 1v1, perfis de GPS, sessões agendadas
-- =====================================================================

-- ---------------------------------------------------------------
-- 1. ROTINAS DE FOCO
-- ---------------------------------------------------------------
CREATE TABLE public.focus_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  emoji text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.focus_routines TO authenticated;
GRANT ALL ON public.focus_routines TO service_role;

ALTER TABLE public.focus_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "focus_routines_select_own" ON public.focus_routines
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "focus_routines_insert_own" ON public.focus_routines
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "focus_routines_update_own" ON public.focus_routines
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "focus_routines_delete_own" ON public.focus_routines
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_focus_routines_user ON public.focus_routines (user_id, position);

CREATE TRIGGER trg_focus_routines_updated_at
  BEFORE UPDATE ON public.focus_routines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------
-- 2. DUELOS 1v1
-- ---------------------------------------------------------------
CREATE TABLE public.duels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL,
  opponent_id uuid NOT NULL,
  title text,
  target_minutes integer NOT NULL DEFAULT 300,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  winner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT duels_distinct_players CHECK (challenger_id <> opponent_id),
  CONSTRAINT duels_status_valid CHECK (status IN ('pending','active','finished','declined','cancelled'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.duels TO authenticated;
GRANT ALL ON public.duels TO service_role;

ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "duels_select_participants" ON public.duels
  FOR SELECT TO authenticated
  USING (challenger_id = auth.uid() OR opponent_id = auth.uid());
CREATE POLICY "duels_insert_challenger" ON public.duels
  FOR INSERT TO authenticated WITH CHECK (challenger_id = auth.uid());
CREATE POLICY "duels_update_participants" ON public.duels
  FOR UPDATE TO authenticated
  USING (challenger_id = auth.uid() OR opponent_id = auth.uid())
  WITH CHECK (challenger_id = auth.uid() OR opponent_id = auth.uid());
CREATE POLICY "duels_delete_challenger" ON public.duels
  FOR DELETE TO authenticated USING (challenger_id = auth.uid());

CREATE INDEX idx_duels_challenger ON public.duels (challenger_id, status);
CREATE INDEX idx_duels_opponent ON public.duels (opponent_id, status);

CREATE TRIGGER trg_duels_updated_at
  BEFORE UPDATE ON public.duels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Placar ao vivo do duelo
CREATE OR REPLACE FUNCTION public.get_duel_scoreboard(_duel_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  seconds integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.duels;
BEGIN
  SELECT * INTO d FROM public.duels WHERE id = _duel_id;
  IF d.id IS NULL THEN
    RETURN;
  END IF;
  IF auth.uid() IS NULL OR (auth.uid() <> d.challenger_id AND auth.uid() <> d.opponent_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH players AS (
    SELECT d.challenger_id AS uid
    UNION ALL
    SELECT d.opponent_id
  )
  SELECT
    p.uid,
    pr.display_name,
    pr.avatar_url,
    COALESCE((
      SELECT SUM(COALESCE(te.duration, 0))::integer
      FROM public.time_entries te
      WHERE te.user_id = p.uid
        AND te.end_time IS NOT NULL
        AND (te.start_time AT TIME ZONE COALESCE(pr.timezone, 'America/Sao_Paulo'))::date
              BETWEEN d.start_date AND d.end_date
    ), 0) AS seconds
  FROM players p
  LEFT JOIN public.profiles pr ON pr.user_id = p.uid;
END;
$$;

REVOKE ALL ON FUNCTION public.get_duel_scoreboard(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_duel_scoreboard(uuid) TO authenticated;

-- ---------------------------------------------------------------
-- 3. PERFIS DE ATIVIDADE NO GPS
-- ---------------------------------------------------------------
ALTER TABLE public.gps_activities
  ADD COLUMN IF NOT EXISTS activity_type text NOT NULL DEFAULT 'run';

ALTER TABLE public.gps_activities
  ADD CONSTRAINT gps_activities_activity_type_valid
  CHECK (activity_type IN ('run','walk','bike','hike'));

CREATE OR REPLACE FUNCTION public.get_my_gps_records()
RETURNS TABLE (
  activity_type text,
  total_activities integer,
  total_distance_meters numeric,
  longest_distance_meters numeric,
  best_pace_seconds_per_km numeric,
  max_speed numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.activity_type,
    COUNT(*)::integer,
    COALESCE(SUM(g.distance_meters), 0),
    COALESCE(MAX(g.distance_meters), 0),
    MIN(NULLIF(g.avg_pace_seconds_per_km, 0)),
    MAX(g.max_speed)
  FROM public.gps_activities g
  WHERE g.user_id = auth.uid()
    AND g.ended_at IS NOT NULL
    AND g.distance_meters > 0
  GROUP BY g.activity_type;
$$;

REVOKE ALL ON FUNCTION public.get_my_gps_records() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_gps_records() TO authenticated;

-- ---------------------------------------------------------------
-- 4. SESSÕES AGENDADAS NA SALA
-- ---------------------------------------------------------------
CREATE TABLE public.room_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reminder_sent_at timestamptz,
  is_cancelled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_sessions TO authenticated;
GRANT ALL ON public.room_sessions TO service_role;

ALTER TABLE public.room_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_sessions_select_members" ON public.room_sessions
  FOR SELECT TO authenticated USING (public.is_room_member(room_id, auth.uid()));
CREATE POLICY "room_sessions_insert_owner" ON public.room_sessions
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_room_owner(room_id, auth.uid()));
CREATE POLICY "room_sessions_update_owner" ON public.room_sessions
  FOR UPDATE TO authenticated
  USING (public.is_room_owner(room_id, auth.uid()))
  WITH CHECK (public.is_room_owner(room_id, auth.uid()));
CREATE POLICY "room_sessions_delete_owner" ON public.room_sessions
  FOR DELETE TO authenticated USING (public.is_room_owner(room_id, auth.uid()));

CREATE INDEX idx_room_sessions_room_start ON public.room_sessions (room_id, start_at);

CREATE TRIGGER trg_room_sessions_updated_at
  BEFORE UPDATE ON public.room_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.room_session_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.room_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  confirmed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_session_attendees TO authenticated;
GRANT ALL ON public.room_session_attendees TO service_role;

ALTER TABLE public.room_session_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_session_attendees_select_members" ON public.room_session_attendees
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.room_sessions s
    WHERE s.id = session_id AND public.is_room_member(s.room_id, auth.uid())
  ));
CREATE POLICY "room_session_attendees_insert_self" ON public.room_session_attendees
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.room_sessions s
    WHERE s.id = session_id AND public.is_room_member(s.room_id, auth.uid())
  ));
CREATE POLICY "room_session_attendees_update_self" ON public.room_session_attendees
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "room_session_attendees_delete_self" ON public.room_session_attendees
  FOR DELETE TO authenticated USING (user_id = auth.uid());
