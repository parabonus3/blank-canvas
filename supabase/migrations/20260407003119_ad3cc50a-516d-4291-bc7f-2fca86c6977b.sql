
-- Change FK from SET NULL to CASCADE
ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_folder_id_fkey;
ALTER TABLE public.notes ADD CONSTRAINT notes_folder_id_fkey
  FOREIGN KEY (folder_id) REFERENCES public.note_folders(id) ON DELETE CASCADE;

-- RPC to update/remove folder password
CREATE OR REPLACE FUNCTION public.update_folder_password(
  _folder_id uuid,
  _current_password text,
  _new_password text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _hash text;
  _owner uuid;
  _new_hash text;
BEGIN
  SELECT password_hash, user_id INTO _hash, _owner
  FROM public.note_folders WHERE id = _folder_id;

  IF _owner IS NULL OR _owner != auth.uid() THEN
    RETURN false;
  END IF;

  -- If folder has password, verify current password
  IF _hash IS NOT NULL THEN
    IF _current_password IS NULL OR extensions.crypt(_current_password, _hash) != _hash THEN
      RETURN false;
    END IF;
  END IF;

  -- Update password
  IF _new_password IS NOT NULL AND length(_new_password) > 0 THEN
    _new_hash := extensions.crypt(_new_password, extensions.gen_salt('bf'));
  ELSE
    _new_hash := NULL;
  END IF;

  UPDATE public.note_folders SET password_hash = _new_hash, updated_at = now()
  WHERE id = _folder_id;

  RETURN true;
END;
$$;
