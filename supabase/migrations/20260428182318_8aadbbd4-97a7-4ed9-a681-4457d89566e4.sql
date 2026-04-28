
-- Fix 1: Hide Stripe identifiers from clients (frontend never reads them)
REVOKE SELECT (stripe_session_id, stripe_payment_intent)
  ON public.streak_freeze_purchases FROM authenticated, anon;

-- Fix 2: Persistent email rate limit table
CREATE TABLE IF NOT EXISTS public.email_rate_limits (
  email text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (edge function) reads/writes.

-- Fix 3: Block role escalation in room_members (RESTRICTIVE policy AND'd with permissives)
DROP POLICY IF EXISTS "Block role escalation" ON public.room_members;
CREATE POLICY "Block role escalation"
ON public.room_members
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  -- Either the role is unchanged...
  role = public.get_member_current_role(id)
  OR (
    -- ...or the actor is the room owner promoting/demoting someone else to a safe role
    public.is_room_owner(auth.uid(), room_id)
    AND role IN ('member', 'moderator')
    AND user_id <> auth.uid()
  )
);

-- Fix 4: Revoke stop_time_entry from anon
REVOKE EXECUTE ON FUNCTION public.stop_time_entry(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.stop_time_entry(uuid) TO authenticated;
