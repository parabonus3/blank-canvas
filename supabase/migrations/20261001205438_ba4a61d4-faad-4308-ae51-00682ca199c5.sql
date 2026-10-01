-- Secure duel state transitions and room-session management.

DROP POLICY IF EXISTS "duels_update_participants" ON public.duels;
DROP POLICY IF EXISTS "duels_delete_challenger" ON public.duels;

CREATE POLICY "duels_no_direct_update" ON public.duels
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "duels_no_direct_delete" ON public.duels
  FOR DELETE TO authenticated USING (false);

CREATE OR REPLACE FUNCTION public.respond_to_duel(_duel_id uuid, _accept boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.duels
  SET status = CASE WHEN _accept THEN 'active' ELSE 'declined' END,
      updated_at = now()
  WHERE id = _duel_id
    AND opponent_id = auth.uid()
    AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'duel_not_available'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.respond_to_duel(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_duel(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_duel(_duel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.duels SET status = 'cancelled', updated_at = now()
  WHERE id = _duel_id AND challenger_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'duel_not_available'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_duel(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_duel(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.finish_duel(_duel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE d public.duels; a integer; b integer;
BEGIN
  SELECT * INTO d FROM public.duels WHERE id = _duel_id FOR UPDATE;
  IF d.id IS NULL OR auth.uid() NOT IN (d.challenger_id, d.opponent_id)
     OR d.status <> 'active' OR d.end_date >= CURRENT_DATE THEN
    RAISE EXCEPTION 'duel_not_finishable';
  END IF;
  SELECT seconds INTO a FROM public.get_duel_scoreboard(d.id) WHERE user_id = d.challenger_id;
  SELECT seconds INTO b FROM public.get_duel_scoreboard(d.id) WHERE user_id = d.opponent_id;
  UPDATE public.duels SET status = 'finished',
    winner_id = CASE WHEN COALESCE(a,0)=COALESCE(b,0) THEN NULL WHEN COALESCE(a,0)>COALESCE(b,0) THEN d.challenger_id ELSE d.opponent_id END,
    updated_at = now() WHERE id = d.id;
END;
$$;
REVOKE ALL ON FUNCTION public.finish_duel(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finish_duel(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_room_manager(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.study_rooms r WHERE r.id=_room_id AND r.owner_id=_user_id)
 OR EXISTS (SELECT 1 FROM public.room_members m WHERE m.room_id=_room_id AND m.user_id=_user_id AND m.role='moderator');
$$;
REVOKE ALL ON FUNCTION public.is_room_manager(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_room_manager(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "room_sessions_insert_owner" ON public.room_sessions;
DROP POLICY IF EXISTS "room_sessions_update_owner" ON public.room_sessions;
DROP POLICY IF EXISTS "room_sessions_delete_owner" ON public.room_sessions;
CREATE POLICY "room_sessions_insert_managers" ON public.room_sessions FOR INSERT TO authenticated
 WITH CHECK (created_by=auth.uid() AND public.is_room_manager(room_id,auth.uid()));
CREATE POLICY "room_sessions_update_managers" ON public.room_sessions FOR UPDATE TO authenticated
 USING (public.is_room_manager(room_id,auth.uid())) WITH CHECK (public.is_room_manager(room_id,auth.uid()));
CREATE POLICY "room_sessions_delete_managers" ON public.room_sessions FOR DELETE TO authenticated
 USING (public.is_room_manager(room_id,auth.uid()));

CREATE OR REPLACE FUNCTION public.set_room_session_attendance(_session_id uuid, _confirmed boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rid uuid;
BEGIN
 SELECT room_id INTO rid FROM public.room_sessions WHERE id=_session_id AND NOT is_cancelled;
 IF rid IS NULL OR NOT public.is_room_member(rid,auth.uid()) THEN RAISE EXCEPTION 'session_not_available'; END IF;
 IF _confirmed THEN
   INSERT INTO public.room_session_attendees(session_id,user_id,confirmed) VALUES(_session_id,auth.uid(),true)
   ON CONFLICT(session_id,user_id) DO UPDATE SET confirmed=true;
 ELSE
   DELETE FROM public.room_session_attendees WHERE session_id=_session_id AND user_id=auth.uid();
 END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_room_session_attendance(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_room_session_attendance(uuid, boolean) TO authenticated;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.room_sessions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.room_session_attendees;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;