-- 1. BOARDS
CREATE TABLE public.boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  color text,
  is_favorite boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boards TO authenticated;
GRANT ALL ON public.boards TO service_role;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own boards" ON public.boards
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_boards_updated_at BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_boards_user_id ON public.boards(user_id, position);

-- 2. BOARD_COLUMNS
CREATE TABLE public.board_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  color text,
  position integer NOT NULL DEFAULT 0,
  wip_limit integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_columns TO authenticated;
GRANT ALL ON public.board_columns TO service_role;
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own board_columns" ON public.board_columns
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_board_columns_updated_at BEFORE UPDATE ON public.board_columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_board_columns_board_id ON public.board_columns(board_id, position);

-- 3. TASKS
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  column_id uuid REFERENCES public.board_columns(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'todo',
  due_date timestamptz,
  recurrence_type text,
  recurrence_days integer[],
  estimated_minutes integer,
  total_tracked_seconds integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tasks" ON public.tasks
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_tasks_board_column_position ON public.tasks(board_id, column_id, position);
CREATE INDEX idx_tasks_user_project ON public.tasks(user_id, project_id);
CREATE INDEX idx_tasks_due_date ON public.tasks(user_id, due_date);

-- 4. TASK_LABELS
CREATE TABLE public.task_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_labels TO authenticated;
GRANT ALL ON public.task_labels TO service_role;
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own task_labels" ON public.task_labels
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_task_labels_task_id ON public.task_labels(task_id);

-- 5. TASK_CHECKLISTS
CREATE TABLE public.task_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_checklists TO authenticated;
GRANT ALL ON public.task_checklists TO service_role;
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own task_checklists" ON public.task_checklists
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_task_checklists_updated_at BEFORE UPDATE ON public.task_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_task_checklists_task_id ON public.task_checklists(task_id, position);

-- 6. TASK_COMMENTS
CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own task_comments" ON public.task_comments
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_task_comments_updated_at BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);

-- 7. TASK_ATTACHMENTS
CREATE TABLE public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_type text,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_attachments TO authenticated;
GRANT ALL ON public.task_attachments TO service_role;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own task_attachments" ON public.task_attachments
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_task_attachments_task_id ON public.task_attachments(task_id);

-- 8. TASK_TIME_LOGS
CREATE TABLE public.task_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  seconds integer NOT NULL CHECK (seconds > 0),
  logged_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_time_logs TO authenticated;
GRANT ALL ON public.task_time_logs TO service_role;
ALTER TABLE public.task_time_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own task_time_logs" ON public.task_time_logs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_task_time_logs_task_id ON public.task_time_logs(task_id, logged_at DESC);

-- 9. TIME_ENTRIES: task_id
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON public.time_entries(task_id);

-- 10. Trigger de sincronização
CREATE OR REPLACE FUNCTION public.sync_task_tracked_seconds()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _delta integer := 0;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.task_id IS NOT NULL AND NEW.end_time IS NOT NULL AND NEW.duration IS NOT NULL THEN
    UPDATE public.tasks SET total_tracked_seconds = total_tracked_seconds + NEW.duration WHERE id = NEW.task_id;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.task_id IS NOT NULL AND NEW.duration IS NOT NULL THEN
    IF (OLD.end_time IS NULL AND NEW.end_time IS NOT NULL) THEN
      UPDATE public.tasks SET total_tracked_seconds = total_tracked_seconds + NEW.duration WHERE id = NEW.task_id;
    ELSIF (OLD.end_time IS NOT NULL AND NEW.end_time IS NOT NULL AND COALESCE(OLD.duration,0) <> NEW.duration) THEN
      _delta := NEW.duration - COALESCE(OLD.duration, 0);
      UPDATE public.tasks SET total_tracked_seconds = GREATEST(0, total_tracked_seconds + _delta) WHERE id = NEW.task_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_task_tracked_seconds ON public.time_entries;
CREATE TRIGGER trg_sync_task_tracked_seconds
  AFTER INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.sync_task_tracked_seconds();

-- 11. RPC reorder_task
CREATE OR REPLACE FUNCTION public.reorder_task(
  _task_id uuid, _new_column_id uuid, _new_position integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _user uuid := auth.uid(); _task public.tasks;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _task FROM public.tasks WHERE id = _task_id FOR UPDATE;
  IF _task.id IS NULL OR _task.user_id <> _user THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.tasks
    SET position = position + 1
    WHERE board_id = _task.board_id
      AND column_id IS NOT DISTINCT FROM _new_column_id
      AND position >= _new_position
      AND id <> _task_id;
  UPDATE public.tasks
    SET column_id = _new_column_id, position = _new_position
    WHERE id = _task_id;
END;
$$;

-- 12. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.boards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_columns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_checklists;

-- 13. Storage RLS para task-attachments
CREATE POLICY "Users read own task attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own task attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own task attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own task attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);