-- Replace the overly-broad "Members can update focus session" policy with a
-- column-restricted version implemented via a trigger, since Postgres RLS
-- cannot enforce per-column USING/WITH CHECK directly.

DROP POLICY IF EXISTS "Members can update focus session" ON public.study_rooms;

-- Recreate the policy but enforce that ONLY focus-session columns may change
-- when the caller is a member but not the owner. Owner updates are handled by
-- the existing "Owner can update room" policy.
CREATE POLICY "Members can update focus session fields"
ON public.study_rooms
FOR UPDATE
TO authenticated
USING (public.is_room_member(auth.uid(), id) AND auth.uid() <> owner_id)
WITH CHECK (public.is_room_member(auth.uid(), id) AND auth.uid() <> owner_id);

-- Trigger function: if the updater is not the owner, only allow changes to
-- focus-session columns. Block changes to anything else (password_hash,
-- invite_code, owner_id, is_public, max_members, chat_mode, name, etc.).
CREATE OR REPLACE FUNCTION public.enforce_room_member_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Owner (or service role) can update anything.
  IF auth.uid() IS NULL OR auth.uid() = OLD.owner_id THEN
    RETURN NEW;
  END IF;

  -- Non-owner members: ensure no protected column was modified.
  IF NEW.owner_id              IS DISTINCT FROM OLD.owner_id              OR
     NEW.name                  IS DISTINCT FROM OLD.name                  OR
     NEW.description           IS DISTINCT FROM OLD.description           OR
     NEW.room_type             IS DISTINCT FROM OLD.room_type             OR
     NEW.invite_code           IS DISTINCT FROM OLD.invite_code           OR
     NEW.max_members           IS DISTINCT FROM OLD.max_members           OR
     NEW.is_active             IS DISTINCT FROM OLD.is_active             OR
     NEW.is_public             IS DISTINCT FROM OLD.is_public             OR
     NEW.password_hash         IS DISTINCT FROM OLD.password_hash         OR
     NEW.chat_mode             IS DISTINCT FROM OLD.chat_mode             OR
     NEW.rules                 IS DISTINCT FROM OLD.rules                 OR
     NEW.country               IS DISTINCT FROM OLD.country               OR
     NEW.slug                  IS DISTINCT FROM OLD.slug                  OR
     NEW.pinned_message        IS DISTINCT FROM OLD.pinned_message        OR
     NEW.goal_hours            IS DISTINCT FROM OLD.goal_hours            OR
     NEW.goal_label            IS DISTINCT FROM OLD.goal_label
  THEN
    RAISE EXCEPTION 'Only the room owner can modify this field';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_room_member_update_scope_trg ON public.study_rooms;
CREATE TRIGGER enforce_room_member_update_scope_trg
BEFORE UPDATE ON public.study_rooms
FOR EACH ROW
EXECUTE FUNCTION public.enforce_room_member_update_scope();