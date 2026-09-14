CREATE OR REPLACE FUNCTION public.seed_presence_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _enabled boolean;
BEGIN
  SELECT COALESCE((value->>'enabled')::boolean, false)
  INTO _enabled
  FROM public.seed_config
  WHERE key = 'presence';

  IF NOT COALESCE(_enabled, false) THEN
    RETURN;
  END IF;

  UPDATE public.time_entries te
  SET end_time = LEAST(now(), te.start_time + make_interval(secs => 2100 + (abs(hashtext(te.id::text)) % 4500))),
      duration = LEAST(6600, GREATEST(1080, extract(epoch FROM (LEAST(now(), te.start_time + make_interval(secs => 2100 + (abs(hashtext(te.id::text)) % 4500))) - te.start_time))::integer)),
      last_heartbeat_at = now()
  WHERE te.end_time IS NULL
    AND EXISTS (
      SELECT 1 FROM public.seed_entities se
      WHERE se.kind = 'user' AND se.entity_id = te.user_id
    )
    AND now() >= te.start_time + make_interval(secs => 2100 + (abs(hashtext(te.id::text)) % 4500));

  WITH presence AS (
    SELECT
      rm.id,
      p.timezone,
      extract(hour FROM now() AT TIME ZONE COALESCE(p.timezone, 'UTC'))::integer AS local_hour,
      abs(hashtext(rm.user_id::text || to_char(now(), 'YYYY-MM-DD HH24:MI') || rm.room_id::text)) % 100 AS online_roll,
      abs(hashtext(rm.user_id::text || to_char(now(), 'YYYY-MM-DD HH24:MI') || rm.room_id::text || 'focus')) % 100 AS focus_roll
    FROM public.room_members rm
    JOIN public.study_rooms sr ON sr.id = rm.room_id AND sr.is_seed
    JOIN public.profiles p ON p.user_id = rm.user_id
  ), calculated AS (
    SELECT
      id,
      timezone,
      local_hour,
      online_roll < CASE
        WHEN local_hour BETWEEN 6 AND 8 THEN 22
        WHEN local_hour BETWEEN 9 AND 12 THEN 31
        WHEN local_hour BETWEEN 13 AND 17 THEN 25
        WHEN local_hour BETWEEN 18 AND 23 THEN 39
        ELSE 8
      END AS is_online,
      focus_roll < CASE
        WHEN local_hour BETWEEN 6 AND 8 THEN 11
        WHEN local_hour BETWEEN 9 AND 12 THEN 18
        WHEN local_hour BETWEEN 13 AND 17 THEN 14
        WHEN local_hour BETWEEN 18 AND 23 THEN 23
        ELSE 4
      END AS wants_focus
    FROM presence
  )
  UPDATE public.room_members rm
  SET is_online = c.is_online OR c.wants_focus,
      is_timer_active = c.is_online AND c.wants_focus,
      last_active_at = CASE
        WHEN c.is_online OR c.wants_focus THEN now()
        ELSE now() - make_interval(mins => 20 + abs(hashtext(rm.user_id::text)) % 360)
      END,
      status_text = CASE
        WHEN c.is_online AND c.wants_focus THEN CASE
          WHEN c.timezone = 'America/Sao_Paulo' THEN 'Focando'
          WHEN c.timezone = 'America/New_York' THEN 'Focusing'
          WHEN c.timezone = 'Europe/Madrid' THEN 'Enfocado'
          WHEN c.timezone = 'Europe/Paris' THEN 'Concentré'
          WHEN c.timezone = 'Europe/Berlin' THEN 'Im Fokus'
          WHEN c.timezone = 'Europe/Rome' THEN 'Concentrato'
          WHEN c.timezone = 'Asia/Tokyo' THEN '集中中'
          WHEN c.timezone = 'Asia/Seoul' THEN '집중 중'
          WHEN c.timezone = 'Asia/Shanghai' THEN '专注中'
          WHEN c.timezone = 'Europe/Moscow' THEN 'В фокусе'
          WHEN c.timezone = 'Asia/Riyadh' THEN 'في تركيز'
          WHEN c.timezone = 'Asia/Jakarta' THEN 'Sedang fokus'
          ELSE 'Focusing'
        END
        ELSE NULL
      END
  FROM calculated c
  WHERE rm.id = c.id;

  INSERT INTO public.time_entries (
    user_id, project_id, start_time, end_time, duration, notes,
    paused_seconds, confirmed_intervals, room_id, last_heartbeat_at
  )
  SELECT
    rm.user_id,
    p.id,
    now() - make_interval(mins => 3 + abs(hashtext(rm.user_id::text || date_trunc('hour', now())::text)) % 42),
    NULL,
    NULL,
    'Focus session',
    0,
    0,
    rm.room_id,
    now()
  FROM public.room_members rm
  JOIN public.study_rooms sr ON sr.id = rm.room_id AND sr.is_seed
  JOIN LATERAL (
    SELECT id FROM public.projects
    WHERE user_id = rm.user_id
    ORDER BY created_at
    LIMIT 1
  ) p ON true
  WHERE rm.is_online
    AND rm.is_timer_active
    AND NOT EXISTS (
      SELECT 1 FROM public.time_entries te
      WHERE te.user_id = rm.user_id AND te.end_time IS NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.seed_presence_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_presence_tick() TO service_role;