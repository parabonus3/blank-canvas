import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Flame } from "lucide-react";

interface Props {
  roomId: string;
}

export function RoomStreakBadge({ roomId }: Props) {
  const { data: streak = 0 } = useQuery({
    queryKey: ["roomStreak", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_room_streak", { _room_id: roomId });
      if (error) throw error;
      return (data || 0) as number;
    },
    enabled: !!roomId,
    staleTime: 60000,
  });

  if (streak < 2) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 text-orange-600 px-2.5 py-1 text-xs font-semibold">
      <Flame className="h-3.5 w-3.5" />
      {streak}
    </div>
  );
}
