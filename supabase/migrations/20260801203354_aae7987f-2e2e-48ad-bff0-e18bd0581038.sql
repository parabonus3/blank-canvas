CREATE OR REPLACE FUNCTION public.get_my_board_invitations()
RETURNS TABLE (
  id uuid,
  board_id uuid,
  board_title text,
  board_color text,
  inviter_id uuid,
  inviter_name text,
  inviter_avatar text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id,
         i.board_id,
         b.title,
         b.color,
         i.inviter_id,
         p.display_name,
         p.avatar_url,
         i.created_at
  FROM public.board_invitations i
  LEFT JOIN public.boards b ON b.id = i.board_id
  LEFT JOIN public.profiles p ON p.user_id = i.inviter_id
  WHERE i.invitee_id = auth.uid()
    AND i.status = 'pending'
  ORDER BY i.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.get_my_board_invitations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_board_invitations() TO authenticated;