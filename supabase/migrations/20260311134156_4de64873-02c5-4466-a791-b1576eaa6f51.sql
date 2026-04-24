
-- Drop the problematic policy (room members viewing other profiles)
DROP POLICY IF EXISTS "Room members can view other members profiles" ON public.profiles;

-- Create a security definer function to get room member profiles
CREATE OR REPLACE FUNCTION public.get_room_member_profiles(_room_id uuid)
RETURNS TABLE(user_id uuid, display_name text, friend_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.friend_code
  FROM public.profiles p
  JOIN public.room_members rm ON rm.user_id = p.user_id
  WHERE rm.room_id = _room_id
$$;

-- Function to find user by friend_code (for invitations)
CREATE OR REPLACE FUNCTION public.find_user_by_friend_code(_code text)
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name
  FROM public.profiles p
  WHERE p.friend_code = _code
  LIMIT 1
$$;

-- Function to get room by invite_code (public lookup)
CREATE OR REPLACE FUNCTION public.find_room_by_invite_code(_code text)
RETURNS TABLE(id uuid, name text, room_type text, owner_id uuid, member_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sr.id, sr.name, sr.room_type, sr.owner_id,
    (SELECT COUNT(*) FROM public.room_members WHERE room_id = sr.id) as member_count
  FROM public.study_rooms sr
  WHERE sr.invite_code = _code AND sr.is_active = true
  LIMIT 1
$$;
