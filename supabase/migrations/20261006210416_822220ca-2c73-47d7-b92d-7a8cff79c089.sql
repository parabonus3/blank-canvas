CREATE OR REPLACE FUNCTION public.tg_notify_room_session_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_name text;
  v_room_timezone text;
  v_creator_name text;
  v_creator_avatar text;
  v_target uuid;
BEGIN
  IF NEW.is_cancelled THEN RETURN NEW; END IF;

  SELECT name INTO v_room_name FROM public.study_rooms WHERE id = NEW.room_id;
  SELECT public.get_room_timezone(NEW.room_id) INTO v_room_timezone;
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
        'session_time', to_char(NEW.start_at AT TIME ZONE COALESCE(v_room_timezone, 'UTC'), 'DD/MM HH24:MI'),
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