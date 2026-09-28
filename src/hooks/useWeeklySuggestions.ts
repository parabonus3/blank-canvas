import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone } from "@/hooks/useTimezone";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeekInTz, toTimezone } from "@/lib/timezone";
import { suggestFromWeeks, type CompleteWeek } from "@/lib/weeklySuggestions";

export function useWeeklySuggestions() {
  const { user } = useAuth();
  const { timezone } = useTimezone();
  return useQuery({
    queryKey: ["weeklySuggestions", user?.id, timezone],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!user) return [];
      const current = startOfWeekInTz(new Date(), timezone);
      const wall = toTimezone(current, timezone);
      const boundary = (offset: number) => startOfWeekInTz(new Date(Date.UTC(wall.getFullYear(), wall.getMonth(), wall.getDate() + offset * 7, 12)), timezone);
      const start = boundary(-4);
      const weeks: CompleteWeek[] = Array.from({ length: 4 }, () => ({ focusSeconds: 0, completedTasks: 0, distanceByType: {} }));
      const weekIndex = (value: string) => {
        const ms = new Date(value).getTime();
        if (ms < start.getTime() || ms >= current.getTime()) return -1;
        for (let index = 0; index < 4; index++) {
          if (ms >= boundary(index - 4).getTime() && ms < boundary(index - 3).getTime()) return index;
        }
        return -1;
      };
      const pages = async <T,>(query: () => any): Promise<T[]> => {
        const rows: T[] = [];
        for (let page = 0; ; page++) {
          const { data, error } = await query().range(page * 1000, page * 1000 + 999);
          if (error) throw error;
          const batch = (data || []) as T[];
          rows.push(...batch);
          if (batch.length < 1000) return rows;
        }
      };
      const [entries, tasks, gps] = await Promise.all([
        pages<{ start_time: string; duration: number | null }>(() => supabase.from("time_entries").select("start_time,duration").eq("user_id", user.id).not("end_time", "is", null).gte("start_time", start.toISOString()).lt("start_time", current.toISOString()).order("start_time").order("id")),
        pages<{ completed_at: string | null }>(() => supabase.from("tasks").select("completed_at").eq("user_id", user.id).eq("is_completed", true).gte("completed_at", start.toISOString()).lt("completed_at", current.toISOString()).order("completed_at").order("id")),
        pages<{ started_at: string; distance_meters: number; activity_type: string }>(() => (supabase as any).from("gps_activities").select("started_at,distance_meters,activity_type").eq("user_id", user.id).gte("started_at", start.toISOString()).lt("started_at", current.toISOString()).order("started_at").order("id")),
      ]);
      for (const entry of entries) { const i = weekIndex(entry.start_time); if (i >= 0) weeks[i].focusSeconds += Number(entry.duration || 0); }
      for (const task of tasks) { const i = task.completed_at ? weekIndex(task.completed_at) : -1; if (i >= 0) weeks[i].completedTasks++; }
      for (const activity of gps) {
        const i = weekIndex(activity.started_at);
        if (i >= 0) {
          const type = activity.activity_type === "ride" ? "bike" : activity.activity_type;
          weeks[i].distanceByType[type] = (weeks[i].distanceByType[type] || 0) + Number(activity.distance_meters || 0) / 1000;
        }
      }
      return suggestFromWeeks(weeks);
    },
  });
}
