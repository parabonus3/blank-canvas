
-- 1) stop_time_entry: salvar exatamente wall_time - pausas explícitas (sem ghost time)
CREATE OR REPLACE FUNCTION public.stop_time_entry(_entry_id uuid)
RETURNS public.time_entries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _entry public.time_entries;
  _end_time timestamptz := now();
  _pause_now integer := 0;
  _effective_paused integer;
  _duration integer;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _entry FROM public.time_entries WHERE id = _entry_id;
  IF _entry.id IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF _entry.user_id <> _user THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _entry.end_time IS NOT NULL THEN RETURN _entry; END IF;

  -- Se ainda estiver pausado no momento do stop, soma o tempo desde paused_at
  IF _entry.paused_at IS NOT NULL THEN
    _pause_now := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (_end_time - _entry.paused_at)))::int);
  END IF;

  _effective_paused := COALESCE(_entry.paused_seconds, 0) + _pause_now;

  _duration := GREATEST(
    0,
    FLOOR(EXTRACT(EPOCH FROM (_end_time - _entry.start_time)))::int - _effective_paused
  );

  UPDATE public.time_entries
     SET end_time = _end_time,
         duration = _duration,
         paused_seconds = _effective_paused,
         paused_at = NULL
   WHERE id = _entry_id
   RETURNING * INTO _entry;

  RETURN _entry;
END; $$;

-- 2) auto_pause_stale_entries: só após 2h sem heartbeat, pausando no ponto correto (last_heartbeat + 2h)
CREATE OR REPLACE FUNCTION public.auto_pause_stale_entries()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user uuid := auth.uid(); _count integer := 0;
BEGIN
  IF _user IS NULL THEN RETURN 0; END IF;
  UPDATE public.time_entries
     SET paused_at = COALESCE(last_heartbeat_at, start_time) + INTERVAL '2 hours'
   WHERE user_id = _user
     AND end_time IS NULL
     AND paused_at IS NULL
     AND COALESCE(last_heartbeat_at, start_time) < (now() - INTERVAL '2 hours');
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END; $$;

-- 3) Restaurar a sessão recente afetada pelo bug de ghost time
-- (start 20:36:27, end 20:54:58, paused_seconds inflado para 990s, duration salvo em 120s)
UPDATE public.time_entries
   SET duration = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (end_time - start_time)))::int),
       paused_seconds = 0,
       notes = COALESCE(notes, '') ||
               CASE WHEN notes IS NULL OR notes = '' THEN '' ELSE ' ' END ||
               '[corrigida: bug de ghost time]'
 WHERE id = 'f87fc486-cfb4-4077-bdcc-dfe9228326ed'
   AND duration = 120
   AND paused_seconds = 990;
