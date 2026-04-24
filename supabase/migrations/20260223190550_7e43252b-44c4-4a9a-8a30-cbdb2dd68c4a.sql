ALTER TABLE public.checklists ADD COLUMN recurrence_type text NOT NULL DEFAULT 'once';
ALTER TABLE public.checklists ADD COLUMN recurrence_days text[] DEFAULT NULL;