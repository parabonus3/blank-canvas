
-- Create note_folders table
CREATE TABLE public.note_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  password_hash text,
  color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.note_folders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own folders" ON public.note_folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own folders" ON public.note_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own folders" ON public.note_folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own folders" ON public.note_folders FOR DELETE USING (auth.uid() = user_id);

-- Add folder_id to notes
ALTER TABLE public.notes ADD COLUMN folder_id uuid REFERENCES public.note_folders(id) ON DELETE SET NULL;

-- Trigger for updated_at
CREATE TRIGGER update_note_folders_updated_at
BEFORE UPDATE ON public.note_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: create folder with optional password
CREATE OR REPLACE FUNCTION public.create_note_folder(_name text, _password text DEFAULT NULL, _color text DEFAULT '#6366f1')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _folder_id uuid;
  _hash text;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  
  IF _password IS NOT NULL AND length(_password) > 0 THEN
    _hash := extensions.crypt(_password, extensions.gen_salt('bf'));
  END IF;
  
  INSERT INTO public.note_folders (user_id, name, password_hash, color)
  VALUES (_user_id, _name, _hash, _color)
  RETURNING id INTO _folder_id;
  
  RETURN _folder_id;
END;
$$;

-- RPC: verify folder password
CREATE OR REPLACE FUNCTION public.verify_folder_password(_folder_id uuid, _password text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _hash text;
  _owner uuid;
BEGIN
  SELECT password_hash, user_id INTO _hash, _owner
  FROM public.note_folders WHERE id = _folder_id;
  
  IF _owner IS NULL OR _owner != auth.uid() THEN
    RETURN false;
  END IF;
  
  IF _hash IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN extensions.crypt(_password, _hash) = _hash;
END;
$$;
