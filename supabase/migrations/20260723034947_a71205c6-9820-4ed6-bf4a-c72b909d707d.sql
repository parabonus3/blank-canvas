-- 1. BOARD_MEMBERS
CREATE TABLE public.board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  added_by uuid,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (board_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_members TO authenticated;
GRANT ALL ON public.board_members TO service_role;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_board_members_board_id ON public.board_members(board_id);
CREATE INDEX idx_board_members_user_id ON public.board_members(user_id);

-- 2. BOARD_INVITATIONS
CREATE TABLE public.board_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL,
  invitee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (board_id, invitee_id, status)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_invitations TO authenticated;
GRANT ALL ON public.board_invitations TO service_role;
ALTER TABLE public.board_invitations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_board_invitations_updated_at BEFORE UPDATE ON public.board_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_board_invitations_invitee ON public.board_invitations(invitee_id, status);
CREATE INDEX idx_board_invitations_board ON public.board_invitations(board_id);

-- 3. TASK_MEMBERS
CREATE TABLE public.task_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_members TO authenticated;
GRANT ALL ON public.task_members TO service_role;
ALTER TABLE public.task_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_task_members_task_id ON public.task_members(task_id);
CREATE INDEX idx_task_members_user_id ON public.task_members(user_id);

-- 4. Helper functions (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_board_member(_board_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.boards WHERE id = _board_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.board_members WHERE board_id = _board_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_board_owner(_board_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.boards WHERE id = _board_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_access_task(_task_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = _task_id
      AND (t.user_id = _user_id OR public.is_board_member(t.board_id, _user_id))
  );
$$;

-- 5. RLS for board_members
CREATE POLICY "Members can view board_members" ON public.board_members
  FOR SELECT TO authenticated
  USING (public.is_board_member(board_id, auth.uid()));
CREATE POLICY "Owner manages board_members" ON public.board_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_board_owner(board_id, auth.uid()));
CREATE POLICY "Owner deletes board_members" ON public.board_members
  FOR DELETE TO authenticated
  USING (public.is_board_owner(board_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Owner updates board_members" ON public.board_members
  FOR UPDATE TO authenticated
  USING (public.is_board_owner(board_id, auth.uid()));

-- 6. RLS for board_invitations
CREATE POLICY "Invitee and inviter view invitations" ON public.board_invitations
  FOR SELECT TO authenticated
  USING (invitee_id = auth.uid() OR inviter_id = auth.uid() OR public.is_board_owner(board_id, auth.uid()));
CREATE POLICY "Owner creates invitations" ON public.board_invitations
  FOR INSERT TO authenticated
  WITH CHECK (inviter_id = auth.uid() AND public.is_board_owner(board_id, auth.uid()));
CREATE POLICY "Invitee updates invitation" ON public.board_invitations
  FOR UPDATE TO authenticated
  USING (invitee_id = auth.uid() OR public.is_board_owner(board_id, auth.uid()));
CREATE POLICY "Invitee deletes invitation" ON public.board_invitations
  FOR DELETE TO authenticated
  USING (invitee_id = auth.uid() OR inviter_id = auth.uid() OR public.is_board_owner(board_id, auth.uid()));

-- 7. Expand tasks RLS: members can view/update
DROP POLICY IF EXISTS "Users manage own tasks" ON public.tasks;
CREATE POLICY "Members view tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_board_member(board_id, auth.uid()));
CREATE POLICY "Members insert tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.is_board_member(board_id, auth.uid())));
CREATE POLICY "Members update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_board_member(board_id, auth.uid()));
CREATE POLICY "Owner or task creator deletes tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_board_owner(board_id, auth.uid()));

-- 8. Expand boards RLS: members can view
DROP POLICY IF EXISTS "Users manage own boards" ON public.boards;
CREATE POLICY "Members view boards" ON public.boards
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_board_member(id, auth.uid()));
CREATE POLICY "Owner inserts boards" ON public.boards
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner updates boards" ON public.boards
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Owner deletes boards" ON public.boards
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 9. Expand board_columns RLS: members can view/manage
DROP POLICY IF EXISTS "Users manage own board_columns" ON public.board_columns;
CREATE POLICY "Members view board_columns" ON public.board_columns
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_board_member(board_id, auth.uid()));
CREATE POLICY "Members insert board_columns" ON public.board_columns
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_board_member(board_id, auth.uid()));
CREATE POLICY "Members update board_columns" ON public.board_columns
  FOR UPDATE TO authenticated
  USING (public.is_board_member(board_id, auth.uid()));
CREATE POLICY "Owner deletes board_columns" ON public.board_columns
  FOR DELETE TO authenticated
  USING (public.is_board_owner(board_id, auth.uid()) OR user_id = auth.uid());

-- 10. RLS for task_members
CREATE POLICY "Board members view task_members" ON public.task_members
  FOR SELECT TO authenticated
  USING (public.can_access_task(task_id, auth.uid()));
CREATE POLICY "Board members insert task_members" ON public.task_members
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_task(task_id, auth.uid()));
CREATE POLICY "Board members delete task_members" ON public.task_members
  FOR DELETE TO authenticated
  USING (public.can_access_task(task_id, auth.uid()) OR user_id = auth.uid());

-- 11. Expand related task tables (checklists, comments, labels, time_logs, attachments)
DROP POLICY IF EXISTS "Users manage own task_checklists" ON public.task_checklists;
CREATE POLICY "Board members manage task_checklists" ON public.task_checklists
  FOR ALL TO authenticated
  USING (public.can_access_task(task_id, auth.uid()))
  WITH CHECK (public.can_access_task(task_id, auth.uid()));

DROP POLICY IF EXISTS "Users manage own task_comments" ON public.task_comments;
CREATE POLICY "Board members view task_comments" ON public.task_comments
  FOR SELECT TO authenticated USING (public.can_access_task(task_id, auth.uid()));
CREATE POLICY "Board members insert task_comments" ON public.task_comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.can_access_task(task_id, auth.uid()));
CREATE POLICY "Author updates own task_comments" ON public.task_comments
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Author deletes own task_comments" ON public.task_comments
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own task_labels" ON public.task_labels;
CREATE POLICY "Board members manage task_labels" ON public.task_labels
  FOR ALL TO authenticated
  USING (public.can_access_task(task_id, auth.uid()))
  WITH CHECK (public.can_access_task(task_id, auth.uid()));

DROP POLICY IF EXISTS "Users manage own task_time_logs" ON public.task_time_logs;
CREATE POLICY "Board members view task_time_logs" ON public.task_time_logs
  FOR SELECT TO authenticated USING (public.can_access_task(task_id, auth.uid()));
CREATE POLICY "Owner manages own task_time_logs" ON public.task_time_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.can_access_task(task_id, auth.uid()));
CREATE POLICY "Owner updates own task_time_logs" ON public.task_time_logs
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owner deletes own task_time_logs" ON public.task_time_logs
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 12. Accept invite RPC — atomic: creates board_members row and updates invitation
CREATE OR REPLACE FUNCTION public.accept_board_invitation(_invitation_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _u uuid := auth.uid(); _inv record;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _inv FROM public.board_invitations WHERE id = _invitation_id FOR UPDATE;
  IF _inv.id IS NULL THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  IF _inv.invitee_id <> _u THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _inv.status <> 'pending' THEN RAISE EXCEPTION 'Invitation not pending'; END IF;
  INSERT INTO public.board_members (board_id, user_id, added_by)
    VALUES (_inv.board_id, _u, _inv.inviter_id)
    ON CONFLICT (board_id, user_id) DO NOTHING;
  UPDATE public.board_invitations SET status = 'accepted', updated_at = now() WHERE id = _invitation_id;
  RETURN _inv.board_id;
END; $$;

-- 13. Invite by friend code RPC
CREATE OR REPLACE FUNCTION public.invite_to_board_by_code(_board_id uuid, _friend_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _u uuid := auth.uid(); _target uuid; _inv_id uuid;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_board_owner(_board_id, _u) THEN RAISE EXCEPTION 'Only owner can invite'; END IF;
  SELECT user_id INTO _target FROM public.profiles WHERE friend_code = _friend_code;
  IF _target IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  IF _target = _u THEN RAISE EXCEPTION 'Cannot invite yourself'; END IF;
  IF EXISTS (SELECT 1 FROM public.board_members WHERE board_id = _board_id AND user_id = _target) THEN
    RAISE EXCEPTION 'Already a member';
  END IF;
  INSERT INTO public.board_invitations (board_id, inviter_id, invitee_id, status)
    VALUES (_board_id, _u, _target, 'pending')
    ON CONFLICT (board_id, invitee_id, status) DO UPDATE SET updated_at = now()
    RETURNING id INTO _inv_id;
  RETURN _inv_id;
END; $$;

-- 14. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_members;