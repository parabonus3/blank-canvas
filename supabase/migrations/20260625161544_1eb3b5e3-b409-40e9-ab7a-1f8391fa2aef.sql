
-- 1) push_subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  lang TEXT,
  timezone TEXT,
  failure_count INT NOT NULL DEFAULT 0,
  last_error_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push subs" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);

-- 2) notification_preferences
CREATE TABLE public.notification_preferences (
  user_id UUID NOT NULL PRIMARY KEY,
  room_goal_reminder BOOLEAN NOT NULL DEFAULT true,
  streak_risk BOOLEAN NOT NULL DEFAULT true,
  room_challenge_deadline BOOLEAN NOT NULL DEFAULT true,
  friend_activity BOOLEAN NOT NULL DEFAULT true,
  re_engagement BOOLEAN NOT NULL DEFAULT true,
  chat_mentions BOOLEAN NOT NULL DEFAULT true,
  weekly_recap BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start SMALLINT NOT NULL DEFAULT 22,
  quiet_hours_end SMALLINT NOT NULL DEFAULT 8,
  max_per_day SMALLINT NOT NULL DEFAULT 3,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notif prefs" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3) notification_log
CREATE TABLE public.notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  lang TEXT,
  payload_hash TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  clicked_at TIMESTAMPTZ,
  meta JSONB
);
GRANT SELECT, INSERT, UPDATE ON public.notification_log TO authenticated;
GRANT ALL ON public.notification_log TO service_role;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notif log" ON public.notification_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX idx_notif_log_user_kind_sent ON public.notification_log(user_id, kind, sent_at DESC);
