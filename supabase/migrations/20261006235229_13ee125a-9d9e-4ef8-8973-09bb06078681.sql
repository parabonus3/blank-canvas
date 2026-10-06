CREATE OR REPLACE FUNCTION public.validate_duel_change()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
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
    IF auth.uid() IS DISTINCT FROM OLD.opponent_id THEN RAISE EXCEPTION 'only_opponent_can_respond'; END IF;
    NEW.winner_id := NULL;
  ELSIF OLD.status = 'pending' AND NEW.status = 'cancelled' THEN
    IF auth.uid() IS DISTINCT FROM OLD.challenger_id THEN RAISE EXCEPTION 'only_challenger_can_cancel'; END IF;
    NEW.winner_id := NULL;
  ELSIF OLD.status = 'active' AND NEW.status = 'finished' THEN
    IF auth.uid() IS NULL THEN
      -- Server-side scheduler (service role) already computed the winner.
      RETURN NEW;
    END IF;
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

CREATE OR REPLACE FUNCTION public.finish_due_duels()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d record; a integer; b integer; n integer := 0;
BEGIN
  FOR d IN
    SELECT du.* FROM public.duels du
    LEFT JOIN public.profiles pc ON pc.user_id = du.challenger_id
    WHERE du.status = 'active'
      AND du.end_date < (now() AT TIME ZONE COALESCE(pc.timezone, 'America/Sao_Paulo'))::date
    LIMIT 500
  LOOP
    SELECT COALESCE(SUM(COALESCE(te.duration,0)),0)::integer INTO a
    FROM public.time_entries te LEFT JOIN public.profiles pr ON pr.user_id = te.user_id
    WHERE te.user_id = d.challenger_id AND te.end_time IS NOT NULL
      AND (te.start_time AT TIME ZONE COALESCE(pr.timezone,'America/Sao_Paulo'))::date BETWEEN d.start_date AND d.end_date;
    SELECT COALESCE(SUM(COALESCE(te.duration,0)),0)::integer INTO b
    FROM public.time_entries te LEFT JOIN public.profiles pr ON pr.user_id = te.user_id
    WHERE te.user_id = d.opponent_id AND te.end_time IS NOT NULL
      AND (te.start_time AT TIME ZONE COALESCE(pr.timezone,'America/Sao_Paulo'))::date BETWEEN d.start_date AND d.end_date;
    UPDATE public.duels SET status='finished',
      winner_id = CASE WHEN a=b THEN NULL WHEN a>b THEN d.challenger_id ELSE d.opponent_id END,
      updated_at = now()
    WHERE id = d.id AND status = 'active';
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.finish_due_duels() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_due_duels() TO service_role;

CREATE OR REPLACE FUNCTION public.tg_notify_duel_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text; v_avatar text; v_title text; v_other_name text; v_other_avatar text; p uuid; o uuid;
BEGIN
  v_title := COALESCE(NULLIF(NEW.title, ''), 'Duelo');
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT display_name, avatar_url INTO v_name, v_avatar FROM public.profiles WHERE user_id = NEW.challenger_id;
    PERFORM public.dispatch_push(NEW.opponent_id, 'duel_invite',
      jsonb_build_object('friend_name', COALESCE(v_name,'—'), 'actor_avatar', COALESCE(v_avatar,''),
        'duel_title', v_title, 'target_hours', round(NEW.target_minutes::numeric/60,1), 'duel_id', NEW.id), '/friends');
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('active','declined') THEN
    SELECT display_name, avatar_url INTO v_name, v_avatar FROM public.profiles WHERE user_id = NEW.opponent_id;
    PERFORM public.dispatch_push(NEW.challenger_id,
      CASE WHEN NEW.status = 'active' THEN 'duel_accepted' ELSE 'duel_declined' END,
      jsonb_build_object('friend_name', COALESCE(v_name,'—'), 'actor_avatar', COALESCE(v_avatar,''),
        'duel_title', v_title, 'duel_id', NEW.id), '/friends');
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'finished' THEN
    FOREACH p IN ARRAY ARRAY[NEW.challenger_id, NEW.opponent_id] LOOP
      o := CASE WHEN p = NEW.challenger_id THEN NEW.opponent_id ELSE NEW.challenger_id END;
      SELECT display_name, avatar_url INTO v_other_name, v_other_avatar FROM public.profiles WHERE user_id = o;
      PERFORM public.dispatch_push(p,
        CASE WHEN NEW.winner_id IS NULL THEN 'duel_tie' WHEN NEW.winner_id = p THEN 'duel_won' ELSE 'duel_lost' END,
        jsonb_build_object('friend_name', COALESCE(v_other_name,'—'), 'actor_avatar', COALESCE(v_other_avatar,''),
          'duel_title', v_title, 'duel_id', NEW.id), '/friends');
    END LOOP;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'tg_notify_duel_event error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.tg_notify_duel_event() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tg_notify_room_session_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room_name text; v_tz text; v_kind text; v_target uuid;
BEGIN
  IF NEW.is_cancelled AND NOT OLD.is_cancelled THEN v_kind := 'room_session_cancelled';
  ELSIF NOT NEW.is_cancelled AND (NEW.start_at IS DISTINCT FROM OLD.start_at OR NEW.end_at IS DISTINCT FROM OLD.end_at OR NEW.title IS DISTINCT FROM OLD.title) THEN v_kind := 'room_session_updated';
  ELSE RETURN NEW; END IF;
  IF NEW.end_at < now() THEN RETURN NEW; END IF;
  SELECT name INTO v_room_name FROM public.study_rooms WHERE id = NEW.room_id;
  SELECT public.get_room_timezone(NEW.room_id) INTO v_tz;
  FOR v_target IN
    SELECT a.user_id FROM public.room_session_attendees a
    WHERE a.session_id = NEW.id AND a.confirmed AND a.user_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    PERFORM public.dispatch_push(v_target, v_kind,
      jsonb_build_object('room_name', COALESCE(v_room_name,'—'), 'session_title', NEW.title,
        'session_time', to_char(NEW.start_at AT TIME ZONE COALESCE(v_tz,'UTC'), 'DD/MM HH24:MI'),
        'session_id', NEW.id, 'rev', extract(epoch from NEW.updated_at)::bigint),
      '/rooms/' || NEW.room_id::text);
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'tg_notify_room_session_changed error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.tg_notify_room_session_changed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_room_session_changed ON public.room_sessions;
CREATE TRIGGER trg_notify_room_session_changed
AFTER UPDATE ON public.room_sessions
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_room_session_changed();