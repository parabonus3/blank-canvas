
-- Trigger: on new room_messages, detect @mentions and fire chat_mentions push
CREATE OR REPLACE FUNCTION public.dispatch_chat_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matches text[];
  v_name text;
  v_target uuid;
  v_sender_name text;
  v_room_name text;
  v_url text;
  v_anon_key text;
BEGIN
  IF NEW.content IS NULL OR length(NEW.content) < 2 THEN
    RETURN NEW;
  END IF;

  -- Extract @handles (letters/digits/_/-/. up to 40 chars)
  SELECT array_agg(DISTINCT lower(m[1]))
    INTO v_matches
    FROM regexp_matches(NEW.content, '@([A-Za-z0-9_.\-]{2,40})', 'g') AS m;

  IF v_matches IS NULL OR array_length(v_matches, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_sender_name
    FROM public.profiles WHERE user_id = NEW.user_id;

  SELECT name INTO v_room_name
    FROM public.study_rooms WHERE id = NEW.room_id;

  v_url := 'https://iukwvfyhforubyqgguwl.supabase.co/functions/v1/send-push';
  v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a3d2ZnloZm9ydWJ5cWdndXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5ODIwMzksImV4cCI6MjA5MjU1ODAzOX0.XWjJBXc3xyp-hDHh2y8hN39loZh7vj-IuRB5bLJjV5U';

  FOREACH v_name IN ARRAY v_matches LOOP
    -- Resolve to a room member (case-insensitive on display_name)
    SELECT rm.user_id INTO v_target
      FROM public.room_members rm
      JOIN public.profiles p ON p.user_id = rm.user_id
      WHERE rm.room_id = NEW.room_id
        AND lower(p.display_name) = v_name
        AND rm.user_id <> NEW.user_id
      LIMIT 1;

    IF v_target IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', v_anon_key,
          'Authorization', 'Bearer ' || v_anon_key
        ),
        body := jsonb_build_object(
          'user_id', v_target,
          'kind', 'chat_mentions',
          'vars', jsonb_build_object(
            'sender_name', COALESCE(v_sender_name, 'Alguém'),
            'room_name', COALESCE(v_room_name, 'sala'),
            'content', left(NEW.content, 120)
          ),
          'url', '/rooms/' || NEW.room_id::text
        )
      );
    END IF;
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'dispatch_chat_mentions error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_chat_mentions ON public.room_messages;
CREATE TRIGGER trg_dispatch_chat_mentions
  AFTER INSERT ON public.room_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_chat_mentions();
