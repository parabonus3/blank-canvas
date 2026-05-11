
-- 1. Função que aplica freezes pendentes para preencher gaps entre o último dia ativo e ontem
CREATE OR REPLACE FUNCTION public.auto_consume_pending_freezes(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _last_active date;
  _d date;
  _yesterday date := CURRENT_DATE - 1;
  _max_gap_start date := CURRENT_DATE - 60; -- cap de 60 dias
  _my text;
  _row record;
  _bal integer;
  _consumed boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;

  -- Lock por usuário
  PERFORM pg_advisory_xact_lock(hashtext('freeze:' || _user_id::text));

  -- Última data com atividade real
  SELECT MAX(start_time::date) INTO _last_active
  FROM public.time_entries
  WHERE user_id = _user_id AND end_time IS NOT NULL;

  IF _last_active IS NULL THEN RETURN; END IF;
  IF _last_active >= _yesterday THEN RETURN; END IF;

  -- Começa do dia seguinte ao último ativo, mas respeitando cap de 60 dias
  _d := GREATEST(_last_active + 1, _max_gap_start);

  WHILE _d <= _yesterday LOOP
    _my := to_char(_d, 'YYYY-MM');
    _consumed := false;

    -- Pega linha do mês de _d
    SELECT id, total_granted, used, COALESCE(auto_used_dates, ARRAY[]::date[]) AS dates
      INTO _row
      FROM public.streak_freezes
      WHERE user_id = _user_id AND month_year = _my
      FOR UPDATE;

    -- Já tem freeze nessa data? pula
    IF _row.id IS NOT NULL AND _d = ANY(_row.dates) THEN
      _d := _d + 1;
      CONTINUE;
    END IF;

    -- Tenta saldo mensal (do mês daquela data)
    IF _row.id IS NOT NULL AND _row.used < _row.total_granted THEN
      UPDATE public.streak_freezes
        SET used = used + 1,
            auto_used_dates = ARRAY(SELECT DISTINCT unnest(COALESCE(auto_used_dates, ARRAY[]::date[]) || ARRAY[_d]))
        WHERE id = _row.id;
      _consumed := true;
    ELSE
      -- Tenta saldo comprado
      SELECT balance INTO _bal FROM public.purchased_streak_freezes WHERE user_id = _user_id FOR UPDATE;
      IF COALESCE(_bal, 0) > 0 THEN
        UPDATE public.purchased_streak_freezes
          SET balance = balance - 1, total_used = total_used + 1, updated_at = now()
          WHERE user_id = _user_id;
        IF _row.id IS NULL THEN
          INSERT INTO public.streak_freezes (user_id, month_year, total_granted, used, auto_used_dates)
          VALUES (_user_id, _my, 0, 0, ARRAY[_d]);
        ELSE
          UPDATE public.streak_freezes
            SET auto_used_dates = ARRAY(SELECT DISTINCT unnest(COALESCE(auto_used_dates, ARRAY[]::date[]) || ARRAY[_d]))
            WHERE id = _row.id;
        END IF;
        _consumed := true;
      END IF;
    END IF;

    -- Sem saldo: streak vai quebrar mesmo, encerra
    IF NOT _consumed THEN EXIT; END IF;

    _d := _d + 1;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_consume_pending_freezes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auto_consume_pending_freezes(uuid) TO authenticated, service_role;

-- 2. Atualiza get_member_room_streak para chamar auto-consume primeiro
-- Precisa ser VOLATILE porque agora escreve via auto_consume_pending_freezes
CREATE OR REPLACE FUNCTION public.get_member_room_streak(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _streak integer := 0;
  _check_date date := CURRENT_DATE;
  _has_activity boolean;
  _has_freeze boolean;
BEGIN
  -- Aplica freezes pendentes para preencher gaps antes de calcular
  PERFORM public.auto_consume_pending_freezes(_user_id);

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

    IF NOT _has_activity AND NOT _has_freeze AND _check_date < CURRENT_DATE THEN
      EXIT;
    END IF;

    IF _has_activity THEN
      _streak := _streak + 1;
    ELSIF _has_freeze THEN
      IF _streak > 0 THEN
        _streak := _streak + 1;
      ELSE
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
$$;

-- 3. Backfill: aplica para todos os usuários com saldo e gap nos últimos 30 dias
DO $$
DECLARE
  _u uuid;
BEGIN
  FOR _u IN
    SELECT DISTINCT te.user_id
    FROM public.time_entries te
    WHERE te.end_time IS NOT NULL
      AND te.start_time >= CURRENT_DATE - 60
      AND (
        EXISTS (SELECT 1 FROM public.streak_freezes sf WHERE sf.user_id = te.user_id AND sf.used < sf.total_granted)
        OR EXISTS (SELECT 1 FROM public.purchased_streak_freezes pf WHERE pf.user_id = te.user_id AND pf.balance > 0)
      )
  LOOP
    PERFORM public.auto_consume_pending_freezes(_u);
  END LOOP;
END $$;
