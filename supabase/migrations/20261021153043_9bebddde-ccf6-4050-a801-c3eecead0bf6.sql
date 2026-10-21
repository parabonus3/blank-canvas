ALTER TABLE public.focus_routines
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS weekdays integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL;

CREATE TABLE public.focus_routine_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  routine_id uuid NOT NULL REFERENCES public.focus_routines(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  status text NOT NULL DEFAULT 'started',
  steps_total integer NOT NULL DEFAULT 0,
  steps_done integer NOT NULL DEFAULT 0,
  steps_skipped integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.focus_routine_runs TO authenticated;
GRANT ALL ON public.focus_routine_runs TO service_role;
ALTER TABLE public.focus_routine_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own routine runs" ON public.focus_routine_runs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX focus_routine_runs_user_date ON public.focus_routine_runs(user_id, local_date);

CREATE OR REPLACE FUNCTION public.validate_focus_routine_run()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('started','completed','partial') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER focus_routine_runs_validate BEFORE INSERT OR UPDATE ON public.focus_routine_runs
FOR EACH ROW EXECUTE FUNCTION public.validate_focus_routine_run();