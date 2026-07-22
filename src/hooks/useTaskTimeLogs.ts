import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TaskTimeLog {
  id: string;
  task_id: string;
  user_id: string;
  seconds: number;
  logged_at: string;
  note: string | null;
  created_at: string;
}

export function useTaskTimeLogs(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task_time_logs", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase.from("task_time_logs").select("*").eq("task_id", taskId).order("logged_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TaskTimeLog[];
    },
    enabled: !!taskId,
  });
}

export function useAddTimeLog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ task_id, seconds, note }: { task_id: string; seconds: number; note?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("task_time_logs").insert({ task_id, user_id: user.id, seconds, note: note ?? null }).select().single();
      if (error) throw error;
      // Also add to the task's total
      await supabase.rpc as any; // no rpc, do in JS
      const { data: t } = await supabase.from("tasks").select("total_tracked_seconds").eq("id", task_id).maybeSingle();
      if (t) {
        await supabase.from("tasks").update({ total_tracked_seconds: (t.total_tracked_seconds || 0) + seconds }).eq("id", task_id);
      }
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["task_time_logs", v.task_id] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
