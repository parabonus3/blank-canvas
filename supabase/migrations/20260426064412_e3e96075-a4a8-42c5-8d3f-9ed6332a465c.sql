-- 1) Trigger to prevent privilege escalation on profiles
CREATE OR REPLACE FUNCTION public.enforce_profile_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can do anything
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Block changes to sensitive/admin-managed columns for regular users
  IF NEW.plan_tier             IS DISTINCT FROM OLD.plan_tier             OR
     NEW.is_banned             IS DISTINCT FROM OLD.is_banned             OR
     NEW.banned_at             IS DISTINCT FROM OLD.banned_at             OR
     NEW.banned_reason         IS DISTINCT FROM OLD.banned_reason         OR
     NEW.last_known_streak     IS DISTINCT FROM OLD.last_known_streak     OR
     NEW.last_streak_rescue_at IS DISTINCT FROM OLD.last_streak_rescue_at OR
     NEW.user_id               IS DISTINCT FROM OLD.user_id               OR
     NEW.friend_code           IS DISTINCT FROM OLD.friend_code           OR
     NEW.trial_ends_at         IS DISTINCT FROM OLD.trial_ends_at
  THEN
    RAISE EXCEPTION 'Only administrators can modify this field';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_update_scope_trg ON public.profiles;
CREATE TRIGGER enforce_profile_update_scope_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_update_scope();

-- 2) Hide password_hash from authenticated clients
REVOKE SELECT (password_hash) ON public.study_rooms FROM authenticated;
REVOKE SELECT (password_hash) ON public.study_rooms FROM anon;