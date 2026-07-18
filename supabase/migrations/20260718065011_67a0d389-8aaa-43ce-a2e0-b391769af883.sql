
-- Ensure new signups get 3-day premium trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, is_stats_public, trial_ends_at)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name', true, now() + interval '3 days');
  RETURN NEW;
END;
$$;

-- Server-side lock: block time_entries against locked projects (post-trial free)
CREATE OR REPLACE FUNCTION public.enforce_free_project_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tier text;
  _trial_end timestamptz;
  _allowed_count int := 3;
  _is_allowed boolean;
BEGIN
  IF NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT plan_tier, trial_ends_at INTO _tier, _trial_end
  FROM public.profiles WHERE user_id = NEW.user_id;

  -- Only enforce for free tier with expired trial
  IF _tier IS DISTINCT FROM 'free' THEN
    RETURN NEW;
  END IF;
  IF _trial_end IS NOT NULL AND _trial_end > now() THEN
    RETURN NEW;
  END IF;

  SELECT NEW.project_id IN (
    SELECT id FROM public.projects
    WHERE user_id = NEW.user_id
    ORDER BY created_at ASC
    LIMIT _allowed_count
  ) INTO _is_allowed;

  IF NOT _is_allowed THEN
    RAISE EXCEPTION 'PROJECT_LOCKED_FREE_TIER'
      USING HINT = 'Este projeto está bloqueado. Renove o Premium para voltar a usar.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_free_project_lock ON public.time_entries;
CREATE TRIGGER trg_enforce_free_project_lock
BEFORE INSERT ON public.time_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_free_project_lock();
