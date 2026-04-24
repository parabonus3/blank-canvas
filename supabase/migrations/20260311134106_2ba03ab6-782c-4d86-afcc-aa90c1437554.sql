
-- 1. Add friend_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS friend_code text UNIQUE;

-- 2. Function to generate unique friend_code
CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  exists_already boolean;
BEGIN
  LOOP
    code := 'TZ-' || upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE friend_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- 3. Trigger to auto-set friend_code on profile insert
CREATE OR REPLACE FUNCTION public.set_friend_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.friend_code IS NULL THEN
    NEW.friend_code := public.generate_friend_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_friend_code_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_friend_code();

-- 4. Backfill existing profiles
UPDATE public.profiles SET friend_code = public.generate_friend_code() WHERE friend_code IS NULL;

-- 5. Create study_rooms table
CREATE TABLE public.study_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  room_type text NOT NULL DEFAULT 'study',
  invite_code text UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6)),
  owner_id uuid NOT NULL,
  max_members integer NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Create room_members table
CREATE TABLE public.room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  total_seconds integer NOT NULL DEFAULT 0,
  is_online boolean NOT NULL DEFAULT false,
  last_active_at timestamptz DEFAULT now(),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- 7. Create room_invitations table
CREATE TABLE public.room_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL,
  invitee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, invitee_id)
);

-- 8. Create room_messages table
CREATE TABLE public.room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Create room_activity_log table
CREATE TABLE public.room_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Helper function to check room membership (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_room_member(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE user_id = _user_id AND room_id = _room_id
  )
$$;

-- 11. Helper function to check room ownership
CREATE OR REPLACE FUNCTION public.is_room_owner(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.study_rooms
    WHERE id = _room_id AND owner_id = _user_id
  )
$$;

-- 12. Enable RLS on all new tables
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_activity_log ENABLE ROW LEVEL SECURITY;

-- 13. RLS for study_rooms
CREATE POLICY "Members can view rooms" ON public.study_rooms
  FOR SELECT TO authenticated
  USING (public.is_room_member(auth.uid(), id) OR owner_id = auth.uid());

CREATE POLICY "Authenticated users can create rooms" ON public.study_rooms
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can update room" ON public.study_rooms
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owner can delete room" ON public.study_rooms
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- 14. RLS for room_members
CREATE POLICY "Members can view room members" ON public.room_members
  FOR SELECT TO authenticated
  USING (public.is_room_member(auth.uid(), room_id));

CREATE POLICY "Owner or system can insert members" ON public.room_members
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      public.is_room_owner(auth.uid(), room_id) OR
      EXISTS (
        SELECT 1 FROM public.room_invitations
        WHERE room_id = room_members.room_id
          AND invitee_id = auth.uid()
          AND status = 'accepted'
      )
    )
  );

CREATE POLICY "Members can update own record" ON public.room_members
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Members can leave or owner can remove" ON public.room_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_room_owner(auth.uid(), room_id));

-- 15. RLS for room_invitations
CREATE POLICY "Users can see their invitations" ON public.room_invitations
  FOR SELECT TO authenticated
  USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

CREATE POLICY "Room members can invite" ON public.room_invitations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = inviter_id AND public.is_room_member(auth.uid(), room_id));

CREATE POLICY "Invitee can update invitation" ON public.room_invitations
  FOR UPDATE TO authenticated
  USING (invitee_id = auth.uid());

CREATE POLICY "Inviter can delete invitation" ON public.room_invitations
  FOR DELETE TO authenticated
  USING (inviter_id = auth.uid());

-- 16. RLS for room_messages
CREATE POLICY "Members can view messages" ON public.room_messages
  FOR SELECT TO authenticated
  USING (public.is_room_member(auth.uid(), room_id));

CREATE POLICY "Members can send messages" ON public.room_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_room_member(auth.uid(), room_id));

CREATE POLICY "Users can delete own messages" ON public.room_messages
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 17. RLS for room_activity_log
CREATE POLICY "Members can view activity" ON public.room_activity_log
  FOR SELECT TO authenticated
  USING (public.is_room_member(auth.uid(), room_id));

CREATE POLICY "Members can insert activity" ON public.room_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_room_member(auth.uid(), room_id));

-- 18. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_invitations;

-- 19. Add profiles SELECT policy for room members to see each other's display_name and friend_code
CREATE POLICY "Room members can view other members profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.room_members rm1
      JOIN public.room_members rm2 ON rm1.room_id = rm2.room_id
      WHERE rm1.user_id = auth.uid() AND rm2.user_id = profiles.user_id
    )
  );
