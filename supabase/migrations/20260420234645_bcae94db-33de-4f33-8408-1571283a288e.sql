-- ============================================================================
-- Fix 1: Hide study_rooms.invite_code from non-members
-- ============================================================================
REVOKE SELECT (invite_code) ON public.study_rooms FROM anon, authenticated;

GRANT SELECT (
  id, name, description, room_type, owner_id, max_members, is_active,
  created_at, goal_hours, goal_label, pinned_message,
  focus_session_end_at, focus_session_duration, focus_session_started_by,
  focus_session_start_at, is_public, slug, password_hash, rules,
  chat_mode, country
) ON public.study_rooms TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_room_invite_code(_room_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sr.invite_code
  FROM public.study_rooms sr
  WHERE sr.id = _room_id
    AND public.is_room_member(auth.uid(), _room_id)
$$;

REVOKE EXECUTE ON FUNCTION public.get_room_invite_code(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_room_invite_code(uuid) TO authenticated;

-- Strip invite_code from public Explore RPCs
CREATE OR REPLACE FUNCTION public.get_public_rooms_ranking(
  _category text DEFAULT NULL,
  _search text DEFAULT NULL,
  _country text DEFAULT NULL
)
RETURNS TABLE(
  room_id uuid, name text, description text, room_type text,
  invite_code text, member_count bigint, online_count bigint,
  studying_count bigint, total_seconds bigint, goal_hours integer,
  slug text, country text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sr.id, sr.name, sr.description, sr.room_type,
    NULL::text,
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id),
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_online = true),
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_timer_active = true),
    (SELECT COALESCE(SUM(rm.total_seconds), 0)::bigint FROM public.room_members rm WHERE rm.room_id = sr.id),
    sr.goal_hours, sr.slug, sr.country
  FROM public.study_rooms sr
  WHERE sr.is_active = true AND sr.is_public = true
    AND (_category IS NULL OR sr.room_type = _category)
    AND (_search IS NULL OR sr.name ILIKE '%' || _search || '%')
    AND (_country IS NULL OR sr.country = _country)
  ORDER BY (SELECT COALESCE(SUM(rm.total_seconds), 0) FROM public.room_members rm WHERE rm.room_id = sr.id) DESC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.get_public_rooms_ranking_by_period(
  _period text DEFAULT 'all',
  _category text DEFAULT NULL,
  _search text DEFAULT NULL,
  _country text DEFAULT NULL
)
RETURNS TABLE(
  room_id uuid, name text, description text, room_type text,
  invite_code text, member_count bigint, online_count bigint,
  studying_count bigint, total_seconds bigint, period_seconds bigint,
  goal_hours integer, slug text, country text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sr.id, sr.name, sr.description, sr.room_type,
    NULL::text,
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id),
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_online = true),
    (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_timer_active = true),
    (SELECT COALESCE(SUM(rm.total_seconds), 0)::bigint FROM public.room_members rm WHERE rm.room_id = sr.id),
    (
      SELECT COALESCE(SUM(te.duration), 0)::bigint
      FROM public.time_entries te
      WHERE te.user_id IN (SELECT rm2.user_id FROM public.room_members rm2 WHERE rm2.room_id = sr.id)
        AND te.end_time IS NOT NULL
        AND (CASE _period
              WHEN 'today' THEN te.start_time >= CURRENT_DATE
              WHEN 'week' THEN te.start_time >= (CURRENT_DATE - INTERVAL '7 days')
              ELSE true END)
    ),
    sr.goal_hours, sr.slug, sr.country
  FROM public.study_rooms sr
  WHERE sr.is_active = true AND sr.is_public = true
    AND (_category IS NULL OR sr.room_type = _category)
    AND (_search IS NULL OR sr.name ILIKE '%' || _search || '%')
    AND (_country IS NULL OR sr.country = _country)
  ORDER BY
    CASE WHEN _period = 'now' THEN 0 ELSE 1 END,
    CASE WHEN _period = 'now' THEN (SELECT COUNT(*) FROM public.room_members rm WHERE rm.room_id = sr.id AND rm.is_timer_active = true) ELSE 0 END DESC,
    (
      SELECT COALESCE(SUM(te.duration), 0)::bigint
      FROM public.time_entries te
      WHERE te.user_id IN (SELECT rm2.user_id FROM public.room_members rm2 WHERE rm2.room_id = sr.id)
        AND te.end_time IS NOT NULL
        AND (CASE _period
              WHEN 'today' THEN te.start_time >= CURRENT_DATE
              WHEN 'week' THEN te.start_time >= (CURRENT_DATE - INTERVAL '7 days')
              ELSE true END)
    ) DESC
  LIMIT 50;
$$;

-- ============================================================================
-- Fix 2: Block role self-promotion in room_members
-- ============================================================================
DROP POLICY IF EXISTS "Members can update own record" ON public.room_members;

-- Helper: returns the current role of a member row (SECURITY DEFINER avoids recursion)
CREATE OR REPLACE FUNCTION public.get_member_current_role(_member_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.room_members WHERE id = _member_id
$$;

CREATE POLICY "Members can update own non-role fields"
ON public.room_members
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role = public.get_member_current_role(id)
);

-- ============================================================================
-- Fix 3: RLS on realtime.messages
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can subscribe to allowed channels" ON realtime.messages;

CREATE POLICY "Authenticated users can subscribe to allowed channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    -- Room channels: room-members-, room-messages-, room-focus-, room-activity-, typing-
    WHEN realtime.topic() ~ '^(room-members-|room-messages-|room-focus-|room-activity-|typing-)[0-9a-f-]{36}$' THEN
      public.is_room_member(
        auth.uid(),
        (regexp_match(realtime.topic(), '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'))[1]::uuid
      )

    -- DM notifications: only the owner
    WHEN realtime.topic() LIKE 'dm-notifications-%' THEN
      realtime.topic() = 'dm-notifications-' || auth.uid()::text

    -- DM conversation: dm-{uuidA}-{uuidB} — either party
    WHEN realtime.topic() ~ '^dm-[0-9a-f-]{36}-[0-9a-f-]{36}$' THEN
      position(auth.uid()::text in realtime.topic()) > 0

    -- Invitations: only the owner
    WHEN realtime.topic() LIKE 'invitations-%' THEN
      realtime.topic() = 'invitations-' || auth.uid()::text

    -- Ticket replies: owner or support agent
    WHEN realtime.topic() LIKE 'ticket-replies-%' THEN
      EXISTS (
        SELECT 1 FROM public.support_tickets st
        WHERE st.id::text = substring(realtime.topic() FROM 'ticket-replies-(.+)')
          AND (st.user_id = auth.uid() OR public.is_support_agent(auth.uid()))
      )

    -- SAC dashboard: only support agents
    WHEN realtime.topic() = 'sac-dashboard-realtime' THEN
      public.is_support_agent(auth.uid())

    -- Friendships: any authenticated user
    WHEN realtime.topic() = 'friendships-realtime' THEN
      auth.uid() IS NOT NULL

    ELSE false
  END
);