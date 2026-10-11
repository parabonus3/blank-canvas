import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { exceedsEstimate, taskEstimateTotal } from "@/lib/taskEstimate";
import { sheetDuration } from "@/lib/timesheet";

export function TaskEstimateNotice({ taskId, elapsed }: { taskId?: string | null; elapsed: number }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ["taskEstimate", user?.id, taskId], enabled: !!user && !!taskId, refetchInterval: 30000,
    queryFn: async () => {
      if (!taskId) return null;
      const { data, error } = await supabase.from("tasks").select("estimated_minutes,total_tracked_seconds,title").eq("id", taskId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (!data || !exceedsEstimate(taskEstimateTotal(data.total_tracked_seconds, elapsed), data.estimated_minutes)) return null;
  return <p role="status" className="break-words border-l-2 border-warning pl-3 text-sm text-warning">{data.title} · {t("timesheet.over", { time: sheetDuration(taskEstimateTotal(data.total_tracked_seconds, elapsed) - (data.estimated_minutes || 0)*60) })}</p>;
}