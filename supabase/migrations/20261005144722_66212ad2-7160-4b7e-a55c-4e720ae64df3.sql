CREATE OR REPLACE FUNCTION public.tg_notify_duel_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_avatar text;
  v_title text;
BEGIN
  v_title := COALESCE(NULLIF(NEW.title, ''), 'Desafio de foco');

  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT display_name, avatar_url INTO v_name, v_avatar
    FROM public.profiles WHERE user_id = NEW.challenger_id;

    PERFORM public.dispatch_push(
      NEW.opponent_id,
      'duel_invite',
      jsonb_build_object(
        'friend_name', COALESCE(v_name, '—'),
        'actor_avatar', COALESCE(v_avatar, ''),
        'duel_title', v_title,
        'target_hours', round(NEW.target_minutes::numeric / 60, 1),
        'duel_id', NEW.id
      ),
      '/friends'
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status = 'pending' THEN
    SELECT display_name, avatar_url INTO v_name, v_avatar
    FROM public.profiles WHERE user_id = NEW.opponent_id;

    PERFORM public.dispatch_push(
      NEW.challenger_id,
      'duel_accepted',
      jsonb_build_object(
        'friend_name', COALESCE(v_name, '—'),
        'actor_avatar', COALESCE(v_avatar, ''),
        'duel_title', v_title,
        'duel_id', NEW.id
      ),
      '/friends'
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'tg_notify_duel_event error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_notify_duel_event() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_notify_duel_event() TO service_role;

DROP TRIGGER IF EXISTS trg_notify_duel_event ON public.duels;
CREATE TRIGGER trg_notify_duel_event
AFTER INSERT OR UPDATE OF status ON public.duels
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_duel_event();

CREATE OR REPLACE FUNCTION public.tg_notify_room_session_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_name text;
  v_creator_name text;
  v_creator_avatar text;
  v_target uuid;
BEGIN
  IF NEW.is_cancelled THEN RETURN NEW; END IF;

  SELECT name INTO v_room_name FROM public.study_rooms WHERE id = NEW.room_id;
  SELECT display_name, avatar_url INTO v_creator_name, v_creator_avatar
  FROM public.profiles WHERE user_id = NEW.created_by;

  FOR v_target IN
    SELECT rm.user_id
    FROM public.room_members rm
    WHERE rm.room_id = NEW.room_id
      AND rm.user_id <> NEW.created_by
  LOOP
    PERFORM public.dispatch_push(
      v_target,
      'room_session_created',
      jsonb_build_object(
        'friend_name', COALESCE(v_creator_name, '—'),
        'actor_avatar', COALESCE(v_creator_avatar, ''),
        'room_name', COALESCE(v_room_name, '—'),
        'session_title', NEW.title,
        'session_time', to_char(NEW.start_at AT TIME ZONE 'UTC', 'DD/MM HH24:MI') || ' UTC',
        'session_id', NEW.id
      ),
      '/rooms/' || NEW.room_id::text
    );
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'tg_notify_room_session_created error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_notify_room_session_created() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_notify_room_session_created() TO service_role;

DROP TRIGGER IF EXISTS trg_notify_room_session_created ON public.room_sessions;
CREATE TRIGGER trg_notify_room_session_created
AFTER INSERT ON public.room_sessions
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_room_session_created();