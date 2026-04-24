
-- Add is_timer_active to room_members
ALTER TABLE public.room_members ADD COLUMN is_timer_active boolean NOT NULL DEFAULT false;

-- Add goal columns to study_rooms
ALTER TABLE public.study_rooms ADD COLUMN goal_hours integer;
ALTER TABLE public.study_rooms ADD COLUMN goal_label text;
