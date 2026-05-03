-- 1) Trigger: clamp duration to 12h max
CREATE OR REPLACE FUNCTION public.enforce_time_entry_max_duration()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  max_seconds INTEGER := 43200; -- 12h
  net_seconds INTEGER;
  wall_seconds INTEGER;
BEGIN
  -- Only act when the entry is finalized
  IF NEW.end_time IS NULL OR NEW.start_time IS NULL THEN
    RETURN NEW;
  END IF;

  wall_seconds := GREATEST(0, EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER);
  net_seconds := GREATEST(0, wall_seconds - COALESCE(NEW.paused_seconds, 0));

  -- If duration is missing, derive it
  IF NEW.duration IS NULL THEN
    NEW.duration := net_seconds;
  END IF;

  -- Clamp net duration to 12h
  IF NEW.duration > max_seconds THEN
    NEW.duration := max_seconds;
    -- Adjust end_time so wall time matches: end = start + max + paused
    NEW.end_time := NEW.start_time + make_interval(secs => max_seconds + COALESCE(NEW.paused_seconds, 0));
    NEW.notes := COALESCE(NEW.notes, '') ||
      CASE WHEN NEW.notes IS NULL OR NEW.notes = '' THEN '' ELSE ' ' END ||
      '[auto-ajustada: sessao excedeu limite de 12h]';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_time_entry_max_duration ON public.time_entries;
CREATE TRIGGER trg_enforce_time_entry_max_duration
BEFORE INSERT OR UPDATE ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.enforce_time_entry_max_duration();

-- 2) Fix the inflated entry (53.88h -> 12h)
UPDATE public.time_entries
SET duration = 43200,
    end_time = start_time + interval '12 hours' + make_interval(secs => COALESCE(paused_seconds, 0)),
    notes = COALESCE(notes, '') ||
      CASE WHEN notes IS NULL OR notes = '' THEN '' ELSE ' ' END ||
      '[auto-ajustada: sessao sem verificacao de presenca]'
WHERE id = 'c1ad41a4-23e0-4563-a851-b5d7b61ffd3d';