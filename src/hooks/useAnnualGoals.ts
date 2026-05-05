import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type GoalType = "simple" | "progress" | "habit";
export type FrequencyPeriod = "weekly" | "monthly";

export interface LifeCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  position: number;
}

export interface AnnualGoal {
  id: string;
  user_id: string;
  category_id: string | null;
  year: number;
  title: string;
  description: string | null;
  goal_type: GoalType;
  target_value: number;
  current_value: number;
  unit: string | null;
  frequency_period: FrequencyPeriod | null;
  is_completed: boolean;
  completed_at: string | null;
  archived: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

const CURRENT_YEAR = new Date().getFullYear();

// ===== Categories =====
export function useLifeCategories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lifeCategories", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("life_categories")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as LifeCategory[];
    },
    enabled: !!user,
  });
}

export function useCreateCategory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { name: string; color: string; icon: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("life_categories")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lifeCategories"] });
      toast({ title: "Categoria criada" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; color?: string; icon?: string }) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from("life_categories").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lifeCategories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("life_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lifeCategories"] });
      qc.invalidateQueries({ queryKey: ["annualGoals"] });
      toast({ title: "Categoria excluída" });
    },
  });
}

// ===== Goals =====
export function useAnnualGoals(year: number = CURRENT_YEAR) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["annualGoals", user?.id, year],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("annual_goals")
        .select("*")
        .eq("year", year)
        .eq("archived", false)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as AnnualGoal[];
    },
    enabled: !!user,
  });
}

export function useAnnualGoalsStats(year: number = CURRENT_YEAR) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["annualGoalsStats", user?.id, year],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await (supabase.rpc as any)("get_annual_goals_stats", { _year: year });
      if (error) throw error;
      const row = data?.[0] || data;
      return {
        total_goals: Number(row?.total_goals || 0),
        completed_goals: Number(row?.completed_goals || 0),
        overall_progress: Number(row?.overall_progress || 0),
        categories_count: Number(row?.categories_count || 0),
      };
    },
    enabled: !!user,
  });
}

export function useCreateAnnualGoal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      category_id: string | null;
      year: number;
      title: string;
      description?: string;
      goal_type: GoalType;
      target_value: number;
      unit?: string;
      frequency_period?: FrequencyPeriod;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("annual_goals")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["annualGoals"] });
      qc.invalidateQueries({ queryKey: ["annualGoalsStats"] });
      toast({ title: "Meta criada" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateAnnualGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AnnualGoal> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from("annual_goals").update(rest as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["annualGoals"] });
      qc.invalidateQueries({ queryKey: ["annualGoalsStats"] });
    },
  });
}

export function useDeleteAnnualGoal() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("annual_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["annualGoals"] });
      qc.invalidateQueries({ queryKey: ["annualGoalsStats"] });
      toast({ title: "Meta excluída" });
    },
  });
}

export function useLogGoalProgress() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { goal_id: string; value: number; note?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("annual_goal_progress").insert({
        ...input,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["annualGoals"] });
      qc.invalidateQueries({ queryKey: ["annualGoalsStats"] });
      qc.invalidateQueries({ queryKey: ["habitPeriodCount"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useToggleSimpleGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; complete: boolean; target: number }) => {
      const { error } = await supabase
        .from("annual_goals")
        .update({
          is_completed: input.complete,
          current_value: input.complete ? input.target : 0,
          completed_at: input.complete ? new Date().toISOString() : null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["annualGoals"] });
      qc.invalidateQueries({ queryKey: ["annualGoalsStats"] });
    },
  });
}

export function useHabitPeriodCount(goalId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["habitPeriodCount", goalId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_habit_period_count", { _goal_id: goalId });
      if (error) throw error;
      return Number(data || 0);
    },
    enabled,
  });
}

export function useDuplicateGoalsToYear() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { from: number; to: number }) => {
      const { data, error } = await (supabase.rpc as any)("duplicate_goals_to_year", {
        _from: input.from,
        _to: input.to,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["annualGoals"] });
      qc.invalidateQueries({ queryKey: ["annualGoalsStats"] });
      toast({ title: `${count} meta(s) duplicada(s)` });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}
