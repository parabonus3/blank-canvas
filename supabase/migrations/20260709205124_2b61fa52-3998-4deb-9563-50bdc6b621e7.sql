
UPDATE public.room_challenges rc
   SET is_active = false
 WHERE rc.is_active = true
   AND rc.duration_days IS NOT NULL
   AND (rc.start_date + rc.duration_days) <= (now() AT TIME ZONE public.get_room_timezone(rc.room_id))::date;
