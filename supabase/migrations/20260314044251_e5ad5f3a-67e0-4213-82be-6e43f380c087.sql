
-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add moderation columns to study_rooms
ALTER TABLE public.study_rooms
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS rules text,
  ADD COLUMN IF NOT EXISTS chat_mode text NOT NULL DEFAULT 'open';

-- Add moderation columns to room_members
ALTER TABLE public.room_members
  ADD COLUMN IF NOT EXISTS is_muted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true;

-- RLS: Allow owner/mod to update any member (for mute/role changes)
CREATE POLICY "Owner or mod can update members"
ON public.room_members
FOR UPDATE
TO authenticated
USING (
  is_room_owner(auth.uid(), room_id)
  OR EXISTS (
    SELECT 1 FROM public.room_members rm2
    WHERE rm2.room_id = room_members.room_id
      AND rm2.user_id = auth.uid()
      AND rm2.role = 'moderator'
  )
);

-- Kick member RPC
CREATE OR REPLACE FUNCTION public.kick_room_member(_room_id uuid, _member_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _caller_role text;
BEGIN
  IF _caller_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _member_user_id = _caller_id THEN RAISE EXCEPTION 'Cannot kick yourself'; END IF;

  -- Check caller is owner or moderator
  SELECT role INTO _caller_role FROM public.room_members
  WHERE room_id = _room_id AND user_id = _caller_id;

  IF _caller_role IS NULL OR _caller_role NOT IN ('owner', 'moderator') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Moderators cannot kick other moderators or the owner
  IF _caller_role = 'moderator' THEN
    DECLARE _target_role text;
    BEGIN
      SELECT role INTO _target_role FROM public.room_members
      WHERE room_id = _room_id AND user_id = _member_user_id;
      IF _target_role IN ('owner', 'moderator') THEN
        RAISE EXCEPTION 'Cannot kick owner or moderator';
      END IF;
    END;
  END IF;

  DELETE FROM public.room_members WHERE room_id = _room_id AND user_id = _member_user_id;

  INSERT INTO public.room_activity_log (room_id, user_id, action_type, metadata)
  VALUES (_room_id, _caller_id, 'member_kicked', jsonb_build_object('kicked_user_id', _member_user_id));
END;
$$;

-- Toggle mute RPC
CREATE OR REPLACE FUNCTION public.toggle_mute_member(_room_id uuid, _member_user_id uuid, _muted boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _caller_role text;
BEGIN
  IF _caller_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT role INTO _caller_role FROM public.room_members
  WHERE room_id = _room_id AND user_id = _caller_id;

  IF _caller_role IS NULL OR _caller_role NOT IN ('owner', 'moderator') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.room_members SET is_muted = _muted
  WHERE room_id = _room_id AND user_id = _member_user_id;
END;
$$;

-- Set member role RPC (only owner can use)
CREATE OR REPLACE FUNCTION public.set_member_role(_room_id uuid, _member_user_id uuid, _role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid := auth.uid();
BEGIN
  IF _caller_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _role NOT IN ('member', 'moderator') THEN RAISE EXCEPTION 'Invalid role'; END IF;

  -- Only owner can change roles
  IF NOT is_room_owner(_caller_id, _room_id) THEN
    RAISE EXCEPTION 'Only the room owner can change roles';
  END IF;

  UPDATE public.room_members SET role = _role
  WHERE room_id = _room_id AND user_id = _member_user_id AND role != 'owner';
END;
$$;

-- Join public room (with optional password)
CREATE OR REPLACE FUNCTION public.join_public_room(_room_id uuid, _password text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _room record;
  _already_member boolean;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _room FROM public.study_rooms WHERE id = _room_id AND is_active = true;
  IF _room IS NULL THEN RAISE EXCEPTION 'Room not found'; END IF;

  -- Check password if room has one
  IF _room.password_hash IS NOT NULL THEN
    IF _password IS NULL OR crypt(_password, _room.password_hash) != _room.password_hash THEN
      RAISE EXCEPTION 'Invalid password';
    END IF;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.room_members WHERE room_id = _room_id AND user_id = _user_id) INTO _already_member;
  IF _already_member THEN RAISE EXCEPTION 'Already a member'; END IF;

  INSERT INTO public.room_members (room_id, user_id, role) VALUES (_room_id, _user_id, 'member');
  INSERT INTO public.room_activity_log (room_id, user_id, action_type) VALUES (_room_id, _user_id, 'member_joined');

  RETURN _room_id;
END;
$$;

-- Update join_room_by_invite_code to support password
CREATE OR REPLACE FUNCTION public.join_room_by_invite_code(_code text, _password text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _room_id uuid;
  _password_hash text;
  _user_id uuid := auth.uid();
  _already_member boolean;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id, password_hash INTO _room_id, _password_hash FROM public.study_rooms
  WHERE invite_code = upper(_code) AND is_active = true;

  IF _room_id IS NULL THEN RAISE EXCEPTION 'Invalid invite code'; END IF;

  -- Check password if room has one
  IF _password_hash IS NOT NULL THEN
    IF _password IS NULL OR crypt(_password, _password_hash) != _password_hash THEN
      RAISE EXCEPTION 'Invalid password';
    END IF;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.room_members WHERE room_id = _room_id AND user_id = _user_id) INTO _already_member;
  IF _already_member THEN RAISE EXCEPTION 'Already a member'; END IF;

  INSERT INTO public.room_members (room_id, user_id, role) VALUES (_room_id, _user_id, 'member');
  INSERT INTO public.room_activity_log (room_id, user_id, action_type) VALUES (_room_id, _user_id, 'member_joined');

  RETURN _room_id;
END;
$$;

-- Update create room to support password hashing (done in frontend via RPC)
CREATE OR REPLACE FUNCTION public.create_room_with_password(
  _name text, _description text, _room_type text, _is_public boolean, _password text DEFAULT NULL, _rules text DEFAULT NULL
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

  INSERT INTO public.study_rooms (name, description, room_type, owner_id, is_public, password_hash, rules)
  VALUES (_name, _description, _room_type, _user_id, _is_public, _hash, _rules)
  RETURNING id INTO _room_id;

  INSERT INTO public.room_members (room_id, user_id, role) VALUES (_room_id, _user_id, 'owner');
  INSERT INTO public.room_activity_log (room_id, user_id, action_type) VALUES (_room_id, _user_id, 'room_created');

  RETURN _room_id;
END;
$$;

-- Check if room has password (for frontend to know if dialog is needed)
CREATE OR REPLACE FUNCTION public.room_has_password(_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT password_hash IS NOT NULL FROM public.study_rooms WHERE id = _room_id;
$$;
