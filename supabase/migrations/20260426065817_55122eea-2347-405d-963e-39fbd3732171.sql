-- Prevent role escalation via direct UPDATE on room_members.
-- Only the room owner may change a member's role, and even then only through controlled paths.
CREATE OR REPLACE FUNCTION public.enforce_room_member_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller uuid := auth.uid();
  _is_owner boolean;
BEGIN
  -- If role is unchanged, allow.
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  -- Service role / no auth context: allow (used by SECURITY DEFINER functions).
  IF _caller IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only the room owner may change roles via direct UPDATE.
  SELECT public.is_room_owner(_caller, NEW.room_id) INTO _is_owner;
  IF NOT _is_owner THEN
    RAISE EXCEPTION 'Only the room owner can change member roles';
  END IF;

  -- Even owners cannot promote anyone to 'owner' via UPDATE, and cannot demote the existing owner.
  IF NEW.role = 'owner' OR OLD.role = 'owner' THEN
    RAISE EXCEPTION 'Ownership cannot be transferred via this operation';
  END IF;

  -- Restrict role values to known, safe set.
  IF NEW.role NOT IN ('member', 'moderator') THEN
    RAISE EXCEPTION 'Invalid role value';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_room_member_role_change_trg ON public.room_members;
CREATE TRIGGER enforce_room_member_role_change_trg
BEFORE UPDATE ON public.room_members
FOR EACH ROW
EXECUTE FUNCTION public.enforce_room_member_role_change();