-- 1. Preferences columns
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS social_invites boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS task_updates boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS morning_kickoff boolean NOT NULL DEFAULT true;

-- 2. Shared dispatcher helper
CREATE OR REPLACE FUNCTION public.dispatch_push(_user_id uuid, _kind text, _vars jsonb, _url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text := 'https://iukwvfyhforubyqgguwl.supabase.co/functions/v1/send-push';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a3d2ZnloZm9ydWJ5cWdndXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5ODIwMzksImV4cCI6MjA5MjU1ODAzOX0.XWjJBXc3xyp-hDHh2y8hN39loZh7vj-IuRB5bLJjV5U';
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_anon_key,
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object(
      'user_id', _user_id,
      'kind', _kind,
      'vars', _vars,
      'url', _url
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'dispatch_push error: % %', SQLERRM, SQLSTATE;
END; $$;

REVOKE EXECUTE ON FUNCTION public.dispatch_push(uuid, text, jsonb, text) FROM anon, authenticated;

-- 3. Friendships
CREATE OR REPLACE FUNCTION public.tg_notify_friend_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_name text;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  SELECT display_name INTO v_name FROM public.profiles WHERE user_id = NEW.requester_id;
  PERFORM public.dispatch_push(
    NEW.addressee_id, 'friend_request',
    jsonb_build_object('friend_name', COALESCE(v_name, '—')), '/friends');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_notify_friend_request ON public.friendships;
CREATE TRIGGER trg_notify_friend_request AFTER INSERT ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_friend_request();

CREATE OR REPLACE FUNCTION public.tg_notify_friend_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_name text;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    SELECT display_name INTO v_name FROM public.profiles WHERE user_id = NEW.addressee_id;
    PERFORM public.dispatch_push(
      NEW.requester_id, 'friend_accepted',
      jsonb_build_object('friend_name', COALESCE(v_name, '—')), '/friends');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_notify_friend_accepted ON public.friendships;
CREATE TRIGGER trg_notify_friend_accepted AFTER UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_friend_accepted();

-- 4. Board invitations
CREATE OR REPLACE FUNCTION public.tg_notify_board_invite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_name text; v_title text;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  SELECT display_name INTO v_name FROM public.profiles WHERE user_id = NEW.inviter_id;
  SELECT title INTO v_title FROM public.boards WHERE id = NEW.board_id;
  PERFORM public.dispatch_push(
    NEW.invitee_id, 'board_invite',
    jsonb_build_object('friend_name', COALESCE(v_name, '—'), 'board_title', COALESCE(v_title, '—')),
    '/tasks');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_notify_board_invite ON public.board_invitations;
CREATE TRIGGER trg_notify_board_invite AFTER INSERT ON public.board_invitations
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_board_invite();

-- 5. Task assignment
CREATE OR REPLACE FUNCTION public.tg_notify_task_assigned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_name text; v_title text; v_board uuid;
BEGIN
  IF NEW.assigned_by IS NOT NULL AND NEW.assigned_by = NEW.user_id THEN RETURN NEW; END IF;
  SELECT display_name INTO v_name FROM public.profiles WHERE user_id = NEW.assigned_by;
  SELECT title, board_id INTO v_title, v_board FROM public.tasks WHERE id = NEW.task_id;
  PERFORM public.dispatch_push(
    NEW.user_id, 'task_assigned',
    jsonb_build_object('friend_name', COALESCE(v_name, '—'), 'task_title', COALESCE(v_title, '—')),
    '/boards/' || COALESCE(v_board::text, ''));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_notify_task_assigned ON public.task_members;
CREATE TRIGGER trg_notify_task_assigned AFTER INSERT ON public.task_members
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_task_assigned();

-- 6. Task comments
CREATE OR REPLACE FUNCTION public.tg_notify_task_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_name text; v_title text; v_board uuid; v_target uuid;
BEGIN
  SELECT display_name INTO v_name FROM public.profiles WHERE user_id = NEW.user_id;
  SELECT title, board_id INTO v_title, v_board FROM public.tasks WHERE id = NEW.task_id;
  FOR v_target IN
    SELECT tm.user_id FROM public.task_members tm
    WHERE tm.task_id = NEW.task_id AND tm.user_id <> NEW.user_id
  LOOP
    PERFORM public.dispatch_push(
      v_target, 'task_comment',
      jsonb_build_object('friend_name', COALESCE(v_name, '—'), 'task_title', COALESCE(v_title, '—'),
                         'content', left(NEW.content, 120)),
      '/boards/' || COALESCE(v_board::text, ''));
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_notify_task_comment ON public.task_comments;
CREATE TRIGGER trg_notify_task_comment AFTER INSERT ON public.task_comments
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_task_comment();