-- Tabela de missões concluídas
CREATE TABLE IF NOT EXISTS public.freeze_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mission_type TEXT NOT NULL CHECK (mission_type IN ('weekly_bronze','weekly_gold','monthly_legendary')),
  period_key TEXT NOT NULL,
  freezes_awarded INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_type, period_key)
);

CREATE INDEX IF NOT EXISTS idx_freeze_missions_user ON public.freeze_missions(user_id, completed_at DESC);

ALTER TABLE public.freeze_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own missions"
  ON public.freeze_missions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Sem policy de INSERT/UPDATE/DELETE → apenas SECURITY DEFINER funções podem escrever.

-- Função: progresso atual (somente leitura)
CREATE OR REPLACE FUNCTION public.get_freeze_missions_progress()
RETURNS TABLE (
  mission_type TEXT,
  period_key TEXT,
  progress_current NUMERIC,
  progress_target NUMERIC,
  completed BOOLEAN,
  freezes_reward INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_tz TEXT;
  v_today DATE;
  v_week_start DATE;
  v_week_end DATE;
  v_month_start DATE;
  v_month_end DATE;
  v_week_key TEXT;
  v_month_key TEXT;
  v_days_in_month INT;

  v_bronze_days INT;
  v_gold_days INT;
  v_legendary_days INT;
  v_legendary_total NUMERIC;
BEGIN
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(timezone, 'America/Sao_Paulo') INTO v_tz
  FROM public.profiles WHERE user_id = v_user;
  IF v_tz IS NULL THEN v_tz := 'America/Sao_Paulo'; END IF;

  v_today := (now() AT TIME ZONE v_tz)::date;
  -- semana ISO: segunda a domingo
  v_week_start := date_trunc('week', v_today)::date;
  v_week_end := v_week_start + 6;
  v_month_start := date_trunc('month', v_today)::date;
  v_month_end := (date_trunc('month', v_today) + interval '1 month - 1 day')::date;
  v_days_in_month := EXTRACT(DAY FROM v_month_end)::int;
  v_week_key := to_char(v_week_start, 'IYYY-"W"IW');
  v_month_key := to_char(v_month_start, 'YYYY-MM');

  -- Bronze: dias com >= 1h (3600s) na semana atual
  SELECT COUNT(*) INTO v_bronze_days FROM (
    SELECT (start_time AT TIME ZONE v_tz)::date AS d, SUM(COALESCE(duration,0)) AS s
    FROM public.time_entries
    WHERE user_id = v_user
      AND end_time IS NOT NULL
      AND (start_time AT TIME ZONE v_tz)::date BETWEEN v_week_start AND v_week_end
    GROUP BY 1
    HAVING SUM(COALESCE(duration,0)) >= 3600
  ) x;

  -- Gold: dias com >= 2h (7200s) na semana atual
  SELECT COUNT(*) INTO v_gold_days FROM (
    SELECT (start_time AT TIME ZONE v_tz)::date AS d, SUM(COALESCE(duration,0)) AS s
    FROM public.time_entries
    WHERE user_id = v_user
      AND end_time IS NOT NULL
      AND (start_time AT TIME ZONE v_tz)::date BETWEEN v_week_start AND v_week_end
    GROUP BY 1
    HAVING SUM(COALESCE(duration,0)) >= 7200
  ) x;

  -- Lendária: dias com >= 1h no mês + total horas
  SELECT COUNT(*), COALESCE(SUM(s),0)/3600.0 INTO v_legendary_days, v_legendary_total FROM (
    SELECT (start_time AT TIME ZONE v_tz)::date AS d, SUM(COALESCE(duration,0)) AS s
    FROM public.time_entries
    WHERE user_id = v_user
      AND end_time IS NOT NULL
      AND (start_time AT TIME ZONE v_tz)::date BETWEEN v_month_start AND v_month_end
    GROUP BY 1
    HAVING SUM(COALESCE(duration,0)) >= 3600
  ) x;

  RETURN QUERY VALUES
    ('weekly_bronze'::text, v_week_key,
      LEAST(v_bronze_days, 5)::numeric, 5::numeric,
      EXISTS(SELECT 1 FROM public.freeze_missions WHERE user_id=v_user AND mission_type='weekly_bronze' AND period_key=v_week_key),
      1),
    ('weekly_gold'::text, v_week_key,
      LEAST(v_gold_days, 7)::numeric, 7::numeric,
      EXISTS(SELECT 1 FROM public.freeze_missions WHERE user_id=v_user AND mission_type='weekly_gold' AND period_key=v_week_key),
      1),
    ('monthly_legendary'::text, v_month_key,
      LEAST(v_legendary_days, v_days_in_month)::numeric, v_days_in_month::numeric,
      EXISTS(SELECT 1 FROM public.freeze_missions WHERE user_id=v_user AND mission_type='monthly_legendary' AND period_key=v_month_key),
      2);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_freeze_missions_progress() TO authenticated;

-- Função: verificar e conceder
CREATE OR REPLACE FUNCTION public.check_and_grant_freeze_missions()
RETURNS TABLE (
  mission_type TEXT,
  freezes_granted INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_tz TEXT;
  v_today DATE;
  v_week_start DATE;
  v_week_end DATE;
  v_month_start DATE;
  v_month_end DATE;
  v_days_in_month INT;
  v_week_key TEXT;
  v_month_key TEXT;
  v_already_this_month INT;
  v_cap INT := 6;
  v_remaining INT;

  v_bronze_days INT;
  v_gold_days INT;
  v_legendary_days INT;
  v_legendary_total NUMERIC;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(timezone, 'America/Sao_Paulo') INTO v_tz
  FROM public.profiles WHERE user_id = v_user;
  IF v_tz IS NULL THEN v_tz := 'America/Sao_Paulo'; END IF;

  v_today := (now() AT TIME ZONE v_tz)::date;
  v_week_start := date_trunc('week', v_today)::date;
  v_week_end := v_week_start + 6;
  v_month_start := date_trunc('month', v_today)::date;
  v_month_end := (date_trunc('month', v_today) + interval '1 month - 1 day')::date;
  v_days_in_month := EXTRACT(DAY FROM v_month_end)::int;
  v_week_key := to_char(v_week_start, 'IYYY-"W"IW');
  v_month_key := to_char(v_month_start, 'YYYY-MM');

  -- Quanto já foi concedido este mês via missões
  SELECT COALESCE(SUM(freezes_awarded),0) INTO v_already_this_month
  FROM public.freeze_missions
  WHERE user_id = v_user
    AND completed_at >= v_month_start
    AND completed_at < (v_month_end + 1);

  v_remaining := GREATEST(0, v_cap - v_already_this_month);

  -- Garantir linha em purchased_streak_freezes
  INSERT INTO public.purchased_streak_freezes (user_id, balance, total_purchased, total_used, updated_at)
  VALUES (v_user, 0, 0, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  -- Calcular progresso
  SELECT COUNT(*) INTO v_bronze_days FROM (
    SELECT (start_time AT TIME ZONE v_tz)::date AS d
    FROM public.time_entries
    WHERE user_id = v_user AND end_time IS NOT NULL
      AND (start_time AT TIME ZONE v_tz)::date BETWEEN v_week_start AND v_week_end
    GROUP BY 1 HAVING SUM(COALESCE(duration,0)) >= 3600
  ) x;

  SELECT COUNT(*) INTO v_gold_days FROM (
    SELECT (start_time AT TIME ZONE v_tz)::date AS d
    FROM public.time_entries
    WHERE user_id = v_user AND end_time IS NOT NULL
      AND (start_time AT TIME ZONE v_tz)::date BETWEEN v_week_start AND v_week_end
    GROUP BY 1 HAVING SUM(COALESCE(duration,0)) >= 7200
  ) x;

  SELECT COUNT(*), COALESCE(SUM(s),0)/3600.0 INTO v_legendary_days, v_legendary_total FROM (
    SELECT (start_time AT TIME ZONE v_tz)::date AS d, SUM(COALESCE(duration,0)) AS s
    FROM public.time_entries
    WHERE user_id = v_user AND end_time IS NOT NULL
      AND (start_time AT TIME ZONE v_tz)::date BETWEEN v_month_start AND v_month_end
    GROUP BY 1 HAVING SUM(COALESCE(duration,0)) >= 3600
  ) x;

  -- Bronze
  IF v_bronze_days >= 5 AND v_remaining >= 1 THEN
    BEGIN
      INSERT INTO public.freeze_missions (user_id, mission_type, period_key, freezes_awarded)
      VALUES (v_user, 'weekly_bronze', v_week_key, 1);

      UPDATE public.purchased_streak_freezes
      SET balance = balance + 1, updated_at = now()
      WHERE user_id = v_user;

      v_remaining := v_remaining - 1;
      mission_type := 'weekly_bronze'; freezes_granted := 1; RETURN NEXT;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END IF;

  -- Gold
  IF v_gold_days >= 7 AND v_remaining >= 1 THEN
    BEGIN
      INSERT INTO public.freeze_missions (user_id, mission_type, period_key, freezes_awarded)
      VALUES (v_user, 'weekly_gold', v_week_key, 1);

      UPDATE public.purchased_streak_freezes
      SET balance = balance + 1, updated_at = now()
      WHERE user_id = v_user;

      v_remaining := v_remaining - 1;
      mission_type := 'weekly_gold'; freezes_granted := 1; RETURN NEXT;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END IF;

  -- Legendary (só no último dia do mês para garantir mês fechado)
  IF v_today = v_month_end
     AND v_legendary_days >= v_days_in_month
     AND v_legendary_total >= 80
     AND v_remaining >= 2 THEN
    BEGIN
      INSERT INTO public.freeze_missions (user_id, mission_type, period_key, freezes_awarded)
      VALUES (v_user, 'monthly_legendary', v_month_key, 2);

      UPDATE public.purchased_streak_freezes
      SET balance = balance + 2, updated_at = now()
      WHERE user_id = v_user;

      v_remaining := v_remaining - 2;
      mission_type := 'monthly_legendary'; freezes_granted := 2; RETURN NEXT;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_grant_freeze_missions() TO authenticated;

-- Garantir unique em purchased_streak_freezes.user_id (necessário para ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'purchased_streak_freezes_user_id_key'
  ) THEN
    BEGIN
      ALTER TABLE public.purchased_streak_freezes
      ADD CONSTRAINT purchased_streak_freezes_user_id_key UNIQUE (user_id);
    EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;