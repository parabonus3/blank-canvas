-- Enable RLS on realtime.messages (Supabase Realtime Authorization)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "authenticated_can_read_authorized_topics" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated_can_send_authorized_topics" ON realtime.messages;

-- SELECT (subscribe) policy
CREATE POLICY "authenticated_can_read_authorized_topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    -- DM notifications: dm-notifications-{uid}-{nonce}
    WHEN realtime.topic() LIKE 'dm-notifications-%' THEN
      auth.uid()::text = split_part(realtime.topic(), '-', 3)

    -- DM channel: dm-{uidA}-{uidB}-{nonce}
    WHEN realtime.topic() LIKE 'dm-%' THEN
      auth.uid()::text = split_part(realtime.topic(), '-', 2)
      OR auth.uid()::text = split_part(realtime.topic(), '-', 3)

    -- Room messages: room-messages-{roomId}-{nonce}
    WHEN realtime.topic() LIKE 'room-messages-%' THEN
      public.is_room_member(
        auth.uid(),
        split_part(realtime.topic(), '-', 3)::uuid
      )

    ELSE false
  END
);

-- INSERT (broadcast) policy — same logic
CREATE POLICY "authenticated_can_send_authorized_topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() LIKE 'dm-notifications-%' THEN
      auth.uid()::text = split_part(realtime.topic(), '-', 3)

    WHEN realtime.topic() LIKE 'dm-%' THEN
      auth.uid()::text = split_part(realtime.topic(), '-', 2)
      OR auth.uid()::text = split_part(realtime.topic(), '-', 3)

    WHEN realtime.topic() LIKE 'room-messages-%' THEN
      public.is_room_member(
        auth.uid(),
        split_part(realtime.topic(), '-', 3)::uuid
      )

    ELSE false
  END
);