CREATE OR REPLACE FUNCTION public.seed_admin_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH demo_users AS (
    SELECT entity_id AS user_id, locale
    FROM public.seed_entities
    WHERE kind = 'user'
  ), demo_rooms AS (
    SELECT se.entity_id AS room_id, se.locale
    FROM public.seed_entities se
    JOIN public.study_rooms sr ON sr.id = se.entity_id AND sr.is_seed
    WHERE se.kind = 'room'
  ), locale_stats AS (
    SELECT
      l.locale,
      count(DISTINCT du.user_id)::integer AS users,
      count(DISTINCT dr.room_id)::integer AS rooms,
      count(DISTINCT rm.user_id)::integer AS members,
      count(DISTINCT CASE WHEN te.user_id IS NOT NULL THEN du.user_id END)::integer AS with_history,
      count(DISTINCT CASE WHEN rm.is_online THEN rm.id END)::integer AS online
    FROM (
      SELECT unnest(ARRAY['pt-BR','en-US','es-ES','fr-FR','de-DE','it-IT','ja-JP','ko-KR','zh-CN','ru-RU','ar-SA','id-ID']) AS locale
    ) l
    LEFT JOIN demo_users du ON du.locale = l.locale
    LEFT JOIN demo_rooms dr ON dr.locale = l.locale
    LEFT JOIN public.room_members rm ON rm.room_id = dr.room_id
    LEFT JOIN (SELECT DISTINCT user_id FROM public.time_entries WHERE end_time IS NOT NULL) te ON te.user_id = du.user_id
    GROUP BY l.locale
  )
  SELECT jsonb_build_object(
    'users', (SELECT count(*) FROM demo_users),
    'rooms', (SELECT count(*) FROM demo_rooms),
    'sessions', (SELECT count(*) FROM public.time_entries te JOIN demo_users du ON du.user_id = te.user_id),
    'presence_enabled', COALESCE((SELECT (value->>'enabled')::boolean FROM public.seed_config WHERE key = 'presence'), false),
    'locales', COALESCE((SELECT jsonb_agg(to_jsonb(locale_stats) ORDER BY locale) FROM locale_stats), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.seed_admin_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_admin_stats() TO service_role;