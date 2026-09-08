-- =========================================
-- ACCESS CODES / PLAN GRANTS
-- =========================================

CREATE TABLE public.access_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL,
  plan_tier text NOT NULL,
  duration_days integer NOT NULL,
  code_type text NOT NULL DEFAULT 'shared',
  max_redemptions integer,
  redemption_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  partner_name text,
  campaign text,
  notes text,
  batch_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_codes_plan_tier_chk CHECK (plan_tier IN ('pro','premium')),
  CONSTRAINT access_codes_type_chk CHECK (code_type IN ('shared','single')),
  CONSTRAINT access_codes_duration_chk CHECK (duration_days > 0 AND duration_days <= 3650),
  CONSTRAINT access_codes_max_chk CHECK (max_redemptions IS NULL OR max_redemptions > 0)
);

CREATE UNIQUE INDEX access_codes_code_key ON public.access_codes (upper(code));
CREATE INDEX access_codes_batch_idx ON public.access_codes (batch_id);
CREATE INDEX access_codes_partner_idx ON public.access_codes (partner_name);

GRANT ALL ON public.access_codes TO service_role;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view access codes"
  ON public.access_codes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================

CREATE TABLE public.plan_grants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plan_tier text NOT NULL,
  source text NOT NULL DEFAULT 'access_code',
  access_code_id uuid REFERENCES public.access_codes(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_grants_plan_tier_chk CHECK (plan_tier IN ('pro','premium')),
  CONSTRAINT plan_grants_source_chk CHECK (source IN ('access_code','admin','partner'))
);

CREATE INDEX plan_grants_user_idx ON public.plan_grants (user_id, expires_at DESC);
CREATE UNIQUE INDEX plan_grants_active_tier_key
  ON public.plan_grants (user_id, plan_tier)
  WHERE revoked_at IS NULL AND source = 'access_code';

GRANT SELECT ON public.plan_grants TO authenticated;
GRANT ALL ON public.plan_grants TO service_role;
ALTER TABLE public.plan_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plan grants"
  ON public.plan_grants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =========================================

CREATE TABLE public.access_code_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_code_id uuid NOT NULL REFERENCES public.access_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  plan_tier text NOT NULL,
  granted_days integer NOT NULL,
  access_starts_at timestamptz NOT NULL,
  access_ends_at timestamptz NOT NULL,
  plan_grant_id uuid REFERENCES public.plan_grants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_code_redemptions_unique UNIQUE (access_code_id, user_id)
);

CREATE INDEX access_code_redemptions_user_idx ON public.access_code_redemptions (user_id);
CREATE INDEX access_code_redemptions_created_idx ON public.access_code_redemptions (created_at DESC);

GRANT SELECT ON public.access_code_redemptions TO authenticated;
GRANT ALL ON public.access_code_redemptions TO service_role;
ALTER TABLE public.access_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own redemptions"
  ON public.access_code_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- updated_at triggers (reuses existing helper)
CREATE TRIGGER update_access_codes_updated_at
  BEFORE UPDATE ON public.access_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plan_grants_updated_at
  BEFORE UPDATE ON public.plan_grants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- Concessão vigente (usada pela verificação de plano)
-- =========================================
CREATE OR REPLACE FUNCTION public.get_effective_plan_grant(_user_id uuid)
RETURNS TABLE (plan_tier text, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg.plan_tier, pg.expires_at
  FROM public.plan_grants pg
  WHERE pg.user_id = _user_id
    AND pg.revoked_at IS NULL
    AND pg.expires_at > now()
    AND pg.starts_at <= now()
  ORDER BY CASE pg.plan_tier WHEN 'premium' THEN 2 WHEN 'pro' THEN 1 ELSE 0 END DESC,
           pg.expires_at DESC
  LIMIT 1
$$;

-- =========================================
-- Resgate de código (atômico)
-- =========================================
CREATE OR REPLACE FUNCTION public.redeem_access_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_code public.access_codes;
  v_existing public.plan_grants;
  v_start timestamptz;
  v_end timestamptz;
  v_grant_id uuid;
  v_normalized text;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  v_normalized := upper(btrim(coalesce(_code, '')));
  IF v_normalized = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  SELECT * INTO v_code
  FROM public.access_codes
  WHERE upper(code) = v_normalized
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF NOT v_code.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_disabled');
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_expired');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.access_code_redemptions
    WHERE access_code_id = v_code.id AND user_id = v_user
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_redeemed');
  END IF;

  IF v_code.code_type = 'single' AND v_code.redemption_count >= 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_exhausted');
  END IF;

  IF v_code.max_redemptions IS NOT NULL AND v_code.redemption_count >= v_code.max_redemptions THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_exhausted');
  END IF;

  -- Concessão existente do mesmo plano por código: soma o tempo
  SELECT * INTO v_existing
  FROM public.plan_grants
  WHERE user_id = v_user
    AND plan_tier = v_code.plan_tier
    AND source = 'access_code'
    AND revoked_at IS NULL
  FOR UPDATE;

  IF FOUND THEN
    v_start := LEAST(v_existing.starts_at, now());
    v_end := GREATEST(v_existing.expires_at, now()) + make_interval(days => v_code.duration_days);
    UPDATE public.plan_grants
    SET starts_at = v_start,
        expires_at = v_end,
        access_code_id = v_code.id,
        updated_at = now()
    WHERE id = v_existing.id;
    v_grant_id := v_existing.id;
  ELSE
    v_start := now();
    v_end := now() + make_interval(days => v_code.duration_days);
    INSERT INTO public.plan_grants (user_id, plan_tier, source, access_code_id, starts_at, expires_at)
    VALUES (v_user, v_code.plan_tier, 'access_code', v_code.id, v_start, v_end)
    RETURNING id INTO v_grant_id;
  END IF;

  INSERT INTO public.access_code_redemptions (
    access_code_id, user_id, plan_tier, granted_days, access_starts_at, access_ends_at, plan_grant_id
  ) VALUES (
    v_code.id, v_user, v_code.plan_tier, v_code.duration_days, v_start, v_end, v_grant_id
  );

  UPDATE public.access_codes
  SET redemption_count = redemption_count + 1,
      is_active = CASE
        WHEN code_type = 'single' THEN false
        WHEN max_redemptions IS NOT NULL AND redemption_count + 1 >= max_redemptions THEN false
        ELSE is_active
      END,
      updated_at = now()
  WHERE id = v_code.id;

  RETURN jsonb_build_object(
    'success', true,
    'plan_tier', v_code.plan_tier,
    'granted_days', v_code.duration_days,
    'access_ends_at', v_end,
    'partner_name', v_code.partner_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_access_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_plan_grant(uuid) TO authenticated, service_role;