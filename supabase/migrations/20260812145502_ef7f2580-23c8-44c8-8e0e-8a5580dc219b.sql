CREATE TABLE public.gps_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  time_entry_id uuid UNIQUE REFERENCES public.time_entries(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  distance_meters numeric NOT NULL DEFAULT 0,
  moving_seconds integer NOT NULL DEFAULT 0,
  elapsed_seconds integer NOT NULL DEFAULT 0,
  avg_pace_seconds_per_km numeric,
  elevation_gain_meters numeric NOT NULL DEFAULT 0,
  max_speed numeric,
  points jsonb NOT NULL DEFAULT '[]'::jsonb,
  bounds jsonb,
  source text NOT NULL DEFAULT 'browser',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gps_activities TO authenticated;
GRANT ALL ON public.gps_activities TO service_role;

ALTER TABLE public.gps_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gps activities"
  ON public.gps_activities FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gps activities"
  ON public.gps_activities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gps activities"
  ON public.gps_activities FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gps activities"
  ON public.gps_activities FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_gps_activities_user_started ON public.gps_activities (user_id, started_at DESC);
CREATE INDEX idx_gps_activities_time_entry ON public.gps_activities (time_entry_id);

CREATE TRIGGER update_gps_activities_updated_at
  BEFORE UPDATE ON public.gps_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();