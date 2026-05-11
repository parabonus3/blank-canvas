-- 1a. Reconciliação retroativa
UPDATE public.streak_freezes
SET used = LEAST(total_granted, COALESCE(array_length(auto_used_dates, 1), 0))
WHERE used > total_granted
   OR used > COALESCE(array_length(auto_used_dates, 1), 0);

-- 1b. Constraint de sanidade
ALTER TABLE public.streak_freezes
  DROP CONSTRAINT IF EXISTS streak_freezes_used_within_granted;
ALTER TABLE public.streak_freezes
  ADD CONSTRAINT streak_freezes_used_within_granted
  CHECK (used >= 0 AND used <= total_granted);

-- 1c. Função idempotente
CREATE OR REPLACE FUNCTION public.consume_streak_freeze(_date date)
 RETURNS TABLE(source text, remaining_monthly integer, remaining_purchased integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _my text := to_char(_date, 'YYYY-MM');
  _row record;
  _bal integer;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Trava por usuário para serializar chamadas concorrentes
  PERFORM pg_advisory_xact_lock(hashtext('freeze:' || _user_id::text));

  -- Lock pessimista na linha do mês
  SELECT id, total_granted, used, COALESCE(auto_used_dates, ARRAY[]::date[]) AS dates
    INTO _row
    FROM public.streak_freezes
    WHERE user_id = _user_id AND month_year = _my
    FOR UPDATE;

  -- Já consumido para essa data
  IF _row.id IS NOT NULL AND _date = ANY(_row.dates) THEN
    SELECT COALESCE(balance, 0) INTO _bal FROM public.purchased_streak_freezes WHERE user_id = _user_id;
    source := 'already_used';
    remaining_monthly := GREATEST(0, COALESCE(_row.total_granted - _row.used, 0));
    remaining_purchased := COALESCE(_bal, 0);
    RETURN NEXT; RETURN;
  END IF;

  -- Tenta consumir do saldo mensal
  IF _row.id IS NOT NULL AND _row.used < _row.total_granted THEN
    UPDATE public.streak_freezes
      SET used = used + 1,
          auto_used_dates = ARRAY(SELECT DISTINCT unnest(COALESCE(auto_used_dates, ARRAY[]::date[]) || ARRAY[_date]))
      WHERE id = _row.id;
    SELECT COALESCE(balance, 0) INTO _bal FROM public.purchased_streak_freezes WHERE user_id = _user_id;
    source := 'monthly';
    remaining_monthly := _row.total_granted - (_row.used + 1);
    remaining_purchased := COALESCE(_bal, 0);
    RETURN NEXT; RETURN;
  END IF;

  -- Tenta consumir do saldo comprado
  SELECT balance INTO _bal FROM public.purchased_streak_freezes WHERE user_id = _user_id FOR UPDATE;
  IF COALESCE(_bal, 0) > 0 THEN
    UPDATE public.purchased_streak_freezes
      SET balance = balance - 1, total_used = total_used + 1, updated_at = now()
      WHERE user_id = _user_id;
    IF _row.id IS NULL THEN
      INSERT INTO public.streak_freezes (user_id, month_year, total_granted, used, auto_used_dates)
      VALUES (_user_id, _my, 0, 0, ARRAY[_date]);
    ELSE
      UPDATE public.streak_freezes
        SET auto_used_dates = ARRAY(SELECT DISTINCT unnest(COALESCE(auto_used_dates, ARRAY[]::date[]) || ARRAY[_date]))
        WHERE id = _row.id;
    END IF;
    source := 'purchased';
    remaining_monthly := 0;
    remaining_purchased := _bal - 1;
    RETURN NEXT; RETURN;
  END IF;

  source := 'none';
  remaining_monthly := 0;
  remaining_purchased := 0;
  RETURN NEXT;
END;
$function$;