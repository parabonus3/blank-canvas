import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { aggregateTimesheet, type SheetEntry } from "@/lib/timesheet";
import { readEveryPage } from "@/lib/paginatedRead";

export function useTimesheet(start: string, end: string, timezone: string) {
  const { user } = useAuth();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end) && start <= end;
  return useQuery({
    queryKey: ["timesheet", user?.id, start, end, timezone],
    enabled: !!user && valid,
    refetchOnMount: "always",
    queryFn: async () => {
      if (!user) return aggregateTimesheet([], start, end, timezone);
      // Broad UTC envelope followed by exact profile-local date filtering, including DST.
      const from = new Date(`${start}T00:00:00Z`); from.setUTCDate(from.getUTCDate()-1);
      const to = new Date(`${end}T00:00:00Z`); to.setUTCDate(to.getUTCDate()+2);
      const rows = await readEveryPage<SheetEntry>(async (offset, last) => {
        const { data, error } = await supabase.from("time_entries")
          .select("id,project_id,start_time,end_time,duration,task_id,project:projects(name,category:categories(name)),task:tasks(id,estimated_minutes)")
          .eq("user_id", user.id).not("end_time", "is", null)
          .gte("start_time", from.toISOString()).lt("start_time", to.toISOString())
          .order("start_time").order("id").range(offset, last);
        if (error) throw error;
        return (data || []) as SheetEntry[];
      });
      return aggregateTimesheet(rows, start, end, timezone);
    },
  });
}