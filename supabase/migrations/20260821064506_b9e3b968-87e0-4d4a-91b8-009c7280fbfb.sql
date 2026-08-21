-- =========================================================
-- PARTE 1: SEQUÊNCIA / SEGUNDA CHANCE
-- =========================================================

-- 1.1 Gatilho de proteção do perfil: permitir escrita nos campos de streak
--     quando vier de dentro das funções oficiais (marcador de sessão).
CREATE OR REPLACE FUNCTION public.enforce_profile_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _streak_write boolean := COALESCE(current_setting('app.streak_write', true), 'off') = 'on';
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.plan_tier             IS DISTINCT FROM OLD.plan_tier             OR
     NEW.is_banned             IS DISTINCT FROM OLD.is_banned             OR
     NEW.banned_at             IS DISTINCT FROM OLD.banned_at             OR
     NEW.banned_reason         IS DISTINCT FROM OLD.banned_reason         OR
     NEW.user_id               IS DISTINCT FROM OLD.user_id               OR
     NEW.friend_code           IS DISTINCT FROM OLD.friend_code           OR
     NEW.trial_ends_at         IS DISTINCT FROM OLD.trial_ends_at
  THEN
    RAISE EXCEPTION 'Only administrators can modify this field';
  END IF;

  IF NOT _streak_write AND (
       NEW.last_known_streak     IS DISTINCT FROM OLD.last_known_streak OR
       NEW.last_streak_rescue_at IS DISTINCT FROM OLD.last_streak_rescue_at
     )
  THEN
    RAISE EXCEPTION 'Only administrators can modify this field';
  END IF;

  RETURN NEW;
END;
$$;

-- 1.2 Maior sequência já alcançada (atividade + defensivas aplicadas)
CREATE OR REPLACE FUNCTION public.get_best_ever_streak(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_days AS (
    SELECT DISTINCT te.start_time::date AS d
    FROM public.time_entries te
    WHERE te.user_id = _user_id AND te.end_time IS NOT NULL
    UNION
    SELECT DISTINCT unnest(COALESCE(sf.auto_used_dates, ARRAY[]::date[])) AS d
    FROM public.streak_freezes sf
    WHERE sf.user_id = _user_id
  ),
  grouped AS (
    SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d))::integer AS grp
    FROM active_days
  )
  SELECT COALESCE(MAX(cnt), 0)::integer FROM (
    SELECT COUNT(*) AS cnt FROM grouped GROUP BY grp
  ) s;
$$;

-- 1.3 Snapshot do recorde (chamado ao encerrar sessão)
CREATE OR REPLACE FUNCTION public.refresh_last_known_streak()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _current_streak integer;
  _best integer;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  _current_streak := public.get_member_room_streak(_user_id);
  _best := GREATEST(public.get_best_ever_streak(_user_id), _current_streak);

  PERFORM set_config('app.streak_write', 'on', true);
  UPDATE public.profiles
  SET last_known_streak = GREATEST(COALESCE(last_known_streak, 0), _best)
  WHERE user_id = _user_id;
  PERFORM set_config('app.streak_write', 'off', true);

  RETURN _current_streak;
END;
$$;

-- 1.4 Resgate: mesmas regras de justiça, agora conseguindo gravar
CREATE OR REPLACE FUNCTION public.check_and_grant_streak_rescue()
RETURNS TABLE(granted boolean, days_rescued integer, new_streak integer, last_streak integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _current_streak integer;
  _last_known integer;
  _last_rescue timestamptz;
  _days_absent integer := 0;
  _max_cover integer := 0;
  _check_date date;
  _has_activity boolean;
  _has_freeze boolean;
  _i integer;
  _month_year text;
  _freeze_id uuid;
  _existing_dates date[];
  _new_dates date[];
  _granted_count integer := 0;
  _final_streak integer;
BEGIN
  granted := false;
  days_rescued := 0;
  new_streak := 0;
  last_streak := 0;

  IF _user_id IS NULL THEN RETURN NEXT; RETURN; END IF;

  SELECT GREATEST(COALESCE(last_known_streak, 0), public.get_best_ever_streak(_user_id)), last_streak_rescue_at
  INTO _last_known, _last_rescue
  FROM public.profiles WHERE user_id = _user_id;

  last_streak := _last_known;
  _current_streak := public.get_member_room_streak(_user_id);
  new_streak := _current_streak;

  IF _current_streak > 0 THEN RETURN NEXT; RETURN; END IF;
  IF _last_known < 15 THEN RETURN NEXT; RETURN; END IF;
  IF _last_rescue IS NOT NULL AND _last_rescue > (now() - INTERVAL '30 days') THEN
    RETURN NEXT; RETURN;
  END IF;

  _check_date := CURRENT_DATE - 1;
  WHILE _days_absent < 10 LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.time_entries te
      WHERE te.user_id = _user_id AND te.end_time IS NOT NULL
        AND te.start_time::date = _check_date
    ) INTO _has_activity;
    SELECT EXISTS(
      SELECT 1 FROM public.streak_freezes sf
      WHERE sf.user_id = _user_id AND _check_date = ANY(sf.auto_used_dates)
    ) INTO _has_freeze;
    EXIT WHEN _has_activity OR _has_freeze;
    _days_absent := _days_absent + 1;
    _check_date := _check_date - 1;
  END LOOP;

  IF _days_absent < 1 OR _days_absent > 7 THEN RETURN NEXT; RETURN; END IF;

  IF _last_known >= 100 THEN _max_cover := 7;
  ELSIF _last_known >= 60 THEN _max_cover := 5;
  ELSIF _last_known >= 30 THEN _max_cover := 3;
  ELSE _max_cover := 2;
  END IF;

  _granted_count := LEAST(_days_absent, _max_cover);

  _new_dates := ARRAY[]::date[];
  FOR _i IN 1.._granted_count LOOP
    _new_dates := array_append(_new_dates, (CURRENT_DATE - _i)::date);
  END LOOP;

  _month_year := to_char(CURRENT_DATE, 'YYYY-MM');

  SELECT id, COALESCE(auto_used_dates, ARRAY[]::date[])
  INTO _freeze_id, _existing_dates
  FROM public.streak_freezes
  WHERE user_id = _user_id AND month_year = _month_year;

  IF _freeze_id IS NULL THEN
    INSERT INTO public.streak_freezes (user_id, month_year, total_granted, used, auto_used_dates)
    VALUES (_user_id, _month_year, _granted_count, _granted_count, _new_dates);
  ELSE
    UPDATE public.streak_freezes
    SET auto_used_dates = ARRAY(SELECT DISTINCT unnest(_existing_dates || _new_dates)),
        used = used + _granted_count,
        total_granted = total_granted + _granted_count
    WHERE id = _freeze_id;
  END IF;

  PERFORM set_config('app.streak_write', 'on', true);
  UPDATE public.profiles
  SET last_streak_rescue_at = now()
  WHERE user_id = _user_id;

  _final_streak := public.get_member_room_streak(_user_id);

  UPDATE public.profiles
  SET last_known_streak = GREATEST(COALESCE(last_known_streak, 0), _final_streak, _last_known)
  WHERE user_id = _user_id;
  PERFORM set_config('app.streak_write', 'off', true);

  granted := true;
  days_rescued := _granted_count;
  new_streak := _final_streak;
  RETURN NEXT;
END;
$$;

-- 1.5 Defensivas mensais = limite do plano + bônus por recorde
CREATE OR REPLACE FUNCTION public.get_monthly_freeze_allowance(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier text;
  _trial timestamptz;
  _best integer;
  _base integer;
  _bonus integer := 0;
BEGIN
  SELECT plan_tier, trial_ends_at, GREATEST(COALESCE(last_known_streak,0), public.get_best_ever_streak(_user_id))
  INTO _tier, _trial, _best
  FROM public.profiles WHERE user_id = _user_id;

  IF _tier IS NULL THEN RETURN 0; END IF;
  IF _trial IS NOT NULL AND _trial > now() THEN _tier := 'premium'; END IF;

  _base := CASE _tier WHEN 'premium' THEN 6 WHEN 'pro' THEN 3 ELSE 0 END;

  IF _base > 0 THEN
    IF _best >= 100 THEN _bonus := 3;
    ELSIF _best >= 60 THEN _bonus := 2;
    ELSIF _best >= 30 THEN _bonus := 1;
    END IF;
  END IF;

  RETURN _base + _bonus;
END;
$$;

-- 1.6 Status do escudo para a interface
CREATE OR REPLACE FUNCTION public.get_streak_shield_status()
RETURNS TABLE(
  current_streak integer,
  best_streak integer,
  monthly_allowance integer,
  monthly_used integer,
  monthly_remaining integer,
  purchased_balance integer,
  rescue_available boolean,
  rescue_days_cover integer,
  rescue_days_absent integer,
  rescue_next_available_in integer,
  last_rescue_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _last_rescue timestamptz;
  _days_absent integer := 0;
  _check_date date;
  _has_activity boolean;
  _has_freeze boolean;
  _granted integer := 0;
  _used integer := 0;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;

  current_streak := public.get_member_room_streak(_user_id);

  SELECT GREATEST(COALESCE(last_known_streak,0), public.get_best_ever_streak(_user_id), current_streak),
         last_streak_rescue_at
  INTO best_streak, _last_rescue
  FROM public.profiles WHERE user_id = _user_id;

  monthly_allowance := public.get_monthly_freeze_allowance(_user_id);

  SELECT COALESCE(sf.total_granted,0), COALESCE(sf.used,0) INTO _granted, _used
  FROM public.streak_freezes sf
  WHERE sf.user_id = _user_id AND sf.month_year = to_char(CURRENT_DATE, 'YYYY-MM');

  monthly_used := COALESCE(_used, 0);
  monthly_remaining := GREATEST(0, GREATEST(monthly_allowance, COALESCE(_granted,0)) - monthly_used);

  SELECT COALESCE(balance,0) INTO purchased_balance
  FROM public.purchased_streak_freezes WHERE user_id = _user_id;
  purchased_balance := COALESCE(purchased_balance, 0);

  last_rescue_at := _last_rescue;
  rescue_next_available_in := CASE
    WHEN _last_rescue IS NULL THEN 0
    ELSE GREATEST(0, 30 - EXTRACT(DAY FROM (now() - _last_rescue))::integer)
  END;

  _check_date := CURRENT_DATE - 1;
  WHILE _days_absent < 10 LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.time_entries te
      WHERE te.user_id = _user_id AND te.end_time IS NOT NULL
        AND te.start_time::date = _check_date
    ) INTO _has_activity;
    SELECT EXISTS(
      SELECT 1 FROM public.streak_freezes sf
      WHERE sf.user_id = _user_id AND _check_date = ANY(sf.auto_used_dates)
    ) INTO _has_freeze;
    EXIT WHEN _has_activity OR _has_freeze;
    _days_absent := _days_absent + 1;
    _check_date := _check_date - 1;
  END LOOP;

  rescue_days_absent := _days_absent;
  rescue_days_cover := LEAST(_days_absent, CASE
    WHEN best_streak >= 100 THEN 7
    WHEN best_streak >= 60 THEN 5
    WHEN best_streak >= 30 THEN 3
    ELSE 2 END);

  rescue_available := current_streak = 0
    AND best_streak >= 15
    AND _days_absent BETWEEN 1 AND 7
    AND rescue_next_available_in = 0;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_best_ever_streak(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_monthly_freeze_allowance(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_streak_shield_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_best_ever_streak(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_freeze_allowance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_streak_shield_status() TO authenticated;

-- =========================================================
-- PARTE 2: AUDITORIA DE TAREFAS (task_activity)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.task_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.task_activity TO authenticated;
GRANT ALL ON public.task_activity TO service_role;

ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Board members can read task activity" ON public.task_activity;
CREATE POLICY "Board members can read task activity"
ON public.task_activity FOR SELECT TO authenticated
USING (public.is_board_member(board_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_task_activity_task ON public.task_activity(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_activity_board ON public.task_activity(board_id, created_at DESC);

-- Registrador
CREATE OR REPLACE FUNCTION public.log_task_activity(_board_id uuid, _task_id uuid, _action text, _meta jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.task_activity (board_id, task_id, user_id, action, meta)
  VALUES (_board_id, _task_id, auth.uid(), _action, COALESCE(_meta, '{}'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.log_task_activity(uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Triggers em tasks
CREATE OR REPLACE FUNCTION public.tg_task_activity_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_col text;
  _new_col text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_task_activity(NEW.board_id, NEW.id, 'task_created', jsonb_build_object('title', NEW.title));
    RETURN NEW;
  END IF;

  IF NEW.column_id IS DISTINCT FROM OLD.column_id THEN
    SELECT title INTO _old_col FROM public.board_columns WHERE id = OLD.column_id;
    SELECT title INTO _new_col FROM public.board_columns WHERE id = NEW.column_id;
    PERFORM public.log_task_activity(NEW.board_id, NEW.id, 'task_moved',
      jsonb_build_object('from', _old_col, 'to', _new_col));
  END IF;

  IF NEW.is_completed IS DISTINCT FROM OLD.is_completed THEN
    PERFORM public.log_task_activity(NEW.board_id, NEW.id,
      CASE WHEN NEW.is_completed THEN 'task_completed' ELSE 'task_reopened' END, '{}'::jsonb);
  END IF;

  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    PERFORM public.log_task_activity(NEW.board_id, NEW.id, 'task_due_changed',
      jsonb_build_object('due_date', NEW.due_date));
  END IF;

  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    PERFORM public.log_task_activity(NEW.board_id, NEW.id, 'task_priority_changed',
      jsonb_build_object('priority', NEW.priority));
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title THEN
    PERFORM public.log_task_activity(NEW.board_id, NEW.id, 'task_renamed',
      jsonb_build_object('from', OLD.title, 'to', NEW.title));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_task_activity_tasks_ins ON public.tasks;
CREATE TRIGGER tg_task_activity_tasks_ins
AFTER INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.tg_task_activity_tasks();

DROP TRIGGER IF EXISTS tg_task_activity_tasks_upd ON public.tasks;
CREATE TRIGGER tg_task_activity_tasks_upd
AFTER UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.tg_task_activity_tasks();

-- Membros da tarefa
CREATE OR REPLACE FUNCTION public.tg_task_activity_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _board_id uuid;
  _rec record;
BEGIN
  _rec := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  SELECT board_id INTO _board_id FROM public.tasks WHERE id = _rec.task_id;
  IF _board_id IS NULL THEN RETURN _rec; END IF;

  PERFORM public.log_task_activity(_board_id, _rec.task_id,
    CASE WHEN TG_OP = 'DELETE' THEN 'member_removed' ELSE 'member_assigned' END,
    jsonb_build_object('target_user_id', _rec.user_id));
  RETURN _rec;
END;
$$;

DROP TRIGGER IF EXISTS tg_task_activity_members_ins ON public.task_members;
CREATE TRIGGER tg_task_activity_members_ins
AFTER INSERT ON public.task_members
FOR EACH ROW EXECUTE FUNCTION public.tg_task_activity_members();

DROP TRIGGER IF EXISTS tg_task_activity_members_del ON public.task_members;
CREATE TRIGGER tg_task_activity_members_del
AFTER DELETE ON public.task_members
FOR EACH ROW EXECUTE FUNCTION public.tg_task_activity_members();

-- Checklists
CREATE OR REPLACE FUNCTION public.tg_task_activity_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _board_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.is_completed IS NOT DISTINCT FROM OLD.is_completed THEN
    RETURN NEW;
  END IF;

  SELECT board_id INTO _board_id FROM public.tasks WHERE id = NEW.task_id;
  IF _board_id IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_task_activity(_board_id, NEW.task_id, 'checklist_added',
      jsonb_build_object('title', NEW.title));
  ELSE
    PERFORM public.log_task_activity(_board_id, NEW.task_id,
      CASE WHEN NEW.is_completed THEN 'checklist_checked' ELSE 'checklist_unchecked' END,
      jsonb_build_object('title', NEW.title));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_task_activity_checklist_ins ON public.task_checklists;
CREATE TRIGGER tg_task_activity_checklist_ins
AFTER INSERT ON public.task_checklists
FOR EACH ROW EXECUTE FUNCTION public.tg_task_activity_checklist();

DROP TRIGGER IF EXISTS tg_task_activity_checklist_upd ON public.task_checklists;
CREATE TRIGGER tg_task_activity_checklist_upd
AFTER UPDATE ON public.task_checklists
FOR EACH ROW EXECUTE FUNCTION public.tg_task_activity_checklist();

-- Comentários, anexos e apontamento de tempo
CREATE OR REPLACE FUNCTION public.tg_task_activity_simple()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _board_id uuid;
  _action text;
  _meta jsonb := '{}'::jsonb;
BEGIN
  SELECT board_id INTO _board_id FROM public.tasks WHERE id = NEW.task_id;
  IF _board_id IS NULL THEN RETURN NEW; END IF;

  IF TG_TABLE_NAME = 'task_comments' THEN
    _action := 'comment_added';
    _meta := jsonb_build_object('excerpt', left(NEW.content, 120));
  ELSIF TG_TABLE_NAME = 'task_attachments' THEN
    _action := 'attachment_added';
    _meta := jsonb_build_object('file_name', NEW.file_name);
  ELSE
    _action := 'time_logged';
    _meta := jsonb_build_object('seconds', NEW.seconds, 'note', NEW.note);
  END IF;

  PERFORM public.log_task_activity(_board_id, NEW.task_id, _action, _meta);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_task_activity_comments ON public.task_comments;
CREATE TRIGGER tg_task_activity_comments
AFTER INSERT ON public.task_comments
FOR EACH ROW EXECUTE FUNCTION public.tg_task_activity_simple();

DROP TRIGGER IF EXISTS tg_task_activity_attachments ON public.task_attachments;
CREATE TRIGGER tg_task_activity_attachments
AFTER INSERT ON public.task_attachments
FOR EACH ROW EXECUTE FUNCTION public.tg_task_activity_simple();

DROP TRIGGER IF EXISTS tg_task_activity_time_logs ON public.task_time_logs;
CREATE TRIGGER tg_task_activity_time_logs
AFTER INSERT ON public.task_time_logs
FOR EACH ROW EXECUTE FUNCTION public.tg_task_activity_simple();

-- Leitura com perfis (apenas campos públicos)
CREATE OR REPLACE FUNCTION public.get_task_activity(_task_id uuid, _limit integer DEFAULT 100)
RETURNS TABLE(
  id uuid, task_id uuid, user_id uuid, action text, meta jsonb, created_at timestamptz,
  display_name text, avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ta.id, ta.task_id, ta.user_id, ta.action, ta.meta, ta.created_at,
         p.display_name, p.avatar_url
  FROM public.task_activity ta
  LEFT JOIN public.profiles p ON p.user_id = ta.user_id
  WHERE ta.task_id = _task_id
    AND public.can_access_task(_task_id, auth.uid())
  ORDER BY ta.created_at DESC
  LIMIT COALESCE(_limit, 100);
$$;

CREATE OR REPLACE FUNCTION public.get_board_activity(_board_id uuid, _limit integer DEFAULT 100)
RETURNS TABLE(
  id uuid, task_id uuid, task_title text, user_id uuid, action text, meta jsonb, created_at timestamptz,
  display_name text, avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ta.id, ta.task_id, t.title, ta.user_id, ta.action, ta.meta, ta.created_at,
         p.display_name, p.avatar_url
  FROM public.task_activity ta
  LEFT JOIN public.tasks t ON t.id = ta.task_id
  LEFT JOIN public.profiles p ON p.user_id = ta.user_id
  WHERE ta.board_id = _board_id
    AND public.is_board_member(_board_id, auth.uid())
  ORDER BY ta.created_at DESC
  LIMIT COALESCE(_limit, 100);
$$;

REVOKE ALL ON FUNCTION public.get_task_activity(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_board_activity(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_task_activity(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_board_activity(uuid, integer) TO authenticated;