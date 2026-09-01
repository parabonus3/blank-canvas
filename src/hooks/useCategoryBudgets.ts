import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CategoryBudget {
  id: string;
  user_id: string;
  category_id: string;
  weekly_minutes: number;
}

export function useCategoryBudgets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["categoryBudgets", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("category_budgets")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return (data || []) as CategoryBudget[];
    },
    enabled: !!user,
  });
}

/** Minutos registrados por categoria na semana atual (segunda → domingo, hora local). */
export function useWeekMinutesByCategory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["weekMinutesByCategory", user?.id],
    queryFn: async () => {
      const now = new Date();
      const dow = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dow + 6) % 7));
      monday.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("time_entries")
        .select("duration, project:projects(category_id)")
        .eq("user_id", user!.id)
        .not("end_time", "is", null)
        .gte("start_time", monday.toISOString());
      if (error) throw error;

      const map = new Map<string, number>();
      (data || []).forEach((row: any) => {
        const cat = row.project?.category_id;
        if (!cat) return;
        map.set(cat, (map.get(cat) || 0) + Math.round((row.duration || 0) / 60));
      });
      return map;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useUpsertCategoryBudget() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ category_id, weekly_minutes }: { category_id: string; weekly_minutes: number }) => {
      if (!user) throw new Error("Not authenticated");
      if (weekly_minutes <= 0) {
        const { error } = await (supabase as any)
          .from("category_budgets")
          .delete()
          .eq("user_id", user.id)
          .eq("category_id", category_id);
        if (error) throw error;
        return null;
      }
      const { data, error } = await (supabase as any)
        .from("category_budgets")
        .upsert(
          { user_id: user.id, category_id, weekly_minutes },
          { onConflict: "user_id,category_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as CategoryBudget;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categoryBudgets"] });
    },
  });
}
