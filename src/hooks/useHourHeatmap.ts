import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface HourHeatmapRow {
  dow: number;
  hour: number;
  total_minutes: number;
  sessions: number;
}

/** Minutos registrados por dia da semana × hora, no fuso do perfil. */
export function useHourHeatmap(days = 90) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["hourHeatmap", user?.id, days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_my_hour_heatmap", { _days: days });
      if (error) throw error;
      return ((data || []) as any[]).map((r) => ({
        dow: Number(r.dow),
        hour: Number(r.hour),
        total_minutes: Number(r.total_minutes) || 0,
        sessions: Number(r.sessions) || 0,
      })) as HourHeatmapRow[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
