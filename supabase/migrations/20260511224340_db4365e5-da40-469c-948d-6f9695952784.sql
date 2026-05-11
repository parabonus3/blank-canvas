CREATE OR REPLACE FUNCTION public.stop_time_entry(_entry_id uuid, _client_seconds integer DEFAULT NULL)
 RETURNS time_entries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user uuid := auth.uid();
  _entry public.time_entries;
  _end_time timestamptz := now();
  _pause_now integer := 0;
  _effective_paused integer;
  _wall integer;
  _duration integer;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _entry FROM public.time_entries WHERE id = _entry_id;
  IF _entry.id IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF _entry.user_id <> _user THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _entry.end_time IS NOT NULL THEN RETURN _entry; END IF;

  _wall := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (_end_time - _entry.start_time)))::int);

  IF _client_seconds IS NOT NULL THEN
    -- Cliente é a fonte da verdade do que o usuário viu no cronômetro,
    -- limitado pelo tempo real decorrido (anti-fraude).
    _duration := LEAST(_wall, GREATEST(0, _client_seconds));
    _effective_paused := GREATEST(0, _wall - _duration);
  ELSE
    -- Compatibilidade: caminho antigo baseado em paused_at/paused_seconds.
    IF _entry.paused_at IS NOT NULL THEN
      _pause_now := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (_end_time - _entry.paused_at)))::int);
    END IF;
    _effective_paused := COALESCE(_entry.paused_seconds, 0) + _pause_now;
    _duration := GREATEST(0, _wall - _effective_paused);
  END IF;

  UPDATE public.time_entries
     SET end_time = _end_time,
         duration = _duration,
         paused_seconds = _effective_paused,
         paused_at = NULL
   WHERE id = _entry_id
   RETURNING * INTO _entry;

  RETURN _entry;
END; $function$;