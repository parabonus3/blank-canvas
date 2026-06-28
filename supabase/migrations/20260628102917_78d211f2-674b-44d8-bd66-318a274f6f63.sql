CREATE OR REPLACE FUNCTION public.get_freeze_missions_progress()
 RETURNS TABLE(mission_type text, period_key text, progress_current numeric, progress_target numeric, completed boolean, freezes_reward integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_week_start := date_trunc('week', v_today)::date;
  v_week_end := v_week_start + 6;
  v_month_start := date_trunc('month', v_today)::date;
  v_month_end := (date_trunc('month', v_today) + interval '1 month - 1 day')::date;
  v_days_in_month := EXTRACT(DAY FROM v_month_end)::int;
  v_week_key := to_char(v_week_start, 'IYYY-"W"IW');
  v_month_key := to_char(v_month_start, 'YYYY-MM');

  SELECT COUNT(*) INTO v_bronze_days FROM (
    SELECT (start_time AT TIME ZONE v_tz)::date AS d, SUM(COALESCE(duration,0)) AS s
    FROM public.time_entries
    WHERE user_id = v_user AND end_time IS NOT NULL
      AND (start_time AT TIME ZONE v_tz)::date BETWEEN v_week_start AND v_week_end
    GROUP BY 1 HAVING SUM(COALESCE(duration,0)) >= 3600
  ) x;

  SELECT COUNT(*) INTO v_gold_days FROM (
    SELECT (start_time AT TIME ZONE v_tz)::date AS d, SUM(COALESCE(duration,0)) AS s
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

  RETURN QUERY VALUES
    ('weekly_bronze'::text, v_week_key,
      LEAST(v_bronze_days, 5)::numeric, 5::numeric,
      EXISTS(SELECT 1 FROM public.freeze_missions fm WHERE fm.user_id=v_user AND fm.mission_type='weekly_bronze' AND fm.period_key=v_week_key),
      1),
    ('weekly_gold'::text, v_week_key,
      LEAST(v_gold_days, 7)::numeric, 7::numeric,
      EXISTS(SELECT 1 FROM public.freeze_missions fm WHERE fm.user_id=v_user AND fm.mission_type='weekly_gold' AND fm.period_key=v_week_key),
      1),
    ('monthly_legendary'::text, v_month_key,
      LEAST(v_legendary_days, v_days_in_month)::numeric, v_days_in_month::numeric,
      EXISTS(SELECT 1 FROM public.freeze_missions fm WHERE fm.user_id=v_user AND fm.mission_type='monthly_legendary' AND fm.period_key=v_month_key),
      2);
END;
$function$;