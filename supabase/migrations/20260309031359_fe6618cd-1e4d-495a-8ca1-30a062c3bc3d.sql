
-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create time_entry_tags junction table
CREATE TABLE public.time_entry_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  UNIQUE(time_entry_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entry_tags ENABLE ROW LEVEL SECURITY;

-- Tags RLS policies
CREATE POLICY "Users can view their own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);

-- time_entry_tags RLS policies (join through tags to verify ownership)
CREATE POLICY "Users can view their own time_entry_tags" ON public.time_entry_tags FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tags WHERE tags.id = time_entry_tags.tag_id AND tags.user_id = auth.uid())
);
CREATE POLICY "Users can insert their own time_entry_tags" ON public.time_entry_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tags WHERE tags.id = time_entry_tags.tag_id AND tags.user_id = auth.uid())
);
CREATE POLICY "Users can delete their own time_entry_tags" ON public.time_entry_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.tags WHERE tags.id = time_entry_tags.tag_id AND tags.user_id = auth.uid())
);
