-- Tabela para histórico de metas concluídas
CREATE TABLE IF NOT EXISTS goal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  target_minutes INTEGER NOT NULL,
  achieved_minutes INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE goal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goal history"
  ON goal_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goal history"
  ON goal_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal history"
  ON goal_history FOR DELETE USING (auth.uid() = user_id);

-- Tabela para achievements/progresso anual (gamificação)
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  total_seconds INTEGER DEFAULT 0,
  current_stage TEXT DEFAULT 'seed',
  milestones_unlocked JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, year)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements"
  ON user_achievements FOR UPDATE USING (auth.uid() = user_id);