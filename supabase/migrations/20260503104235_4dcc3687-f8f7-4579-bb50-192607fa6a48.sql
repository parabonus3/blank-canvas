-- Parte 2: Streak não pode iniciar a partir de freeze
CREATE OR REPLACE FUNCTION public.get_member_room_streak(_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _streak integer := 0;
  _check_date date := CURRENT_DATE;
  _has_activity boolean;
  _has_freeze boolean;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.time_entries te
      WHERE te.user_id = _user_id
        AND te.end_time IS NOT NULL
        AND te.start_time::date = _check_date
    ) INTO _has_activity;

    IF NOT _has_activity THEN
      SELECT EXISTS(
        SELECT 1 FROM public.streak_freezes sf
        WHERE sf.user_id = _user_id
          AND _check_date = ANY(sf.auto_used_dates)
      ) INTO _has_freeze;
    ELSE
      _has_freeze := false;
    END IF;

    -- Hoje sem atividade e sem freeze: pula sem quebrar (comportamento atual)
    IF NOT _has_activity AND NOT _has_freeze AND _check_date < CURRENT_DATE THEN
      EXIT;
    END IF;

    IF _has_activity THEN
      _streak := _streak + 1;
    ELSIF _has_freeze THEN
      -- Freeze SÓ conta se já houver streak (preserva, nunca inicia)
      IF _streak > 0 THEN
        _streak := _streak + 1;
      ELSE
        -- Freeze sem atividade prévia: encerra (não pode iniciar streak do zero)
        IF _check_date < CURRENT_DATE THEN
          EXIT;
        END IF;
      END IF;
    END IF;

    _check_date := _check_date - 1;

    IF _streak > 365 THEN EXIT; END IF;
  END LOOP;

  RETURN _streak;
END;
$function$;

-- Parte 3: Recalcular cache last_known_streak para todos os perfis
UPDATE public.profiles p
SET last_known_streak = public.get_member_room_streak(p.user_id),
    updated_at = now()
WHERE p.last_known_streak IS DISTINCT FROM public.get_member_room_streak(p.user_id);