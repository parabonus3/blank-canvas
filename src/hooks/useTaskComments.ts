import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task_comments", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase.from("task_comments").select("*").eq("task_id", taskId).order("created_at");
      if (error) throw error;
      return (data || []) as TaskComment[];
    },
    enabled: !!taskId,
  });
}

export function useAddComment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ task_id, content }: { task_id: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("task_comments").insert({ task_id, user_id: user.id, content }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["task_comments", v.task_id] }),
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, task_id }: { id: string; task_id: string }) => {
      const { error } = await supabase.from("task_comments").delete().eq("id", id);
      if (error) throw error;
      return task_id;
    },
    onSuccess: (task_id) => qc.invalidateQueries({ queryKey: ["task_comments", task_id] }),
  });
}
