
-- 1) task_checklists: authoring columns
ALTER TABLE public.task_checklists
  ADD COLUMN IF NOT EXISTS completed_by uuid,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE OR REPLACE FUNCTION public.tg_task_checklist_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.is_completed IS DISTINCT FROM OLD.is_completed THEN
    IF NEW.is_completed THEN
      NEW.completed_by := auth.uid();
      NEW.completed_at := now();
    ELSE
      NEW.completed_by := NULL;
      NEW.completed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_task_checklist_completion ON public.task_checklists;
CREATE TRIGGER trg_task_checklist_completion
BEFORE UPDATE ON public.task_checklists
FOR EACH ROW EXECUTE FUNCTION public.tg_task_checklist_completion();

-- 2) Normalize board_members.role
UPDATE public.board_members SET role = 'editor' WHERE role = 'member';
ALTER TABLE public.board_members ALTER COLUMN role SET DEFAULT 'editor';
ALTER TABLE public.board_members DROP CONSTRAINT IF EXISTS board_members_role_check;
ALTER TABLE public.board_members
  ADD CONSTRAINT board_members_role_check CHECK (role IN ('owner','editor','viewer'));

-- 3) Helper: can_edit_board (owner or editor member)
CREATE OR REPLACE FUNCTION public.can_edit_board(_board_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.boards WHERE id=_board_id AND user_id=_user_id)
      OR EXISTS (SELECT 1 FROM public.board_members
                 WHERE board_id=_board_id AND user_id=_user_id AND role IN ('owner','editor'));
$$;

CREATE OR REPLACE FUNCTION public.can_edit_task(_task_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = _task_id AND public.can_edit_board(t.board_id, _user_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_edit_board(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_task(uuid,uuid) TO authenticated;

-- 4) accept_board_invitation: default new members to editor
CREATE OR REPLACE FUNCTION public.accept_board_invitation(_invitation_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _u uuid := auth.uid(); _inv record;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _inv FROM public.board_invitations WHERE id = _invitation_id FOR UPDATE;
  IF _inv.id IS NULL THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  IF _inv.invitee_id <> _u THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _inv.status <> 'pending' THEN RAISE EXCEPTION 'Invitation not pending'; END IF;
  INSERT INTO public.board_members (board_id, user_id, added_by, role)
    VALUES (_inv.board_id, _u, _inv.inviter_id, 'editor')
    ON CONFLICT (board_id, user_id) DO NOTHING;
  UPDATE public.board_invitations SET status = 'accepted', updated_at = now() WHERE id = _invitation_id;
  RETURN _inv.board_id;
END; $$;

-- 5) Tighten policies to require can_edit_board / can_edit_task for writes
-- board_columns
DROP POLICY IF EXISTS "Members insert board_columns" ON public.board_columns;
DROP POLICY IF EXISTS "Members update board_columns" ON public.board_columns;
DROP POLICY IF EXISTS "Owner deletes board_columns" ON public.board_columns;

CREATE POLICY "Editors insert board_columns" ON public.board_columns
  FOR INSERT WITH CHECK ((user_id = auth.uid()) AND public.can_edit_board(board_id, auth.uid()));
CREATE POLICY "Editors update board_columns" ON public.board_columns
  FOR UPDATE USING (public.can_edit_board(board_id, auth.uid()));
CREATE POLICY "Editors delete board_columns" ON public.board_columns
  FOR DELETE USING (public.can_edit_board(board_id, auth.uid()) OR user_id = auth.uid());

-- tasks
DROP POLICY IF EXISTS "Members insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Owner or task creator deletes tasks" ON public.tasks;

CREATE POLICY "Editors insert tasks" ON public.tasks
  FOR INSERT WITH CHECK ((user_id = auth.uid()) AND public.can_edit_board(board_id, auth.uid()));
CREATE POLICY "Editors update tasks" ON public.tasks
  FOR UPDATE USING (public.can_edit_board(board_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Editors delete tasks" ON public.tasks
  FOR DELETE USING (public.can_edit_board(board_id, auth.uid()) OR user_id = auth.uid());

-- task_checklists: split ALL policy
DROP POLICY IF EXISTS "Board members manage task_checklists" ON public.task_checklists;

CREATE POLICY "Members view task_checklists" ON public.task_checklists
  FOR SELECT USING (public.can_access_task(task_id, auth.uid()));
CREATE POLICY "Editors insert task_checklists" ON public.task_checklists
  FOR INSERT WITH CHECK (public.can_edit_task(task_id, auth.uid()));
CREATE POLICY "Editors update task_checklists" ON public.task_checklists
  FOR UPDATE USING (public.can_edit_task(task_id, auth.uid()));
CREATE POLICY "Editors delete task_checklists" ON public.task_checklists
  FOR DELETE USING (public.can_edit_task(task_id, auth.uid()));

-- task_labels: split ALL policy
DROP POLICY IF EXISTS "Board members manage task_labels" ON public.task_labels;

CREATE POLICY "Members view task_labels" ON public.task_labels
  FOR SELECT USING (public.can_access_task(task_id, auth.uid()));
CREATE POLICY "Editors insert task_labels" ON public.task_labels
  FOR INSERT WITH CHECK (public.can_edit_task(task_id, auth.uid()));
CREATE POLICY "Editors update task_labels" ON public.task_labels
  FOR UPDATE USING (public.can_edit_task(task_id, auth.uid()));
CREATE POLICY "Editors delete task_labels" ON public.task_labels
  FOR DELETE USING (public.can_edit_task(task_id, auth.uid()));

-- task_comments: editors post; viewers read only
DROP POLICY IF EXISTS "Board members insert task_comments" ON public.task_comments;
CREATE POLICY "Editors insert task_comments" ON public.task_comments
  FOR INSERT WITH CHECK ((user_id = auth.uid()) AND public.can_edit_task(task_id, auth.uid()));

-- task_members: editors assign; users can leave (delete self)
DROP POLICY IF EXISTS "Board members insert task_members" ON public.task_members;
CREATE POLICY "Editors insert task_members" ON public.task_members
  FOR INSERT WITH CHECK (public.can_edit_task(task_id, auth.uid()));
