CREATE OR REPLACE FUNCTION public.tg_notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_name text; v_avatar text; v_title text; v_board uuid;
BEGIN
  IF NEW.assigned_by IS NOT NULL AND NEW.assigned_by = NEW.user_id THEN RETURN NEW; END IF;
  SELECT display_name, avatar_url INTO v_name, v_avatar FROM public.profiles WHERE user_id = NEW.assigned_by;
  SELECT title, board_id INTO v_title, v_board FROM public.tasks WHERE id = NEW.task_id;
  PERFORM public.dispatch_push(
    NEW.user_id, 'task_assigned',
    jsonb_build_object('friend_name', COALESCE(v_name, '—'), 'task_title', COALESCE(v_title, '—'),
                       'actor_avatar', v_avatar),
    '/boards/' || COALESCE(v_board::text, ''));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.tg_notify_task_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_name text; v_avatar text; v_title text; v_board uuid; v_target uuid;
BEGIN
  SELECT display_name, avatar_url INTO v_name, v_avatar FROM public.profiles WHERE user_id = NEW.user_id;
  SELECT title, board_id INTO v_title, v_board FROM public.tasks WHERE id = NEW.task_id;
  FOR v_target IN
    SELECT tm.user_id FROM public.task_members tm
    WHERE tm.task_id = NEW.task_id AND tm.user_id <> NEW.user_id
  LOOP
    PERFORM public.dispatch_push(
      v_target, 'task_comment',
      jsonb_build_object('friend_name', COALESCE(v_name, '—'), 'task_title', COALESCE(v_title, '—'),
                         'content', left(NEW.content, 120), 'actor_avatar', v_avatar),
      '/boards/' || COALESCE(v_board::text, ''));
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW; END; $$;