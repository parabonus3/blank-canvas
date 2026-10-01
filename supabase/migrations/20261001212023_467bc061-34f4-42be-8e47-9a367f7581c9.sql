CREATE OR REPLACE FUNCTION public.validate_duel_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE a integer; b integer;
BEGIN
  IF NEW.challenger_id IS DISTINCT FROM OLD.challenger_id
     OR NEW.opponent_id IS DISTINCT FROM OLD.opponent_id
     OR NEW.target_minutes IS DISTINCT FROM OLD.target_minutes
     OR NEW.start_date IS DISTINCT FROM OLD.start_date
     OR NEW.end_date IS DISTINCT FROM OLD.end_date
     OR NEW.title IS DISTINCT FROM OLD.title THEN
    RAISE EXCEPTION 'duel_fields_immutable';
  END IF;
  IF OLD.status = 'pending' AND NEW.status IN ('active','declined') THEN
    IF auth.uid() <> OLD.opponent_id THEN RAISE EXCEPTION 'only_opponent_can_respond'; END IF;
    NEW.winner_id := NULL;
  ELSIF OLD.status = 'pending' AND NEW.status = 'cancelled' THEN
    IF auth.uid() <> OLD.challenger_id THEN RAISE EXCEPTION 'only_challenger_can_cancel'; END IF;
    NEW.winner_id := NULL;
  ELSIF OLD.status = 'active' AND NEW.status = 'finished' THEN
    IF auth.uid() NOT IN (OLD.challenger_id,OLD.opponent_id) OR OLD.end_date >= CURRENT_DATE THEN
      RAISE EXCEPTION 'duel_not_finishable';
    END IF;
    SELECT seconds INTO a FROM public.get_duel_scoreboard(OLD.id) WHERE user_id=OLD.challenger_id;
    SELECT seconds INTO b FROM public.get_duel_scoreboard(OLD.id) WHERE user_id=OLD.opponent_id;
    NEW.winner_id := CASE WHEN COALESCE(a,0)=COALESCE(b,0) THEN NULL WHEN COALESCE(a,0)>COALESCE(b,0) THEN OLD.challenger_id ELSE OLD.opponent_id END;
  ELSIF NEW.status IS DISTINCT FROM OLD.status OR NEW.winner_id IS DISTINCT FROM OLD.winner_id THEN
    RAISE EXCEPTION 'invalid_duel_transition';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_duel_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_duel_change() TO service_role;

DROP TRIGGER IF EXISTS trg_validate_duel_change ON public.duels;
CREATE TRIGGER trg_validate_duel_change BEFORE UPDATE ON public.duels
FOR EACH ROW EXECUTE FUNCTION public.validate_duel_change();

DROP POLICY IF EXISTS "duels_no_direct_update" ON public.duels;
CREATE POLICY "duels_participant_update_guarded" ON public.duels FOR UPDATE TO authenticated
 USING (auth.uid() IN (challenger_id,opponent_id))
 WITH CHECK (auth.uid() IN (challenger_id,opponent_id));

ALTER FUNCTION public.respond_to_duel(uuid, boolean) SECURITY INVOKER;
ALTER FUNCTION public.cancel_duel(uuid) SECURITY INVOKER;
ALTER FUNCTION public.finish_duel(uuid) SECURITY INVOKER;
ALTER FUNCTION public.is_room_manager(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION public.set_room_session_attendance(uuid, boolean) SECURITY INVOKER;