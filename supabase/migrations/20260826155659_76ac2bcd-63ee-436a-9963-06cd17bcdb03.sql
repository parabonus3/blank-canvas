CREATE TABLE public.focus_commitments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  time_entry_id uuid REFERENCES public.time_entries(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  target_minutes integer NOT NULL,
  achieved_seconds integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  interruption_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.focus_commitments TO authenticated;
GRANT ALL ON public.focus_commitments TO service_role;

ALTER TABLE public.focus_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own focus commitments"
  ON public.focus_commitments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users create own focus commitments"
  ON public.focus_commitments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own focus commitments"
  ON public.focus_commitments FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own focus commitments"
  ON public.focus_commitments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_focus_commitments_user_created ON public.focus_commitments (user_id, created_at DESC);

ALTER TABLE public.focus_commitments
  ADD CONSTRAINT focus_commitments_target_check CHECK (target_minutes > 0 AND target_minutes <= 480);