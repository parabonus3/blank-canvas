import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type TreeStage = 
  | 'seed' 
  | 'sprout' 
  | 'seedling' 
  | 'tree' 
  | 'pine' 
  | 'decorating' 
  | 'almost_done' 
  | 'complete';

export interface Milestone {
  id: string;
  name: string;
  description: string;
  hours: number;
  unlockedAt?: string;
  icon: string;
}

export const MILESTONES: Milestone[] = [
  { id: 'first_hour', name: 'Primeiro Passo', description: 'Complete sua primeira hora', hours: 1, icon: '🌱' },
  { id: 'first_week', name: 'Consistente', description: '21 horas acumuladas', hours: 21, icon: '📅' },
  { id: 'hundred_hours', name: 'Centenário', description: '100 horas de dedicação', hours: 100, icon: '💯' },
  { id: 'two_fifty', name: 'Iluminado', description: '250 horas - Luzes acesas!', hours: 250, icon: '✨' },
  { id: 'five_hundred', name: 'Dedicado', description: '500 horas de foco', hours: 500, icon: '🎯' },
  { id: 'seven_fifty', name: 'Presenteado', description: '750 horas - Presentes aparecem!', hours: 750, icon: '🎁' },
  { id: 'thousand', name: 'Mestre', description: '1000 horas de maestria', hours: 1000, icon: '👑' },
  { id: 'complete', name: 'Árvore Perfeita', description: '1100 horas - Árvore completa!', hours: 1100, icon: '⭐' }
];

export const TREE_STAGES: { stage: TreeStage; minHours: number; maxHours: number; name: string }[] = [
  { stage: 'seed', minHours: 0, maxHours: 50, name: 'Semente' },
  { stage: 'sprout', minHours: 50, maxHours: 150, name: 'Broto' },
  { stage: 'seedling', minHours: 150, maxHours: 300, name: 'Mudinha' },
  { stage: 'tree', minHours: 300, maxHours: 500, name: 'Árvore' },
  { stage: 'pine', minHours: 500, maxHours: 750, name: 'Pinheiro' },
  { stage: 'decorating', minHours: 750, maxHours: 900, name: 'Decorando' },
  { stage: 'almost_done', minHours: 900, maxHours: 1000, name: 'Quase Lá' },
  { stage: 'complete', minHours: 1000, maxHours: Infinity, name: 'Completa' }
];

export function getTreeStage(hours: number): TreeStage {
  for (const stage of TREE_STAGES) {
    if (hours >= stage.minHours && hours < stage.maxHours) {
      return stage.stage;
    }
  }
  return 'complete';
}

export function getTreeStageName(stage: TreeStage): string {
  return TREE_STAGES.find(s => s.stage === stage)?.name || 'Semente';
}

export function useAnnualProgress() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ['annualProgress', user?.id, currentYear],
    queryFn: async () => {
      if (!user) return null;

      const yearStart = new Date(currentYear, 0, 1).toISOString();
      const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59).toISOString();

      // Get all completed time entries for this year
      const { data: entries, error } = await supabase
        .from('time_entries')
        .select('duration')
        .eq('user_id', user.id)
        .gte('start_time', yearStart)
        .lte('start_time', yearEnd)
        .not('duration', 'is', null)
        .not('end_time', 'is', null);

      if (error) throw error;

      const totalSeconds = entries?.reduce((sum, e) => sum + (e.duration || 0), 0) || 0;
      const totalHours = totalSeconds / 3600;
      const stage = getTreeStage(totalHours);
      const yearlyGoal = 1100;
      const progress = Math.min((totalHours / yearlyGoal) * 100, 100);

      // Calculate unlocked milestones
      const unlockedMilestones = MILESTONES.filter(m => totalHours >= m.hours).map(m => m.id);

      return {
        totalSeconds,
        totalHours,
        stage,
        stageName: getTreeStageName(stage),
        progress,
        yearlyGoal,
        unlockedMilestones,
        year: currentYear
      };
    },
    enabled: !!user
  });
}

export function useUserAchievements() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ['userAchievements', user?.id, currentYear],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', currentYear)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });
}

export function useUpdateAchievements() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  return useMutation({
    mutationFn: async (data: {
      total_seconds: number;
      current_stage: string;
      milestones_unlocked: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', user.id)
        .eq('year', currentYear)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_achievements')
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_achievements')
          .insert({
            user_id: user.id,
            year: currentYear,
            ...data
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userAchievements'] });
    }
  });
}

export function useMonthlyBreakdown() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ['monthlyBreakdown', user?.id, currentYear],
    queryFn: async () => {
      if (!user) return [];

      const yearStart = new Date(currentYear, 0, 1).toISOString();
      const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59).toISOString();

      const { data: entries, error } = await supabase
        .from('time_entries')
        .select('duration, start_time')
        .eq('user_id', user.id)
        .gte('start_time', yearStart)
        .lte('start_time', yearEnd)
        .not('duration', 'is', null)
        .not('end_time', 'is', null);

      if (error) throw error;

      // Group by month
      const monthlyData = Array(12).fill(0);
      entries?.forEach(entry => {
        const month = new Date(entry.start_time).getMonth();
        monthlyData[month] += entry.duration || 0;
      });

      const monthNames = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ];

      return monthlyData.map((seconds, index) => ({
        month: monthNames[index],
        hours: +(seconds / 3600).toFixed(1)
      }));
    },
    enabled: !!user
  });
}
