
-- Add focus session columns to study_rooms
ALTER TABLE public.study_rooms
  ADD COLUMN IF NOT EXISTS focus_session_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS focus_session_duration integer,
  ADD COLUMN IF NOT EXISTS focus_session_started_by uuid;

-- Allow any member to start focus sessions (update focus_session fields)
CREATE POLICY "Members can update focus session"
ON public.study_rooms
FOR UPDATE
TO authenticated
USING (is_room_member(auth.uid(), id))
WITH CHECK (is_room_member(auth.uid(), id));

-- Create RPC to get member public stats (respects is_stats_public)
CREATE OR REPLACE FUNCTION public.get_member_public_stats(_user_id uuid)
RETURNS TABLE(
  display_name text,
  avatar_url text,
  total_seconds bigint,
  is_stats_public boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.display_name,
    p.avatar_url,
    COALESCE(SUM(te.duration), 0)::bigint AS total_seconds,
    p.is_stats_public
  FROM public.profiles p
  LEFT JOIN public.time_entries te ON te.user_id = p.user_id AND te.end_time IS NOT NULL
  WHERE p.user_id = _user_id
  GROUP BY p.display_name, p.avatar_url, p.is_stats_public
$$;

-- Enable realtime for study_rooms (for focus session sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_rooms;
