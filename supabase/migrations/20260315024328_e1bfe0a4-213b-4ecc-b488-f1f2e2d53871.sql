
-- Room achievements table
CREATE TABLE public.room_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  achievement_type text NOT NULL,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (room_id, achievement_type)
);

ALTER TABLE public.room_achievements ENABLE ROW LEVEL SECURITY;

-- Members can view room achievements
CREATE POLICY "Members can view room achievements"
  ON public.room_achievements FOR SELECT
  TO authenticated
  USING (is_room_member(auth.uid(), room_id));

-- System/members can insert achievements
CREATE POLICY "Members can insert room achievements"
  ON public.room_achievements FOR INSERT
  TO authenticated
  WITH CHECK (is_room_member(auth.uid(), room_id));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_achievements;
