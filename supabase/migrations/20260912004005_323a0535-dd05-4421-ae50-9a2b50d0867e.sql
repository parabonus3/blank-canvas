-- lovable-cron-fallback-reviewed: 288 runs/day; live room presence must vary within five minutes and has no user event to trigger updates
CREATE TABLE public.seed_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('room','user')),
  entity_id uuid NOT NULL,
  locale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(kind, entity_id)
);
GRANT ALL ON public.seed_entities TO service_role;
ALTER TABLE public.seed_entities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.seed_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.seed_config TO service_role;
ALTER TABLE public.seed_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.seed_config(key, value) VALUES ('presence', '{"enabled": true}'::jsonb) ON CONFLICT (key) DO NOTHING;
ALTER TABLE public.study_rooms ADD COLUMN is_seed boolean NOT NULL DEFAULT false;
CREATE INDEX idx_study_rooms_is_seed ON public.study_rooms(is_seed) WHERE is_seed;

CREATE OR REPLACE FUNCTION public.seed_presence_tick() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _enabled boolean;
BEGIN
  SELECT COALESCE((value->>'enabled')::boolean, false) INTO _enabled FROM public.seed_config WHERE key='presence';
  IF NOT COALESCE(_enabled,false) THEN RETURN; END IF;
  UPDATE public.time_entries te SET end_time=LEAST(now(),te.start_time+make_interval(secs=>2100+(abs(hashtext(te.id::text))%4500))), duration=LEAST(6600,GREATEST(1080,extract(epoch FROM (LEAST(now(),te.start_time+make_interval(secs=>2100+(abs(hashtext(te.id::text))%4500)))-te.start_time))::integer)), last_heartbeat_at=now() WHERE te.end_time IS NULL AND EXISTS (SELECT 1 FROM public.seed_entities se WHERE se.kind='user' AND se.entity_id=te.user_id) AND now()>=te.start_time+make_interval(secs=>2100+(abs(hashtext(te.id::text))%4500));
  UPDATE public.room_members rm SET is_online=((abs(hashtext(rm.user_id::text||date_trunc('hour',now())::text))%100)<CASE WHEN extract(hour FROM now()) BETWEEN 10 AND 23 THEN 34 ELSE 14 END), is_timer_active=((abs(hashtext(rm.user_id::text||date_trunc('hour',now())::text||'focus'))%100)<CASE WHEN extract(hour FROM now()) BETWEEN 10 AND 23 THEN 19 ELSE 7 END), last_active_at=CASE WHEN (abs(hashtext(rm.user_id::text||date_trunc('hour',now())::text))%100)<34 THEN now() ELSE now()-make_interval(mins=>20+abs(hashtext(rm.user_id::text))%360) END, status_text=CASE WHEN (abs(hashtext(rm.user_id::text||date_trunc('hour',now())::text||'focus'))%100)<19 THEN 'Focando' ELSE NULL END WHERE EXISTS (SELECT 1 FROM public.study_rooms sr WHERE sr.id=rm.room_id AND sr.is_seed);
  INSERT INTO public.time_entries(user_id,project_id,start_time,end_time,duration,notes,paused_seconds,confirmed_intervals,room_id,last_heartbeat_at) SELECT rm.user_id,p.id,now()-make_interval(mins=>3+abs(hashtext(rm.user_id::text||date_trunc('hour',now())::text))%42),NULL,NULL,'Sessão de foco',0,0,rm.room_id,now() FROM public.room_members rm JOIN public.study_rooms sr ON sr.id=rm.room_id AND sr.is_seed JOIN LATERAL (SELECT id FROM public.projects WHERE user_id=rm.user_id ORDER BY created_at LIMIT 1) p ON true WHERE rm.is_timer_active AND NOT EXISTS (SELECT 1 FROM public.time_entries te WHERE te.user_id=rm.user_id AND te.end_time IS NULL);
END; $$;
REVOKE ALL ON FUNCTION public.seed_presence_tick() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.seed_presence_tick() TO service_role;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='seed-presence';
SELECT cron.schedule('seed-presence','*/5 * * * *','SELECT public.seed_presence_tick()');