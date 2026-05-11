CREATE OR REPLACE FUNCTION public.get_member_room_streak(_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _streak integer := 0;
  _check_date date := CURRENT_DATE;
  _has_activity boolean;
  _has_freeze boolean;
BEGIN
  -- Aplica freezes pendentes para preencher gaps antes de calcular
  PERFORM public.auto_consume_pending_freezes(_user_id);

  -- Verifica se hoje tem atividade
  SELECT EXISTS(
    SELECT 1 FROM public.time_entries te
    WHERE te.user_id = _user_id
      AND te.end_time IS NOT NULL
      AND te.start_time::date = _check_date
  ) INTO _has_activity;

  -- Se hoje não tem atividade, hoje está "em andamento":
  -- não quebra a streak, começa a contar a partir de ontem.
  IF NOT _has_activity THEN
    _check_date := _check_date - 1;
  END IF;

  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.time_entries te
      WHERE te.user_id = _user_id
        AND te.end_time IS NOT NULL
        AND te.start_time::date = _check_date
    ) INTO _has_activity;

    IF _has_activity THEN
      _streak := _streak + 1;
    ELSE
      SELECT EXISTS(
        SELECT 1 FROM public.streak_freezes sf
        WHERE sf.user_id = _user_id
          AND _check_date = ANY(sf.auto_used_dates)
      ) INTO _has_freeze;

      IF _has_freeze THEN
        _streak := _streak + 1;
      ELSE
        EXIT;
      END IF;
    END IF;

    _check_date := _check_date - 1;

    IF _streak >= 365 THEN EXIT; END IF;
  END LOOP;

  RETURN _streak;
END;
$function$;