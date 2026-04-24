
-- Add country column to study_rooms
ALTER TABLE public.study_rooms ADD COLUMN country text DEFAULT NULL;

-- Update create_room_with_password to accept _country
CREATE OR REPLACE FUNCTION public.create_room_with_password(
  _name text, _description text, _room_type text, _is_public boolean,
  _password text DEFAULT NULL, _rules text DEFAULT NULL, _country text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _room_id uuid;
  _hash text;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF _password IS NOT NULL AND length(_password) > 0 THEN
    _hash := crypt(_password, gen_salt('bf'));
  END IF;

  INSERT INTO public.study_rooms (name, description, room_type, owner_id, is_public, password_hash, rules, country)
  VALUES (_name, _description, _room_type, _user_id, _is_public, _hash, _rules, _country)
  RETURNING id INTO _room_id;

  INSERT INTO public.room_members (room_id, user_id, role) VALUES (_room_id, _user_id, 'owner');
  INSERT INTO public.room_activity_log (room_id, user_id, action_type) VALUES (_room_id, _user_id, 'room_created');

  RETURN _room_id;
END;
$$;

-- Update get_public_rooms_ranking with search and country filters
CREATE OR REPLACE FUNCTION public.get_public_rooms_ranking(
  _category text DEFAULT NULL,
  _search text DEFAULT NULL,
  _country text DEFAULT NULL
)
RETURNS TABLE(room_id uuid, name text, description text, room_type text, invite_code text, member_count bigint, online_count bigint, total_seconds bigint, goal_hours integer, slug text, country text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    sr.id AS room_id,
    sr.name,
    sr.description,
    sr.room_type,
    sr.invite_code,
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id) AS member_count,
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_online = true) AS online_count,
    (SELECT COALESCE(SUM(rm.total_seconds), 0)::bigint FROM public.room_members rm WHERE rm.room_id = sr.id) AS total_seconds,
    sr.goal_hours,
    sr.slug,
    sr.country
  FROM public.study_rooms sr
  WHERE sr.is_active = true AND sr.is_public = true
    AND (_category IS NULL OR sr.room_type = _category)
    AND (_search IS NULL OR sr.name ILIKE '%' || _search || '%')
    AND (_country IS NULL OR sr.country = _country)
  ORDER BY total_seconds DESC
  LIMIT 50;
$$;
