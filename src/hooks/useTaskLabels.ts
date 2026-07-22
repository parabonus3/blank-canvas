import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TaskLabel {
  id: string;
  task_id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export function useTaskLabels(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task_labels", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase.from("task_labels").select("*").eq("task_id", taskId);
      if (error) throw error;
      return (data || []) as TaskLabel[];
    },
    enabled: !!taskId,
  });
}

export function useBoardLabels(boardId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["board_labels", boardId],
    queryFn: async () => {
      if (!boardId || !user) return [];
      const { data: taskIds } = await supabase.from("tasks").select("id").eq("board_id", boardId);
      const ids = (taskIds || []).map(t => t.id);
      if (!ids.length) return [];
      const { data, error } = await supabase.from("task_labels").select("*").in("task_id", ids);
      if (error) throw error;
      return (data || []) as TaskLabel[];
    },
    enabled: !!boardId && !!user,
  });
}

export function useAddLabel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ task_id, name, color }: { task_id: string; name: string; color: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("task_labels").insert({ task_id, user_id: user.id, name, color }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["task_labels", v.task_id] }),
  });
}

export function useRemoveLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, task_id }: { id: string; task_id: string }) => {
      const { error } = await supabase.from("task_labels").delete().eq("id", id);
      if (error) throw error;
      return task_id;
    },
    onSuccess: (task_id) => qc.invalidateQueries({ queryKey: ["task_labels", task_id] }),
  });
}
