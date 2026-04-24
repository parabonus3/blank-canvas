-- Adicionar coluna de cor na tabela projects
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1';