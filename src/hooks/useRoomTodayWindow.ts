import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RoomTodayWindow {
  timezone: string;
  today_local: string;
  start_utc: string;
  end_utc: string;
  seconds_until_rollover: number;
}

export function useRoomTodayWindow(roomId: string | undefined) {
  return useQuery({
    queryKey: ["roomTodayWindow", roomId],
    queryFn: async (): Promise<RoomTodayWindow | null> => {
      if (!roomId) return null;
      const { data, error } = await (supabase.rpc as any)("get_room_today_window", {
        _room_id: roomId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as RoomTodayWindow) || null;
    },
    enabled: !!roomId,
    staleTime: 60000,
    refetchInterval: 60000,
  });
}
