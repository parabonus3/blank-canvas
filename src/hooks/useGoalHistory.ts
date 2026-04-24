import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GoalHistoryEntry {
  id: string;
  user_id: string;
  project_id: string;
  goal_type: string;
  target_minutes: number;
  achieved_minutes: number;
  completed_at: string;
  start_date: string;
  end_date: string;
  created_at: string;
  project?: {
    name: string;
    category?: {
      name: string;
      color: string;
    };
  };
}

export function useGoalHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['goalHistory', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('goal_history')
        .select(`
          *,
          project:projects(
            name,
            category:categories(name, color)
          )
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data as GoalHistoryEntry[];
    },
    enabled: !!user
  });
}

export function useAddGoalToHistory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (goal: {
      project_id: string;
      goal_type: string;
      target_minutes: number;
      achieved_minutes: number;
      start_date: string;
      end_date: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('goal_history')
        .insert({
          user_id: user.id,
          ...goal
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalHistory'] });
    }
  });
}

export function useGoalHistoryStats() {
  const { data: history } = useGoalHistory();

  const stats = {
    totalCompleted: history?.length || 0,
    dailyCompleted: history?.filter(g => g.goal_type === 'daily').length || 0,
    weeklyCompleted: history?.filter(g => g.goal_type === 'weekly').length || 0,
    thisMonthCompleted: history?.filter(g => {
      const date = new Date(g.completed_at);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length || 0,
    totalMinutesAchieved: history?.reduce((sum, g) => sum + g.achieved_minutes, 0) || 0
  };

  return stats;
}
