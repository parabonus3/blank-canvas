import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PersonalStreakStatus {
  streak: number;
  bestStreak: number;
  studiedToday: boolean;
  localToday: string;
  timezone: string;
}

export function usePersonalStreak() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["personalStreak", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await (supabase as any).rpc("get_my_streak_status");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return {
        streak: Number(row.current_streak ?? 0),
        bestStreak: Number(row.best_streak ?? 0),
        studiedToday: Boolean(row.studied_today),
        localToday: String(row.local_today ?? ""),
        timezone: String(row.timezone ?? "America/Sao_Paulo"),
      } satisfies PersonalStreakStatus;
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 120_000,
  });
}