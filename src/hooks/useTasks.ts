import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "done" | "archived";

export interface Task {
  id: string;
  board_id: string;
  column_id: string | null;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  recurrence_type: string | null;
  recurrence_days: number[] | null;
  estimated_minutes: number | null;
  total_tracked_seconds: number;
  is_completed: boolean;
  completed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export function useTasks(boardId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["tasks", boardId],
    queryFn: async () => {
      if (!boardId) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("board_id", boardId)
        .order("position");
      if (error) throw error;
      return (data || []) as Task[];
    },
    enabled: !!boardId,
  });

  useEffect(() => {
    if (!boardId) return;
    const ch = supabase
      .channel(`tasks-${boardId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `board_id=eq.${boardId}` }, () => {
        qc.invalidateQueries({ queryKey: ["tasks", boardId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [boardId, qc]);

  return query;
}

export function useAllUserTasks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["all-tasks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { nullsFirst: false });
      if (error) throw error;
      return (data || []) as Task[];
    },
    enabled: !!user,
  });
}

export function useCreateTask() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: Partial<Task> & { board_id: string; title: string }) => {
      if (!user) throw new Error("Not authenticated");
      // Compute position — end of column
      const { data: existing } = await supabase
        .from("tasks")
        .select("position")
        .eq("board_id", input.board_id)
        .eq("column_id", input.column_id ?? null as any)
        .order("position", { ascending: false })
        .limit(1);
      const nextPos = (existing?.[0]?.position ?? -1) + 1;
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          board_id: input.board_id,
          column_id: input.column_id ?? null,
          project_id: input.project_id ?? null,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority ?? "medium",
          status: input.status ?? "todo",
          due_date: input.due_date ?? null,
          estimated_minutes: input.estimated_minutes ?? null,
          recurrence_type: input.recurrence_type ?? null,
          recurrence_days: input.recurrence_days ?? null,
          position: nextPos,
        })
        .select().single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["tasks", v.board_id] }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      if (updates.is_completed !== undefined) {
        (updates as any).completed_at = updates.is_completed ? new Date().toISOString() : null;
        (updates as any).status = updates.is_completed ? "done" : "todo";
      }
      const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tasks", data.board_id] });
      qc.invalidateQueries({ queryKey: ["all-tasks"] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["all-tasks"] });
      toast({ title: "Tarefa excluída" });
    },
  });
}

export function useReorderTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, newColumnId, newPosition }: { taskId: string; newColumnId: string | null; newPosition: number }) => {
      const { error } = await (supabase as any).rpc("reorder_task", {
        _task_id: taskId,
        _new_column_id: newColumnId,
        _new_position: newPosition,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
