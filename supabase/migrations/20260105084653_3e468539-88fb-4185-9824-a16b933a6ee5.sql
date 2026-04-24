-- Adicionar campos de Pomodoro na tabela time_entries
ALTER TABLE public.time_entries
ADD COLUMN IF NOT EXISTS is_pomodoro BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pomodoro_type TEXT DEFAULT NULL;

-- Adicionar configurações Pomodoro na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pomodoro_work_duration INTEGER DEFAULT 25,
ADD COLUMN IF NOT EXISTS pomodoro_short_break INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS pomodoro_long_break INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS pomodoro_cycles_before_long INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS pomodoro_auto_start_breaks BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pomodoro_auto_start_work BOOLEAN DEFAULT false;