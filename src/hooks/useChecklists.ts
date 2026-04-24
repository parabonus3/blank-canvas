import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ChecklistItem {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  is_completed: boolean;
  period_type: string;
  recurrence_type: "once" | "daily" | "specific_days";
  recurrence_days: string[] | null;
  position: number;
  due_date: string;
  completed_at: string | null;
  created_at: string;
  project?: {
    id: string;
    name: string;
    color: string | null;
    category?: { id: string; name: string; color: string } | null;
  } | null;
}

export interface ChecklistHistoryItem {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  period_type: string;
  completed_at: string;
  due_date: string;
  project?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}

export function useChecklists(periodFilter?: string, projectFilter?: string, recurrenceFilter?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["checklists", user?.id, periodFilter, projectFilter, recurrenceFilter],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("checklists")
        .select(`*, project:projects(id, name, color, category:categories(id, name, color))`)
        .eq("user_id", user.id)
        .order("position", { ascending: true });

      if (periodFilter && periodFilter !== "all") {
        query = query.eq("period_type", periodFilter);
      }

      if (projectFilter && projectFilter !== "all") {
        query = query.eq("project_id", projectFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      let items = (data || []) as unknown as ChecklistItem[];

      // Client-side filter for recurrence_type
      if (recurrenceFilter && recurrenceFilter !== "all") {
        items = items.filter(i => i.recurrence_type === recurrenceFilter);
      }

      return items;
    },
    enabled: !!user,
  });
}

export function useChecklistHistory(projectFilter?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["checklist_history", user?.id, projectFilter],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("checklist_history")
        .select(`*, project:projects(id, name, color)`)
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });

      if (projectFilter && projectFilter !== "all") {
        query = query.eq("project_id", projectFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ChecklistHistoryItem[];
    },
    enabled: !!user,
  });
}

export function useCreateChecklist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      title,
      project_id,
      period_type,
      recurrence_type,
      recurrence_days,
    }: {
      title: string;
      project_id: string | null;
      period_type: string;
      recurrence_type: string;
      recurrence_days: string[] | null;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { data: existing } = await supabase
        .from("checklists")
        .select("position")
        .eq("user_id", user.id)
        .order("position", { ascending: false })
        .limit(1);

      const nextPosition = existing && existing.length > 0 ? (existing[0] as any).position + 1 : 0;

      const insertData: any = {
        user_id: user.id,
        title,
        period_type,
        recurrence_type,
        recurrence_days,
        position: nextPosition,
      };
      if (project_id) insertData.project_id = project_id;

      const { data, error } = await supabase
        .from("checklists")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklists"] });
      toast({ title: "Item criado!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar item", description: error.message, variant: "destructive" });
    },
  });
}

export function useToggleChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const updateData: any = {
        is_completed,
        completed_at: is_completed ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from("checklists")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklists"] });
    },
  });
}

export function useSendToHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: ChecklistItem) => {
      if (!user) throw new Error("User not authenticated");

      // Add to history
      const historyData: any = {
        user_id: user.id,
        title: item.title,
        period_type: item.period_type,
        due_date: item.due_date,
      };
      if (item.project_id) historyData.project_id = item.project_id;

      await supabase.from("checklist_history").insert(historyData);

      if (item.recurrence_type === "once") {
        // Delete from active
        const { error } = await supabase.from("checklists").delete().eq("id", item.id);
        if (error) throw error;
      } else {
        // Reset for next cycle
        const { error } = await supabase
          .from("checklists")
          .update({ is_completed: false, completed_at: null } as any)
          .eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklists"] });
      queryClient.invalidateQueries({ queryKey: ["checklist_history"] });
    },
  });
}

export function useDeleteChecklist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("checklists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklists"] });
      toast({ title: "Item excluído!" });
    },
  });
}

export function useReorderChecklist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, newPosition, swapId, swapPosition }: {
      id: string;
      newPosition: number;
      swapId: string;
      swapPosition: number;
    }) => {
      if (!user) throw new Error("User not authenticated");

      await Promise.all([
        supabase.from("checklists").update({ position: newPosition } as any).eq("id", id),
        supabase.from("checklists").update({ position: swapPosition } as any).eq("id", swapId),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklists"] });
    },
  });
}
