import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

export interface Goal {
  id: string;
  project_id: string;
  target_minutes: number;
  goal_type: "daily" | "weekly";
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  project?: {
    id: string;
    name: string;
    category?: {
      id: string;
      name: string;
      color: string;
    } | null;
  };
}

export interface GoalWithProgress extends Goal {
  currentMinutes: number;
  progress: number;
  status: "completed" | "on-track" | "behind";
}

export function useGoals() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["goals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("goals")
        .select(`
          *,
          project:projects(
            id,
            name,
            category:categories(id, name, color)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!user,
  });
}

export function useGoalsWithProgress() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["goalsWithProgress", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      
      // Get all active goals (include goals where today is within the range)
      const todayStr = today.toISOString().split("T")[0];
      const { data: goals, error: goalsError } = await supabase
        .from("goals")
        .select(`
          *,
          project:projects(
            id,
            name,
            category:categories(id, name, color)
          )
        `)
        .eq("user_id", user.id)
        .lte("start_date", todayStr)
        .gte("end_date", todayStr);
      
      if (goalsError) throw goalsError;
      
      // Get time entries for each goal
      const goalsWithProgress: GoalWithProgress[] = await Promise.all(
        (goals || []).map(async (goal) => {
          let startDate: Date;
          let endDate: Date;
          
          if (goal.goal_type === "daily") {
            startDate = startOfDay(today);
            endDate = endOfDay(today);
          } else {
            startDate = weekStart;
            endDate = weekEnd;
          }
          
          const { data: entries } = await supabase
            .from("time_entries")
            .select("duration")
            .eq("project_id", goal.project_id)
            .eq("user_id", user.id)
            .gte("start_time", startDate.toISOString())
            .lte("start_time", endDate.toISOString())
            .not("duration", "is", null);
          
          const totalSeconds = (entries || []).reduce((sum, e) => sum + (e.duration || 0), 0);
          const currentMinutes = Math.floor(totalSeconds / 60);
          const progress = Math.min((currentMinutes / goal.target_minutes) * 100, 100);
          
          let status: "completed" | "on-track" | "behind";
          if (progress >= 100) {
            status = "completed";
          } else if (goal.goal_type === "daily") {
            const hoursRemaining = (endDate.getTime() - today.getTime()) / (1000 * 60 * 60);
            const minutesNeeded = goal.target_minutes - currentMinutes;
            status = hoursRemaining >= minutesNeeded / 60 ? "on-track" : "behind";
          } else {
            const daysRemaining = (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
            const minutesNeeded = goal.target_minutes - currentMinutes;
            status = daysRemaining >= minutesNeeded / (8 * 60) ? "on-track" : "behind"; // Assuming 8h/day max
          }
          
          return {
            ...goal,
            currentMinutes,
            progress,
            status,
          } as GoalWithProgress;
        })
      );
      
      return goalsWithProgress;
    },
    enabled: !!user,
  });
}

export function useCreateGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      project_id, 
      target_minutes, 
      goal_type,
      start_date,
      end_date,
    }: { 
      project_id: string;
      target_minutes: number;
      goal_type: "daily" | "weekly";
      start_date: string;
      end_date: string;
    }) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("goals")
        .insert({
          user_id: user.id,
          project_id,
          target_minutes,
          goal_type,
          start_date,
          end_date,
        })
        .select(`
          *,
          project:projects(
            id,
            name,
            category:categories(id, name, color)
          )
        `)
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["goals"] });
      await queryClient.invalidateQueries({ queryKey: ["goalsWithProgress"] });
      await queryClient.refetchQueries({ queryKey: ["goalsWithProgress"] });
      toast({ title: "Meta criada com sucesso!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao criar meta", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      id,
      target_minutes, 
      goal_type,
      start_date,
      end_date,
    }: { 
      id: string;
      target_minutes?: number;
      goal_type?: "daily" | "weekly";
      start_date?: string;
      end_date?: string;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (target_minutes !== undefined) updateData.target_minutes = target_minutes;
      if (goal_type !== undefined) updateData.goal_type = goal_type;
      if (start_date !== undefined) updateData.start_date = start_date;
      if (end_date !== undefined) updateData.end_date = end_date;
      
      const { data, error } = await supabase
        .from("goals")
        .update(updateData as never)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goalsWithProgress"] });
      toast({ title: "Meta atualizada!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao atualizar meta", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goalsWithProgress"] });
      toast({ title: "Meta excluída!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao excluir meta", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}
