
-- 1. Function to join room by invite code (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.join_room_by_invite_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _room_id uuid;
  _user_id uuid := auth.uid();
  _already_member boolean;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find room
  SELECT id INTO _room_id FROM public.study_rooms
  WHERE invite_code = upper(_code) AND is_active = true;

  IF _room_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Check if already member
  SELECT EXISTS(
    SELECT 1 FROM public.room_members WHERE room_id = _room_id AND user_id = _user_id
  ) INTO _already_member;

  IF _already_member THEN
    RAISE EXCEPTION 'Already a member';
  END IF;

  -- Insert member
  INSERT INTO public.room_members (room_id, user_id, role)
  VALUES (_room_id, _user_id, 'member');

  -- Log activity
  INSERT INTO public.room_activity_log (room_id, user_id, action_type)
  VALUES (_room_id, _user_id, 'member_joined');

  RETURN _room_id;
END;
$$;

-- 2. Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies for avatars bucket
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

-- 4. Add is_stats_public to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_stats_public boolean NOT NULL DEFAULT false;

-- 5. Add status_text to room_members
ALTER TABLE public.room_members ADD COLUMN IF NOT EXISTS status_text text;
