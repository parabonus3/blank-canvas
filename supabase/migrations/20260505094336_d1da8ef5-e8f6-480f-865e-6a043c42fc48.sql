
-- ============ life_categories ============
CREATE TABLE public.life_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  icon text NOT NULL DEFAULT 'target',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.life_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own life_categories select" ON public.life_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own life_categories insert" ON public.life_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own life_categories update" ON public.life_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own life_categories delete" ON public.life_categories FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_life_categories_updated
BEFORE UPDATE ON public.life_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ annual_goals ============
CREATE TABLE public.annual_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid REFERENCES public.life_categories(id) ON DELETE SET NULL,
  year integer NOT NULL,
  title text NOT NULL,
  description text,
  goal_type text NOT NULL CHECK (goal_type IN ('simple','progress','habit')),
  target_value numeric NOT NULL DEFAULT 1,
  current_value numeric NOT NULL DEFAULT 0,
  unit text,
  frequency_period text CHECK (frequency_period IS NULL OR frequency_period IN ('weekly','monthly')),
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  archived boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.annual_goals ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_annual_goals_user_year ON public.annual_goals(user_id, year);

CREATE POLICY "own annual_goals select" ON public.annual_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own annual_goals insert" ON public.annual_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own annual_goals update" ON public.annual_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own annual_goals delete" ON public.annual_goals FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_annual_goals_updated
BEFORE UPDATE ON public.annual_goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ annual_goal_progress ============
CREATE TABLE public.annual_goal_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.annual_goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  value numeric NOT NULL DEFAULT 1,
  note text,
  logged_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.annual_goal_progress ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_annual_goal_progress_goal_logged ON public.annual_goal_progress(goal_id, logged_at DESC);

CREATE POLICY "own goal_progress select" ON public.annual_goal_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own goal_progress insert" ON public.annual_goal_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own goal_progress delete" ON public.annual_goal_progress FOR DELETE USING (auth.uid() = user_id);

-- ============ Trigger: aplicar progresso na meta ============
CREATE OR REPLACE FUNCTION public.apply_goal_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _g record;
BEGIN
  SELECT * INTO _g FROM public.annual_goals WHERE id = NEW.goal_id;
  IF _g.id IS NULL THEN RETURN NEW; END IF;

  UPDATE public.annual_goals
  SET current_value = LEAST(target_value, current_value + NEW.value),
      is_completed  = (LEAST(target_value, current_value + NEW.value) >= target_value),
      completed_at  = CASE
        WHEN (LEAST(target_value, current_value + NEW.value) >= target_value) AND completed_at IS NULL
        THEN now() ELSE completed_at END,
      updated_at = now()
  WHERE id = NEW.goal_id;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_apply_goal_progress
AFTER INSERT ON public.annual_goal_progress
FOR EACH ROW EXECUTE FUNCTION public.apply_goal_progress();

-- ============ Função: contar progresso no período (habit) ============
CREATE OR REPLACE FUNCTION public.get_habit_period_count(_goal_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _period text; _start timestamptz; _count integer;
BEGIN
  SELECT frequency_period INTO _period FROM public.annual_goals
  WHERE id = _goal_id AND user_id = auth.uid();
  IF _period IS NULL THEN RETURN 0; END IF;
  IF _period = 'weekly' THEN
    _start := date_trunc('week', now());
  ELSE
    _start := date_trunc('month', now());
  END IF;
  SELECT COUNT(*) INTO _count FROM public.annual_goal_progress
  WHERE goal_id = _goal_id AND logged_at >= _start;
  RETURN _count;
END; $$;

-- ============ RPC: duplicar metas para o ano seguinte ============
CREATE OR REPLACE FUNCTION public.duplicate_goals_to_year(_from integer, _to integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user_id uuid := auth.uid(); _count integer;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.annual_goals (user_id, category_id, year, title, description, goal_type, target_value, current_value, unit, frequency_period, position)
  SELECT user_id, category_id, _to, title, description, goal_type, target_value, 0, unit, frequency_period, position
  FROM public.annual_goals
  WHERE user_id = _user_id AND year = _from AND archived = false;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END; $$;

-- ============ Stats RPC ============
CREATE OR REPLACE FUNCTION public.get_annual_goals_stats(_year integer)
RETURNS TABLE(total_goals integer, completed_goals integer, overall_progress numeric, categories_count integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE is_completed)::int,
    COALESCE(AVG(LEAST(100, (current_value / NULLIF(target_value,0)) * 100)), 0)::numeric,
    (SELECT COUNT(*)::int FROM public.life_categories WHERE user_id = _user_id)
  FROM public.annual_goals
  WHERE user_id = _user_id AND year = _year AND archived = false;
END; $$;
