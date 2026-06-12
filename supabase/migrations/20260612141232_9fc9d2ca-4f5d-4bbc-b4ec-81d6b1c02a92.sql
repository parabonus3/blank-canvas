
CREATE OR REPLACE FUNCTION public.admin_set_plan_tier_by_email(_email text, _tier text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _count integer := 0;
BEGIN
  IF _email IS NULL OR _tier IS NULL THEN
    RETURN 0;
  END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF _uid IS NULL THEN
    RETURN 0;
  END IF;
  UPDATE public.profiles SET plan_tier = _tier WHERE user_id = _uid;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_plan_tier_by_email(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_plan_tier_by_email(text, text) TO service_role;
