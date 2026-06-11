
-- =========================================================================
-- 1) FUSO HORÁRIO OFICIAL DA SALA (do dono, fallback America/Sao_Paulo)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_room_timezone(_room_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(p.timezone, ''), 'America/Sao_Paulo')
  FROM public.study_rooms r
  JOIN public.profiles p ON p.user_id = r.owner_id
  WHERE r.id = _room_id
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_room_timezone(uuid) TO authenticated, anon;

-- =========================================================================
-- 2) JANELA "HOJE" da sala (para o badge no card de desafios)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_room_today_window(_room_id uuid)
RETURNS TABLE(timezone text, today_local date, start_utc timestamptz, end_utc timestamptz, seconds_until_rollover integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _tz text; _today date; _start timestamptz; _end timestamptz;
BEGIN
  _tz := public.get_room_timezone(_room_id);
  IF _tz IS NULL THEN _tz := 'America/Sao_Paulo'; END IF;
  _today := (now() AT TIME ZONE _tz)::date;
  _start := (_today::timestamp AT TIME ZONE _tz);
  _end   := ((_today + 1)::timestamp AT TIME ZONE _tz);
  timezone := _tz;
  today_local := _today;
  start_utc := _start;
  end_utc := _end;
  seconds_until_rollover := GREATEST(0, EXTRACT(EPOCH FROM (_end - now()))::int);
  RETURN NEXT;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_room_today_window(uuid) TO authenticated;

-- =========================================================================
-- 3) compute_challenge_period — agora aceita TZ explícita
-- =========================================================================
CREATE OR REPLACE FUNCTION public.compute_challenge_period(
  _period_type text, _at timestamptz, _tz text
) RETURNS TABLE(period_key text, period_start date)
LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
DECLARE _local_date date; _tz_safe text;
BEGIN
  _tz_safe := COALESCE(NULLIF(_tz,''), 'America/Sao_Paulo');
  _local_date := (_at AT TIME ZONE _tz_safe)::date;
  IF _period_type = 'weekly' THEN
    period_start := date_trunc('week', _local_date)::date;
    period_key := to_char(period_start, 'IYYY-"W"IW');
  ELSE
    period_start := _local_date;
    period_key := to_char(_local_date, 'YYYY-MM-DD');
  END IF;
  RETURN NEXT;
END; $$;

-- =========================================================================
-- 4) record_room_challenge_progress — usa FUSO DA SALA agora
-- =========================================================================
CREATE OR REPLACE FUNCTION public.record_room_challenge_progress(
  _room_id uuid, _user_id uuid, _seconds integer, _at timestamptz
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tz text;
  _c record;
  _p record;
  _target_seconds integer;
  _new_total integer;
  _was_completed boolean;
BEGIN
  IF _seconds IS NULL OR _seconds <= 0 THEN RETURN; END IF;
  _tz := public.get_room_timezone(_room_id);

  FOR _c IN
    SELECT * FROM public.room_challenges
    WHERE room_id = _room_id
      AND is_active = true
      AND start_date <= (_at AT TIME ZONE _tz)::date
      AND (duration_days IS NULL OR (start_date + duration_days) > (_at AT TIME ZONE _tz)::date)
  LOOP
    SELECT * INTO _p FROM public.compute_challenge_period(_c.period_type, _at, _tz);
    _target_seconds := _c.target_minutes * 60;

    INSERT INTO public.room_challenge_progress (
      challenge_id, user_id, period_key, period_start, seconds_in_period, completed, completed_at
    ) VALUES (
      _c.id, _user_id, _p.period_key, _p.period_start, _seconds,
      _seconds >= _target_seconds,
      CASE WHEN _seconds >= _target_seconds THEN now() ELSE NULL END
    )
    ON CONFLICT (challenge_id, user_id, period_key) DO UPDATE
      SET seconds_in_period = public.room_challenge_progress.seconds_in_period + EXCLUDED.seconds_in_period,
          updated_at = now();

    SELECT completed, seconds_in_period INTO _was_completed, _new_total
      FROM public.room_challenge_progress
     WHERE challenge_id = _c.id AND user_id = _user_id AND period_key = _p.period_key;

    IF NOT _was_completed AND _new_total >= _target_seconds THEN
      UPDATE public.room_challenge_progress
        SET completed = true, completed_at = now()
        WHERE challenge_id = _c.id AND user_id = _user_id AND period_key = _p.period_key;
    END IF;
  END LOOP;
END; $$;

-- =========================================================================
-- 5) get_room_challenges_with_status — fuso DA SALA, mesmo "hoje" para todos
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_room_challenges_with_status(_room_id uuid)
RETURNS TABLE(
  challenge_id uuid,
  title text,
  description text,
  emoji text,
  period_type text,
  target_minutes integer,
  duration_days integer,
  start_date date,
  is_active boolean,
  created_at timestamptz,
  members jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tz text;
  _today date;
  _week_start date;
BEGIN
  IF NOT public.is_room_member(auth.uid(), _room_id) THEN
    RETURN;
  END IF;
  _tz := public.get_room_timezone(_room_id);
  _today := (now() AT TIME ZONE _tz)::date;
  _week_start := date_trunc('week', _today)::date;

  RETURN QUERY
  SELECT c.id, c.title, c.description, c.emoji, c.period_type, c.target_minutes,
         c.duration_days, c.start_date, c.is_active, c.created_at,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'user_id', rm.user_id,
             'display_name', p.display_name,
             'avatar_url', p.avatar_url,
             'avatar_flair', p.avatar_flair,
             'avatar_flair_color', p.avatar_flair_color,
             'seconds_current', COALESCE(cur.seconds_in_period, 0),
             'completed_current', COALESCE(cur.completed, false),
             'last_completed_at', last_completed.completed_at,
             'completed_periods_total', COALESCE(stats.completed_count, 0),
             'days_since_completed', CASE
                WHEN last_completed.period_start IS NULL THEN NULL
                ELSE GREATEST(0, (_today - last_completed.period_start))::int
             END
           ) ORDER BY p.display_name)
           FROM public.room_members rm
           JOIN public.profiles p ON p.user_id = rm.user_id
           LEFT JOIN LATERAL (
             SELECT seconds_in_period, completed
             FROM public.room_challenge_progress rcp
             WHERE rcp.challenge_id = c.id AND rcp.user_id = rm.user_id
               AND rcp.period_start = CASE WHEN c.period_type = 'weekly' THEN _week_start ELSE _today END
             LIMIT 1
           ) cur ON true
           LEFT JOIN LATERAL (
             SELECT period_start, completed_at FROM public.room_challenge_progress rcp2
             WHERE rcp2.challenge_id = c.id AND rcp2.user_id = rm.user_id AND rcp2.completed = true
             ORDER BY period_start DESC LIMIT 1
           ) last_completed ON true
           LEFT JOIN LATERAL (
             SELECT COUNT(*)::int AS completed_count FROM public.room_challenge_progress rcp3
             WHERE rcp3.challenge_id = c.id AND rcp3.user_id = rm.user_id AND rcp3.completed = true
           ) stats ON true
           WHERE rm.room_id = _room_id
         ), '[]'::jsonb) AS members
    FROM public.room_challenges c
   WHERE c.room_id = _room_id
   ORDER BY c.is_active DESC, c.created_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_room_challenges_with_status(uuid) TO authenticated;

-- =========================================================================
-- 6) get_room_ranking_by_period — fuso da sala
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_room_ranking_by_period(_room_id uuid, _period text DEFAULT 'all'::text)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, total_seconds bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tz text;
  _today date;
  _week_start date;
  _month_start date;
BEGIN
  IF NOT public.is_room_member(auth.uid(), _room_id) THEN
    RETURN;
  END IF;
  _tz := public.get_room_timezone(_room_id);
  _today := (now() AT TIME ZONE _tz)::date;
  _week_start := date_trunc('week', _today)::date;
  _month_start := date_trunc('month', _today)::date;

  RETURN QUERY
  SELECT rm.user_id, p.display_name, p.avatar_url,
    COALESCE(SUM(te.duration) FILTER (
      WHERE te.end_time IS NOT NULL
        AND CASE _period
              WHEN 'today' THEN (te.start_time AT TIME ZONE _tz)::date = _today
              WHEN 'week'  THEN (te.start_time AT TIME ZONE _tz)::date >= _week_start
              WHEN 'month' THEN (te.start_time AT TIME ZONE _tz)::date >= _month_start
              ELSE true
            END
    ), 0)::bigint
  FROM public.room_members rm
  JOIN public.profiles p ON p.user_id = rm.user_id
  LEFT JOIN public.time_entries te ON te.user_id = rm.user_id
  WHERE rm.room_id = _room_id
  GROUP BY rm.user_id, p.display_name, p.avatar_url
  ORDER BY 4 DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_room_ranking_by_period(uuid, text) TO authenticated;

-- =========================================================================
-- 7) get_room_streak — fuso da sala
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_room_streak(_room_id uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _s integer := 0; _d date; _today date; _tz text; _has boolean;
BEGIN
  _tz := public.get_room_timezone(_room_id);
  _today := (now() AT TIME ZONE _tz)::date;
  _d := _today;
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.time_entries te
      WHERE te.user_id IN (SELECT rm.user_id FROM public.room_members rm WHERE rm.room_id = _room_id)
        AND te.end_time IS NOT NULL
        AND (te.start_time AT TIME ZONE _tz)::date = _d
    ) INTO _has;
    IF NOT _has AND _d < _today THEN EXIT; END IF;
    IF _has THEN _s := _s + 1; END IF;
    _d := _d - 1;
    IF _s > 365 THEN EXIT; END IF;
  END LOOP;
  RETURN _s;
END; $$;

-- =========================================================================
-- 8) get_room_activity_heatmap — fuso da sala (mantém assinatura existente)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_room_activity_heatmap(_room_id uuid)
RETURNS TABLE(hour_of_day integer, total_minutes bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _tz text;
BEGIN
  _tz := public.get_room_timezone(_room_id);
  RETURN QUERY
  SELECT EXTRACT(HOUR FROM (te.start_time AT TIME ZONE _tz))::integer,
    COALESCE(SUM(te.duration)/60,0)::bigint
  FROM public.time_entries te
  WHERE te.user_id IN (SELECT rm.user_id FROM public.room_members rm WHERE rm.room_id = _room_id)
    AND te.end_time IS NOT NULL
    AND te.start_time >= NOW() - INTERVAL '30 days'
  GROUP BY 1
  ORDER BY 1;
END; $$;

-- =========================================================================
-- 9) get_room_heatmap (diário) — calendário tipo GitHub
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_room_heatmap(_room_id uuid, _days integer DEFAULT 90)
RETURNS TABLE(day date, total_minutes bigint, sessions bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _tz text;
BEGIN
  IF NOT public.is_room_member(auth.uid(), _room_id) THEN RETURN; END IF;
  _tz := public.get_room_timezone(_room_id);
  RETURN QUERY
  SELECT (te.start_time AT TIME ZONE _tz)::date,
         COALESCE(SUM(te.duration),0)/60::bigint,
         COUNT(*)::bigint
  FROM public.time_entries te
  JOIN public.room_members rm ON rm.user_id = te.user_id AND rm.room_id = _room_id
  WHERE te.end_time IS NOT NULL
    AND te.start_time >= NOW() - make_interval(days => _days)
  GROUP BY 1
  ORDER BY 1;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_room_heatmap(uuid, integer) TO authenticated;

-- =========================================================================
-- 10) RECALC room_members.total_seconds — trigger + helper
-- =========================================================================
CREATE OR REPLACE FUNCTION public.recalc_room_member_total(_room_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _total bigint;
BEGIN
  IF _room_id IS NULL OR _user_id IS NULL THEN RETURN; END IF;
  SELECT COALESCE(SUM(duration), 0)::bigint INTO _total
    FROM public.time_entries
   WHERE room_id = _room_id AND user_id = _user_id AND end_time IS NOT NULL;
  UPDATE public.room_members
     SET total_seconds = _total
   WHERE room_id = _room_id AND user_id = _user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_time_entries_recalc_room_total()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.room_id IS NOT NULL THEN
      PERFORM public.recalc_room_member_total(OLD.room_id, OLD.user_id);
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.room_id IS DISTINCT FROM NEW.room_id THEN
      IF OLD.room_id IS NOT NULL THEN
        PERFORM public.recalc_room_member_total(OLD.room_id, OLD.user_id);
      END IF;
    END IF;
  END IF;

  IF NEW.room_id IS NOT NULL THEN
    PERFORM public.recalc_room_member_total(NEW.room_id, NEW.user_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS time_entries_recalc_room_total ON public.time_entries;
CREATE TRIGGER time_entries_recalc_room_total
AFTER INSERT OR UPDATE OR DELETE ON public.time_entries
FOR EACH ROW EXECUTE FUNCTION public.trg_time_entries_recalc_room_total();

-- =========================================================================
-- 11) BACKFILL: recalcular total_seconds de todos os membros
-- =========================================================================
UPDATE public.room_members rm
   SET total_seconds = COALESCE((
     SELECT SUM(te.duration)::bigint
       FROM public.time_entries te
      WHERE te.room_id = rm.room_id
        AND te.user_id = rm.user_id
        AND te.end_time IS NOT NULL
   ), 0);

-- =========================================================================
-- 12) BACKFILL: recomputar room_challenge_progress do histórico
-- =========================================================================
DO $backfill$
DECLARE
  _c record;
  _tz text;
  _te record;
  _p record;
  _target integer;
BEGIN
  FOR _c IN SELECT * FROM public.room_challenges WHERE is_active = true LOOP
    _tz := public.get_room_timezone(_c.room_id);
    _target := _c.target_minutes * 60;

    -- limpa progresso atual deste desafio (será reconstruído do zero)
    DELETE FROM public.room_challenge_progress WHERE challenge_id = _c.id;

    FOR _te IN
      SELECT te.user_id, te.duration, te.end_time
      FROM public.time_entries te
      JOIN public.room_members rm ON rm.user_id = te.user_id AND rm.room_id = _c.room_id
      WHERE te.room_id = _c.room_id
        AND te.end_time IS NOT NULL
        AND te.duration > 0
        AND (te.end_time AT TIME ZONE _tz)::date >= _c.start_date
        AND (_c.duration_days IS NULL
             OR (te.end_time AT TIME ZONE _tz)::date < (_c.start_date + _c.duration_days))
      ORDER BY te.end_time
    LOOP
      SELECT * INTO _p FROM public.compute_challenge_period(_c.period_type, _te.end_time, _tz);
      INSERT INTO public.room_challenge_progress (
        challenge_id, user_id, period_key, period_start, seconds_in_period, completed, completed_at
      ) VALUES (
        _c.id, _te.user_id, _p.period_key, _p.period_start, _te.duration,
        _te.duration >= _target,
        CASE WHEN _te.duration >= _target THEN _te.end_time ELSE NULL END
      )
      ON CONFLICT (challenge_id, user_id, period_key) DO UPDATE
        SET seconds_in_period = public.room_challenge_progress.seconds_in_period + EXCLUDED.seconds_in_period,
            updated_at = now();
    END LOOP;

    -- marca completed onde passou do alvo
    UPDATE public.room_challenge_progress
       SET completed = true,
           completed_at = COALESCE(completed_at, updated_at)
     WHERE challenge_id = _c.id
       AND completed = false
       AND seconds_in_period >= _target;
  END LOOP;
END
$backfill$;

-- =========================================================================
-- 13) PERFIL PÚBLICO POR PADRÃO (is_stats_public)
-- =========================================================================
ALTER TABLE public.profiles ALTER COLUMN is_stats_public SET DEFAULT true;
UPDATE public.profiles SET is_stats_public = true WHERE is_stats_public = false;

-- handle_new_user: garantir novos cadastros públicos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, is_stats_public)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name', true);
  RETURN NEW;
END;
$$;
