-- 1. Hour heatmap for the current user
CREATE OR REPLACE FUNCTION public.get_my_hour_heatmap(_days integer DEFAULT 90)
RETURNS TABLE(dow integer, hour integer, total_minutes numeric, sessions bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH tz AS (
    SELECT COALESCE(NULLIF(p.timezone, ''), 'America/Sao_Paulo') AS zone
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1
  ), z AS (
    SELECT COALESCE((SELECT zone FROM tz), 'America/Sao_Paulo') AS zone
  )
  SELECT
    EXTRACT(DOW FROM te.start_time AT TIME ZONE (SELECT zone FROM z))::int AS dow,
    EXTRACT(HOUR FROM te.start_time AT TIME ZONE (SELECT zone FROM z))::int AS hour,
    ROUND(SUM(COALESCE(te.duration, 0)) / 60.0, 1)::numeric AS total_minutes,
    COUNT(*)::bigint AS sessions
  FROM public.time_entries te
  WHERE te.user_id = auth.uid()
    AND te.end_time IS NOT NULL
    AND COALESCE(te.duration, 0) > 0
    AND te.start_time >= (now() - (GREATEST(COALESCE(_days, 90), 1) || ' days')::interval)
  GROUP BY 1, 2
$$;

REVOKE ALL ON FUNCTION public.get_my_hour_heatmap(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_hour_heatmap(integer) TO authenticated;

-- 2. Weekly budgets per category
CREATE TABLE public.category_budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  weekly_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_budgets TO authenticated;
GRANT ALL ON public.category_budgets TO service_role;

ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own category budgets"
ON public.category_budgets FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_category_budgets_updated_at
BEFORE UPDATE ON public.category_budgets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Time blocks (day agenda)
CREATE TABLE public.time_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  time_entry_id uuid REFERENCES public.time_entries(id) ON DELETE SET NULL,
  title text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_blocks TO authenticated;
GRANT ALL ON public.time_blocks TO service_role;

ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own time blocks"
ON public.time_blocks FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_time_blocks_user_start ON public.time_blocks (user_id, start_at);

CREATE TRIGGER update_time_blocks_updated_at
BEFORE UPDATE ON public.time_blocks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_time_block_range()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.end_at <= NEW.start_at THEN
    RAISE EXCEPTION 'end_at must be after start_at';
  END IF;
  IF NEW.end_at - NEW.start_at > interval '24 hours' THEN
    RAISE EXCEPTION 'time block cannot exceed 24 hours';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_time_block_range_trg
BEFORE INSERT OR UPDATE ON public.time_blocks
FOR EACH ROW EXECUTE FUNCTION public.validate_time_block_range();