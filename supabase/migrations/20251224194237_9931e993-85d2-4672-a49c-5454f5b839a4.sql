-- Add ambient sound preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ambient_sound TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ambient_volume DECIMAL DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS autoplay_on_timer BOOLEAN DEFAULT false;