
DROP FUNCTION IF EXISTS public.get_room_member_profiles(uuid);

CREATE FUNCTION public.get_room_member_profiles(_room_id uuid)
 RETURNS TABLE(user_id uuid, display_name text, friend_code text, avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.display_name, p.friend_code, p.avatar_url
  FROM public.profiles p
  JOIN public.room_members rm ON rm.user_id = p.user_id
  WHERE rm.room_id = _room_id
$$;
