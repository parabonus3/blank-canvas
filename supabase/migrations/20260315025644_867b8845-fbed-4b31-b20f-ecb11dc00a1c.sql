
-- 1. Add timer_started_at to track real session time
ALTER TABLE public.room_members ADD COLUMN timer_started_at timestamptz DEFAULT NULL;

-- 2. Activity reactions table
CREATE TABLE public.activity_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.room_activity_log(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(activity_id, user_id, emoji)
);

ALTER TABLE public.activity_reactions ENABLE ROW LEVEL SECURITY;

-- RLS: members can view reactions for activities they can see
CREATE POLICY "Members can view reactions" ON public.activity_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.room_activity_log ral
      WHERE ral.id = activity_reactions.activity_id
        AND is_room_member(auth.uid(), ral.room_id)
    )
  );

CREATE POLICY "Members can add reactions" ON public.activity_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.room_activity_log ral
      WHERE ral.id = activity_reactions.activity_id
        AND is_room_member(auth.uid(), ral.room_id)
    )
  );

CREATE POLICY "Users can remove own reactions" ON public.activity_reactions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_reactions;

-- 3. RPC for room daily progress (sum time_entries.duration for room members today)
CREATE OR REPLACE FUNCTION public.get_room_daily_progress(_room_id uuid)
RETURNS TABLE(total_seconds_today bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(te.duration), 0)::bigint AS total_seconds_today
  FROM public.time_entries te
  WHERE te.user_id IN (
    SELECT rm.user_id FROM public.room_members rm WHERE rm.room_id = _room_id
  )
  AND te.end_time IS NOT NULL
  AND te.start_time >= CURRENT_DATE
$$;

-- 4. RPC for individual member streak in a room context
CREATE OR REPLACE FUNCTION public.get_member_room_streak(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _streak integer := 0;
  _check_date date := CURRENT_DATE;
  _has_activity boolean;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.time_entries te
      WHERE te.user_id = _user_id
        AND te.end_time IS NOT NULL
        AND te.start_time::date = _check_date
    ) INTO _has_activity;

    IF NOT _has_activity AND _check_date < CURRENT_DATE THEN
      EXIT;
    END IF;

    IF _has_activity THEN
      _streak := _streak + 1;
    END IF;

    _check_date := _check_date - 1;

    IF _streak > 365 THEN EXIT; END IF;
  END LOOP;

  RETURN _streak;
END;
$$;

-- 5. RPC for member best session
CREATE OR REPLACE FUNCTION public.get_member_best_session(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(MAX(te.duration), 0)::integer
  FROM public.time_entries te
  WHERE te.user_id = _user_id
    AND te.end_time IS NOT NULL
$$;
