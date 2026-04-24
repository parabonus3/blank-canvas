
CREATE OR REPLACE FUNCTION public.update_room_password(_room_id uuid, _password text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid := auth.uid();
BEGIN
  IF _caller_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Only owner can change password
  IF NOT is_room_owner(_caller_id, _room_id) THEN
    RAISE EXCEPTION 'Only the room owner can change the password';
  END IF;

  IF _password IS NOT NULL AND length(_password) > 0 THEN
    UPDATE public.study_rooms 
    SET password_hash = crypt(_password, gen_salt('bf')),
        is_public = false
    WHERE id = _room_id;
  ELSE
    UPDATE public.study_rooms 
    SET password_hash = NULL
    WHERE id = _room_id;
  END IF;
END;
$$;
