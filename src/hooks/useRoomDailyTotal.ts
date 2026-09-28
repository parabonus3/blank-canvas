import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// The RPC uses the room's configured day boundary when no viewer timezone is supplied.
export function useRoomDailyTotal(roomId?: string) {
  return useQuery({
    queryKey: ["roomTotalToday", roomId],
    queryFn: async () => {
      if (!roomId) return 0;
      const { data: roomTimezone, error: timezoneError } = await supabase.rpc("get_room_timezone", { _room_id: roomId });
      if (timezoneError) throw timezoneError;
      const { data, error } = await (supabase.rpc as any)("get_room_daily_progress", {
        _room_id: roomId,
        _period: "today",
        _tz: roomTimezone || "America/Sao_Paulo",
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return Number(row?.total_seconds_today || 0);
    },
    enabled: !!roomId,
    refetchInterval: 30_000,
  });
}
