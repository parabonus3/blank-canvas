DROP FUNCTION IF EXISTS public.stop_time_entry(uuid);

CREATE OR REPLACE FUNCTION public.stop_time_entry(_entry_id uuid, _client_seconds integer DEFAULT NULL)
RETURNS public.time_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _entry public.time_entries;
  _end_time timestamptz := now();
  _pause_now integer := 0;
  _effective_paused integer := 0;
  _wall integer := 0;
  _duration integer := 0;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _entry
    FROM public.time_entries
   WHERE id = _entry_id
   FOR UPDATE;

  IF _entry.id IS NULL THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;

  IF _entry.user_id <> _user THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _entry.end_time IS NOT NULL THEN
    RETURN _entry;
  END IF;

  _wall := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (_end_time - _entry.start_time)))::int);

  IF _client_seconds IS NOT NULL THEN
    _duration := LEAST(_wall, GREATEST(0, _client_seconds));
    _effective_paused := GREATEST(0, _wall - _duration);
  ELSE
    IF _entry.paused_at IS NOT NULL THEN
      _pause_now := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (_end_time - _entry.paused_at)))::int);
    END IF;

    _effective_paused := GREATEST(0, COALESCE(_entry.paused_seconds, 0) + _pause_now);
    _duration := GREATEST(0, _wall - _effective_paused);
  END IF;

  UPDATE public.time_entries
     SET end_time = _end_time,
         duration = _duration,
         paused_seconds = _effective_paused,
         paused_at = NULL,
         last_heartbeat_at = _end_time
   WHERE id = _entry_id
   RETURNING * INTO _entry;

  RETURN _entry;
END;
$$;

CREATE OR REPLACE FUNCTION public.pause_time_entry(_entry_id uuid, _client_seconds integer DEFAULT NULL)
RETURNS public.time_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _entry public.time_entries;
  _pause_at timestamptz := now();
  _wall integer := 0;
  _visible_duration integer := 0;
  _effective_paused integer := 0;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _entry
    FROM public.time_entries
   WHERE id = _entry_id
   FOR UPDATE;

  IF _entry.id IS NULL THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;

  IF _entry.user_id <> _user THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _entry.end_time IS NOT NULL THEN
    RETURN _entry;
  END IF;

  IF _entry.paused_at IS NOT NULL THEN
    RETURN _entry;
  END IF;

  _wall := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (_pause_at - _entry.start_time)))::int);

  IF _client_seconds IS NOT NULL THEN
    _visible_duration := LEAST(_wall, GREATEST(0, _client_seconds));
  ELSE
    _visible_duration := GREATEST(0, _wall - COALESCE(_entry.paused_seconds, 0));
  END IF;

  _effective_paused := GREATEST(0, _wall - _visible_duration);

  UPDATE public.time_entries
     SET paused_at = _pause_at,
         paused_seconds = _effective_paused,
         last_heartbeat_at = _pause_at
   WHERE id = _entry_id
   RETURNING * INTO _entry;

  RETURN _entry;
END;
$$;

CREATE OR REPLACE FUNCTION public.resume_time_entry(_entry_id uuid)
RETURNS public.time_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _entry public.time_entries;
  _resume_at timestamptz := now();
  _pause_now integer := 0;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _entry
    FROM public.time_entries
   WHERE id = _entry_id
   FOR UPDATE;

  IF _entry.id IS NULL THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;

  IF _entry.user_id <> _user THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _entry.end_time IS NOT NULL THEN
    RETURN _entry;
  END IF;

  IF _entry.paused_at IS NOT NULL THEN
    _pause_now := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (_resume_at - _entry.paused_at)))::int);
  END IF;

  UPDATE public.time_entries
     SET paused_at = NULL,
         paused_seconds = GREATEST(0, COALESCE(paused_seconds, 0) + _pause_now),
         last_heartbeat_at = _resume_at
   WHERE id = _entry_id
   RETURNING * INTO _entry;

  RETURN _entry;
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_time_entry(_entry_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _ok integer := 0;
BEGIN
  IF _user IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.time_entries
     SET last_heartbeat_at = now()
   WHERE id = _entry_id
     AND user_id = _user
     AND end_time IS NULL
     AND paused_at IS NULL;

  GET DIAGNOSTICS _ok = ROW_COUNT;
  RETURN _ok > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_pause_stale_entries()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _count integer := 0;
BEGIN
  IF _user IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.time_entries
     SET paused_at = COALESCE(last_heartbeat_at, start_time) + INTERVAL '2 hours'
   WHERE user_id = _user
     AND end_time IS NULL
     AND paused_at IS NULL
     AND COALESCE(last_heartbeat_at, start_time) < (now() - INTERVAL '2 hours');

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.stop_time_entry(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pause_time_entry(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resume_time_entry(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.heartbeat_time_entry(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auto_pause_stale_entries() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.stop_time_entry(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pause_time_entry(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_time_entry(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat_time_entry(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_pause_stale_entries() TO authenticated;