CREATE OR REPLACE FUNCTION public.invite_to_board_by_user(_board_id uuid, _user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _u uuid := auth.uid(); _inv_id uuid;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_board_owner(_board_id, _u) THEN RAISE EXCEPTION 'Only owner can invite'; END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF _user_id = _u THEN RAISE EXCEPTION 'Cannot invite yourself'; END IF;
  IF EXISTS (SELECT 1 FROM public.board_members WHERE board_id = _board_id AND user_id = _user_id) THEN
    RAISE EXCEPTION 'Already a member';
  END IF;
  INSERT INTO public.board_invitations (board_id, inviter_id, invitee_id, status)
    VALUES (_board_id, _u, _user_id, 'pending')
    ON CONFLICT (board_id, invitee_id, status) DO UPDATE SET updated_at = now()
    RETURNING id INTO _inv_id;
  RETURN _inv_id;
END; $function$;

REVOKE ALL ON FUNCTION public.invite_to_board_by_user(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_to_board_by_user(uuid, uuid) TO authenticated;