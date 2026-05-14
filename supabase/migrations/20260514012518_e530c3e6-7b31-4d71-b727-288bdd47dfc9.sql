
DROP FUNCTION IF EXISTS public.get_my_rooms();
CREATE FUNCTION public.get_my_rooms()
 RETURNS TABLE(
   id uuid, owner_id uuid, name text, description text, room_type text,
   max_members integer, is_active boolean, is_public boolean, chat_mode text,
   rules text, country text, slug text, pinned_message text,
   goal_hours integer, goal_label text,
   focus_session_end_at timestamp with time zone, focus_session_duration integer,
   focus_session_started_by uuid, created_at timestamp with time zone,
   member_count bigint, room_background text
 )
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    sr.id, sr.owner_id, sr.name, sr.description, sr.room_type,
    sr.max_members, sr.is_active, sr.is_public, sr.chat_mode,
    sr.rules, sr.country, sr.slug, sr.pinned_message,
    sr.goal_hours, sr.goal_label,
    sr.focus_session_end_at, sr.focus_session_duration,
    sr.focus_session_started_by,
    sr.created_at,
    (SELECT COUNT(*) FROM public.room_members rm2 WHERE rm2.room_id = sr.id) AS member_count,
    sr.room_background
  FROM public.study_rooms sr
  WHERE sr.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = sr.id AND rm.user_id = auth.uid()
    )
  ORDER BY sr.created_at DESC;
$function$;
