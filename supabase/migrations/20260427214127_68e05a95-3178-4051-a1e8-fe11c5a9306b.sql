-- =========================================================
-- 1. study_rooms: esconder invite_code e password_hash
-- =========================================================

-- View segura: tudo de study_rooms exceto invite_code e password_hash
CREATE OR REPLACE VIEW public.study_rooms_safe
WITH (security_invoker = true) AS
SELECT
  id, owner_id, name, description, room_type,
  max_members, is_active, is_public, chat_mode,
  rules, country, slug, pinned_message,
  goal_hours, goal_label,
  focus_session_end_at, focus_session_duration,
  focus_session_start_at, focus_session_started_by,
  created_at
FROM public.study_rooms;

GRANT SELECT ON public.study_rooms_safe TO authenticated, anon;

-- RPC: salas do usuário com member_count, sem invite_code/password_hash
CREATE OR REPLACE FUNCTION public.get_my_rooms()
RETURNS TABLE (
  id uuid, owner_id uuid, name text, description text, room_type text,
  max_members integer, is_active boolean, is_public boolean, chat_mode text,
  rules text, country text, slug text, pinned_message text,
  goal_hours integer, goal_label text,
  focus_session_end_at timestamptz, focus_session_duration integer,
  focus_session_started_by uuid,
  created_at timestamptz, member_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sr.id, sr.owner_id, sr.name, sr.description, sr.room_type,
    sr.max_members, sr.is_active, sr.is_public, sr.chat_mode,
    sr.rules, sr.country, sr.slug, sr.pinned_message,
    sr.goal_hours, sr.goal_label,
    sr.focus_session_end_at, sr.focus_session_duration,
    sr.focus_session_started_by,
    sr.created_at,
    (SELECT COUNT(*) FROM public.room_members rm2 WHERE rm2.room_id = sr.id) AS member_count
  FROM public.study_rooms sr
  WHERE sr.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = sr.id AND rm.user_id = auth.uid()
    )
  ORDER BY sr.created_at DESC;
$$;

-- Endurecer get_room_invite_code: apenas owner ou moderator
CREATE OR REPLACE FUNCTION public.get_room_invite_code(_room_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sr.invite_code
  FROM public.study_rooms sr
  WHERE sr.id = _room_id
    AND (
      sr.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.room_members rm
        WHERE rm.room_id = _room_id
          AND rm.user_id = auth.uid()
          AND rm.role IN ('owner','moderator')
      )
    )
$$;

-- Revogar leitura direta das colunas sensíveis na tabela base
REVOKE SELECT (invite_code, password_hash) ON public.study_rooms FROM anon, authenticated;

-- =========================================================
-- 2. room_members: WITH CHECK explícito para owner/mod policy
-- =========================================================

DROP POLICY IF EXISTS "Owner or mod can update members" ON public.room_members;

CREATE POLICY "Owner or mod can update members"
ON public.room_members
FOR UPDATE
TO authenticated
USING (
  public.is_room_owner(auth.uid(), room_id)
  OR EXISTS (
    SELECT 1 FROM public.room_members rm2
    WHERE rm2.room_id = room_members.room_id
      AND rm2.user_id = auth.uid()
      AND rm2.role = 'moderator'
  )
)
WITH CHECK (
  -- Dono pode atualizar qualquer membro, mas não pode alterar a si mesmo via esta policy
  -- (a sua atualização cai na policy "Members can update own non-role fields")
  public.is_room_owner(auth.uid(), room_id)
  OR (
    EXISTS (
      SELECT 1 FROM public.room_members rm2
      WHERE rm2.room_id = room_members.room_id
        AND rm2.user_id = auth.uid()
        AND rm2.role = 'moderator'
    )
    AND role IN ('member','moderator')   -- mod nunca pode promover ninguém a owner
    AND user_id <> auth.uid()             -- mod não pode editar a si mesmo
  )
);

-- =========================================================
-- 3. SECURITY DEFINER: revogar EXECUTE de PUBLIC/anon
-- =========================================================

-- Funções que devem permanecer chamáveis por anon (preview público)
-- get_room_public_preview, find_room_by_invite_code, get_public_rooms_ranking, get_public_rooms_ranking_by_period
-- Essas mantêm GRANT a anon e authenticated.

-- Helper para revogar de PUBLIC/anon e conceder a authenticated
DO $$
DECLARE
  fn_signature text;
  authenticated_only text[] := ARRAY[
    'public.join_room_by_invite_code(text, text)',
    'public.join_public_room(uuid, text)',
    'public.create_room_with_password(text, text, text, boolean, text, text, text)',
    'public.kick_room_member(uuid, uuid)',
    'public.set_member_role(uuid, uuid, text)',
    'public.toggle_mute_member(uuid, uuid, boolean)',
    'public.update_room_password(uuid, text)',
    'public.consume_streak_freeze(date)',
    'public.refresh_last_known_streak()',
    'public.check_and_grant_streak_rescue()',
    'public.create_note_folder(text, text, text)',
    'public.verify_folder_password(uuid, text)',
    'public.update_folder_password(uuid, text, text)',
    'public.get_room_invite_code(uuid)',
    'public.get_my_rooms()',
    'public.get_member_profile_stats(uuid, uuid)',
    'public.get_room_ranking_by_period(uuid, text)',
    'public.get_room_daily_progress(uuid, text)',
    'public.get_room_activity_heatmap(uuid)',
    'public.get_room_streak(uuid)',
    'public.get_room_members_streaks(uuid)',
    'public.get_member_room_streak(uuid)',
    'public.get_member_best_session(uuid)',
    'public.get_room_member_profiles(uuid)',
    'public.get_member_public_stats(uuid)',
    'public.get_friend_progress(uuid)',
    'public.find_user_by_friend_code(text)',
    'public.is_room_member(uuid, uuid)',
    'public.is_room_owner(uuid, uuid)',
    'public.has_role(uuid, public.app_role)',
    'public.is_support_agent(uuid)',
    'public.is_support_admin(uuid)',
    'public.get_member_current_role(uuid)',
    'public.room_has_password(uuid)',
    'public.get_global_user_ranking(text)'
  ];
  fully_internal text[] := ARRAY[
    'public.handle_new_user()',
    'public.set_friend_code()',
    'public.update_updated_at_column()',
    'public.generate_friend_code()',
    'public.enforce_profile_update_scope()',
    'public.enforce_room_member_update_scope()',
    'public.enforce_room_member_role_change()',
    'public.credit_purchased_freezes(uuid, integer)'
  ];
  public_anon text[] := ARRAY[
    'public.get_room_public_preview(text)',
    'public.find_room_by_invite_code(text)',
    'public.get_public_rooms_ranking(text, text, text)',
    'public.get_public_rooms_ranking_by_period(text, text, text, text)'
  ];
BEGIN
  FOREACH fn_signature IN ARRAY authenticated_only LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn_signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn_signature);
  END LOOP;

  FOREACH fn_signature IN ARRAY fully_internal LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn_signature);
  END LOOP;

  FOREACH fn_signature IN ARRAY public_anon LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', fn_signature);
  END LOOP;
END $$;

-- =========================================================
-- 4. support_tickets: substituir WITH CHECK (true) por validações
-- =========================================================

DROP POLICY IF EXISTS "Anyone can create tickets" ON public.support_tickets;

CREATE POLICY "Anyone can create tickets"
ON public.support_tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(subject))  BETWEEN 3  AND 200
  AND length(btrim(message)) BETWEEN 10 AND 5000
  AND email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  AND status = 'open'
  AND priority IN ('low','normal','high','urgent')
  AND assigned_to IS NULL
  AND (
    auth.uid() IS NULL
    OR user_id = auth.uid()
    OR user_id IS NULL
  )
);