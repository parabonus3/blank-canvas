import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  user_id: string;
  title: string;
  is_completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  completed_by: string | null;
  completed_at: string | null;
}

export function useTaskChecklists(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task_checklists", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from("task_checklists")
        .select("*")
        .eq("task_id", taskId)
        .order("position");
      if (error) throw error;
      return (data || []) as TaskChecklistItem[];
    },
    enabled: !!taskId,
  });
}

export function useCreateChecklistItem() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ task_id, title }: { task_id: string; title: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("task_checklists").select("position").eq("task_id", task_id)
        .order("position", { ascending: false }).limit(1);
      const nextPos = (existing?.[0]?.position ?? -1) + 1;
      const { data, error } = await supabase
        .from("task_checklists")
        .insert({ task_id, user_id: user.id, title, position: nextPos })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["task_checklists", v.task_id] }),
  });
}

export function useToggleChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { data, error } = await supabase.from("task_checklists").update({ is_completed }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["task_checklists", data.task_id] }),
  });
}

export function useDeleteChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, task_id }: { id: string; task_id: string }) => {
      const { error } = await supabase.from("task_checklists").delete().eq("id", id);
      if (error) throw error;
      return task_id;
    },
    onSuccess: (task_id) => qc.invalidateQueries({ queryKey: ["task_checklists", task_id] }),
  });
}
