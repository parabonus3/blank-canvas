-- Permanent purchased freeze balance per user
CREATE TABLE public.purchased_streak_freezes (
  user_id uuid PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0,
  total_purchased integer NOT NULL DEFAULT 0,
  total_used integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchased_streak_freezes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchased freezes"
ON public.purchased_streak_freezes
FOR SELECT
USING (auth.uid() = user_id);
-- No INSERT/UPDATE/DELETE policies = clients can't write; only service role bypasses RLS

-- Purchase audit log (one row per Stripe checkout session)
CREATE TABLE public.streak_freeze_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_session_id text NOT NULL UNIQUE,
  stripe_payment_intent text,
  quantity integer NOT NULL,
  freezes_added integer NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.streak_freeze_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
ON public.streak_freeze_purchases
FOR SELECT
USING (auth.uid() = user_id);

-- Credit purchased freezes (called by webhook via service role)
CREATE OR REPLACE FUNCTION public.credit_purchased_freezes(_user_id uuid, _amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _amount <= 0 THEN RETURN; END IF;
  INSERT INTO public.purchased_streak_freezes (user_id, balance, total_purchased)
  VALUES (_user_id, _amount, _amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.purchased_streak_freezes.balance + _amount,
        total_purchased = public.purchased_streak_freezes.total_purchased + _amount,
        updated_at = now();
END;
$$;

-- Consume one freeze for a given date: monthly first, then purchased.
-- Returns the source used and remaining balances.
CREATE OR REPLACE FUNCTION public.consume_streak_freeze(_date date)
RETURNS TABLE(source text, remaining_monthly integer, remaining_purchased integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _month_year text := to_char(_date, 'YYYY-MM');
  _freeze_row record;
  _purchased_balance integer;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Idempotency: if this date already covered, return without consuming
  SELECT id, total_granted, used, COALESCE(auto_used_dates, ARRAY[]::date[]) AS dates
  INTO _freeze_row
  FROM public.streak_freezes
  WHERE user_id = _user_id AND month_year = _month_year;

  IF _freeze_row.id IS NOT NULL AND _date = ANY(_freeze_row.dates) THEN
    SELECT COALESCE(balance, 0) INTO _purchased_balance
    FROM public.purchased_streak_freezes WHERE user_id = _user_id;
    source := 'already_used';
    remaining_monthly := COALESCE(_freeze_row.total_granted - _freeze_row.used, 0);
    remaining_purchased := COALESCE(_purchased_balance, 0);
    RETURN NEXT;
    RETURN;
  END IF;

  -- Try monthly first
  IF _freeze_row.id IS NOT NULL AND _freeze_row.used < _freeze_row.total_granted THEN
    UPDATE public.streak_freezes
    SET used = used + 1,
        auto_used_dates = ARRAY(SELECT DISTINCT unnest(COALESCE(auto_used_dates, ARRAY[]::date[]) || ARRAY[_date]))
    WHERE id = _freeze_row.id;

    SELECT COALESCE(balance, 0) INTO _purchased_balance
    FROM public.purchased_streak_freezes WHERE user_id = _user_id;
    source := 'monthly';
    remaining_monthly := _freeze_row.total_granted - (_freeze_row.used + 1);
    remaining_purchased := COALESCE(_purchased_balance, 0);
    RETURN NEXT;
    RETURN;
  END IF;

  -- Try purchased
  SELECT balance INTO _purchased_balance
  FROM public.purchased_streak_freezes WHERE user_id = _user_id FOR UPDATE;

  IF COALESCE(_purchased_balance, 0) > 0 THEN
    UPDATE public.purchased_streak_freezes
    SET balance = balance - 1,
        total_used = total_used + 1,
        updated_at = now()
    WHERE user_id = _user_id;

    -- Record the date in current month's streak_freezes (create row if needed)
    IF _freeze_row.id IS NULL THEN
      INSERT INTO public.streak_freezes (user_id, month_year, total_granted, used, auto_used_dates)
      VALUES (_user_id, _month_year, 0, 0, ARRAY[_date]);
    ELSE
      UPDATE public.streak_freezes
      SET auto_used_dates = ARRAY(SELECT DISTINCT unnest(COALESCE(auto_used_dates, ARRAY[]::date[]) || ARRAY[_date]))
      WHERE id = _freeze_row.id;
    END IF;

    source := 'purchased';
    remaining_monthly := 0;
    remaining_purchased := _purchased_balance - 1;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Nothing available
  source := 'none';
  remaining_monthly := 0;
  remaining_purchased := 0;
  RETURN NEXT;
END;
$$;