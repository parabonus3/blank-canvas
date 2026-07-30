ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS cover_color text,
  ADD COLUMN IF NOT EXISTS cover_url text;

-- Task attachments: board members can read, editors can insert, author/owner can delete
DROP POLICY IF EXISTS "Users manage own task_attachments" ON public.task_attachments;

CREATE POLICY "attachments_select_board_members" ON public.task_attachments
FOR SELECT TO authenticated
USING (public.can_access_task(task_id, auth.uid()));

CREATE POLICY "attachments_insert_editors" ON public.task_attachments
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.can_edit_task(task_id, auth.uid()));

CREATE POLICY "attachments_delete_author_or_owner" ON public.task_attachments
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_attachments.task_id
      AND public.is_board_owner(t.board_id, auth.uid())
  )
);

-- Storage: board-scoped paths <board_id>/<task_id>/<file>
DROP POLICY IF EXISTS "Users read own task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users update own task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own task attachments" ON storage.objects;

CREATE POLICY "task_attachments_read_members" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND public.is_board_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "task_attachments_insert_editors" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments'
  AND public.can_edit_board(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "task_attachments_update_editors" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND public.can_edit_board(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "task_attachments_delete_editors" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND public.can_edit_board(((storage.foldername(name))[1])::uuid, auth.uid())
);