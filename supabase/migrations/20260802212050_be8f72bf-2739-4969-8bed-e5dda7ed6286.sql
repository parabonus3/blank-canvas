-- 1) Limpeza das linhas que travam o unique (board_id, invitee_id, status)
DELETE FROM public.board_invitations WHERE status IN ('cancelled','rejected');

-- 2) Recusar convite (pelo convidado) -> DELETE
CREATE OR REPLACE FUNCTION public.reject_board_invitation(_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _u uuid := auth.uid(); _inv record;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _inv FROM public.board_invitations WHERE id = _invitation_id FOR UPDATE;
  IF _inv.id IS NULL THEN RETURN; END IF;
  IF _inv.invitee_id <> _u THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.board_invitations WHERE id = _invitation_id;
END; $$;

REVOKE ALL ON FUNCTION public.reject_board_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_board_invitation(uuid) TO authenticated;

-- 3) Cancelar convite (pelo dono do quadro) -> DELETE
CREATE OR REPLACE FUNCTION public.cancel_board_invitation(_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _u uuid := auth.uid(); _inv record;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _inv FROM public.board_invitations WHERE id = _invitation_id FOR UPDATE;
  IF _inv.id IS NULL THEN RETURN; END IF;
  IF NOT public.is_board_owner(_inv.board_id, _u) AND _inv.inviter_id <> _u THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.board_invitations WHERE id = _invitation_id;
END; $$;

REVOKE ALL ON FUNCTION public.cancel_board_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_board_invitation(uuid) TO authenticated;

-- 4) Push do convite de quadro passa a incluir o avatar de quem convidou
CREATE OR REPLACE FUNCTION public.tg_notify_board_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_name text; v_avatar text; v_title text;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  SELECT display_name, avatar_url INTO v_name, v_avatar FROM public.profiles WHERE user_id = NEW.inviter_id;
  SELECT title INTO v_title FROM public.boards WHERE id = NEW.board_id;
  PERFORM public.dispatch_push(
    NEW.invitee_id, 'board_invite',
    jsonb_build_object(
      'friend_name', COALESCE(v_name, '—'),
      'board_title', COALESCE(v_title, '—'),
      'actor_avatar', v_avatar
    ),
    '/tasks');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW; END; $$;