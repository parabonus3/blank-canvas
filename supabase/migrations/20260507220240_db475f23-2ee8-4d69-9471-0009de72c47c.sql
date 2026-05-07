-- 1) Coluna heartbeat
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz;

UPDATE public.time_entries
   SET last_heartbeat_at = COALESCE(updated_at, start_time)
 WHERE last_heartbeat_at IS NULL;

-- Trigger: default heartbeat ao inserir
CREATE OR REPLACE FUNCTION public.set_initial_heartbeat()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.last_heartbeat_at IS NULL THEN
    NEW.last_heartbeat_at := COALESCE(NEW.start_time, now());
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_initial_heartbeat ON public.time_entries;
CREATE TRIGGER trg_set_initial_heartbeat
BEFORE INSERT ON public.time_entries
FOR EACH ROW EXECUTE FUNCTION public.set_initial_heartbeat();

-- Index parcial: lookups rápidos de sessões ativas
CREATE INDEX IF NOT EXISTS idx_time_entries_active
  ON public.time_entries (user_id, last_heartbeat_at)
  WHERE end_time IS NULL;

-- 2) RPC heartbeat
CREATE OR REPLACE FUNCTION public.heartbeat_time_entry(_entry_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user uuid := auth.uid(); _ok boolean;
BEGIN
  IF _user IS NULL THEN RETURN false; END IF;
  UPDATE public.time_entries
     SET last_heartbeat_at = now()
   WHERE id = _entry_id
     AND user_id = _user
     AND end_time IS NULL
     AND paused_at IS NULL;
  GET DIAGNOSTICS _ok = ROW_COUNT;
  RETURN _ok > 0;
END; $$;

-- 3) Auto-pausa de sessões abandonadas (do usuário atual)
CREATE OR REPLACE FUNCTION public.auto_pause_stale_entries()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user uuid := auth.uid(); _count integer := 0;
BEGIN
  IF _user IS NULL THEN RETURN 0; END IF;
  UPDATE public.time_entries
     SET paused_at = COALESCE(last_heartbeat_at, start_time) + INTERVAL '2 minutes'
   WHERE user_id = _user
     AND end_time IS NULL
     AND paused_at IS NULL
     AND COALESCE(last_heartbeat_at, start_time) < (now() - INTERVAL '15 minutes');
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END; $$;

-- 4) stop_time_entry com desconto de ghost time
CREATE OR REPLACE FUNCTION public.stop_time_entry(_entry_id uuid)
RETURNS time_entries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _entry public.time_entries;
  _end_time timestamptz := now();
  _pause_now integer := 0;
  _ghost integer := 0;
  _effective_paused integer;
  _duration integer;
  _last_heart timestamptz;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _entry FROM public.time_entries WHERE id = _entry_id;
  IF _entry.id IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF _entry.user_id <> _user THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _entry.end_time IS NOT NULL THEN RETURN _entry; END IF;

  _last_heart := COALESCE(_entry.last_heartbeat_at, _entry.start_time);

  -- Tempo desde a pausa atual
  IF _entry.paused_at IS NOT NULL THEN
    _pause_now := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (_end_time - _entry.paused_at)))::int);
  END IF;

  -- Ghost time: gap entre o último heartbeat e o STOP, descontando tolerância de 2 min
  -- Só conta quando a sessão NÃO estava marcada como pausada (pausa explícita já cobre)
  IF _entry.paused_at IS NULL THEN
    _ghost := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (_end_time - _last_heart)))::int - 120);
  END IF;

  _effective_paused := COALESCE(_entry.paused_seconds, 0) + _pause_now + _ghost;

  _duration := GREATEST(
    0,
    FLOOR(EXTRACT(EPOCH FROM (_end_time - _entry.start_time)))::int - _effective_paused
  );

  UPDATE public.time_entries
     SET end_time = _end_time,
         duration = _duration,
         paused_seconds = _effective_paused,
         paused_at = NULL,
         notes = CASE
           WHEN _ghost > 300 THEN
             COALESCE(notes, '') ||
             CASE WHEN notes IS NULL OR notes = '' THEN '' ELSE ' ' END ||
             '[ajustada: -' || ROUND(_ghost/60.0)::text || 'min sem heartbeat]'
           ELSE notes
         END
   WHERE id = _entry_id
   RETURNING * INTO _entry;

  RETURN _entry;
END; $$;

-- 5) Correção retroativa de sessões infladas
DO $$
DECLARE _r RECORD; _new_dur integer; _affected_users uuid[] := ARRAY[]::uuid[];
BEGIN
  FOR _r IN
    SELECT id, user_id, duration, paused_seconds
      FROM public.time_entries
     WHERE end_time IS NOT NULL
       AND duration >= 39600           -- >= 11h
       AND COALESCE(paused_seconds,0) < 600
       AND last_heartbeat_at IS NULL
  LOOP
    _new_dur := LEAST(_r.duration, 7200); -- conservador: 2h
    UPDATE public.time_entries
       SET duration = _new_dur,
           paused_seconds = COALESCE(paused_seconds,0) + (_r.duration - _new_dur),
           notes = COALESCE(notes,'') ||
                   CASE WHEN notes IS NULL OR notes = '' THEN '' ELSE ' ' END ||
                   '[revisada: possivel inatividade, ajustada para 2h]'
     WHERE id = _r.id;
    IF NOT (_r.user_id = ANY(_affected_users)) THEN
      _affected_users := array_append(_affected_users, _r.user_id);
    END IF;
  END LOOP;

  -- Recalcula total_seconds das salas dos usuários afetados
  IF array_length(_affected_users, 1) > 0 THEN
    UPDATE public.room_members rm
       SET total_seconds = COALESCE((
           SELECT SUM(te.duration)::int
             FROM public.time_entries te
            WHERE te.user_id = rm.user_id
              AND te.end_time IS NOT NULL
       ), 0)
     WHERE rm.user_id = ANY(_affected_users);
  END IF;
END $$;