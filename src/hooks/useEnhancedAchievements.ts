import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { readEveryPage } from '@/lib/paginatedRead';
import { localDateKey } from '@/lib/timesheet';
import { achievementYearWindow, aggregateAchievementYear, type AchievementEntry } from '@/lib/achievementProgress';
import { calculateTreeLevel, getCurrentPhase, getNextLevelProgress, getPhaseProgress, YEARLY_GOAL_HOURS, MAX_LEVELS, HOURS_PER_LEVEL } from '@/lib/treeConfig';

function useAchievementYear() {
  const { user } = useAuth();
  const profile = useProfile();
  const timezone = profile.data?.timezone || 'America/Sao_Paulo';
  const today = localDateKey(new Date(), timezone);
  const year = Number(today.slice(0, 4));
  const query = useQuery({
    queryKey: ['timeEntries', user?.id, 'achievementYear', year, timezone],
    enabled: !!user && profile.isSuccess,
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!user) return aggregateAchievementYear([], year, timezone);
      const window = achievementYearWindow(year);
      const entries = await readEveryPage<AchievementEntry>(async (from, to) => {
        const { data, error } = await supabase.from('time_entries').select('start_time,duration')
          .eq('user_id', user.id).not('duration', 'is', null).not('end_time', 'is', null)
          .gte('start_time', window.start).lt('start_time', window.end)
          .order('start_time').order('id').range(from, to);
        if (error) throw error;
        return data || [];
      });
      return aggregateAchievementYear(entries, year, timezone);
    },
  });
  return { ...query, year, today, timezone, isLoading: profile.isLoading || query.isLoading, isError: profile.isError || query.isError };
}

export function useEnhancedAnnualProgress() {
  const query = useAchievementYear();
  const { t } = useTranslation();
  const seconds = query.data?.totalSeconds ?? 0;
  const hours = seconds / 3600;
  const level = calculateTreeLevel(hours);
  const phase = getCurrentPhase(level);
  return { ...query, data: query.data ? {
    totalSeconds: seconds, totalHours: hours, level, phase, phaseName: t(phase.nameKey),
    phaseProgress: getPhaseProgress(level), nextLevelProgress: getNextLevelProgress(hours),
    overallProgress: Math.min(hours / YEARLY_GOAL_HOURS * 100, 100), yearlyGoal: YEARLY_GOAL_HOURS,
    maxLevels: MAX_LEVELS, hoursPerLevel: HOURS_PER_LEVEL, year: query.year, localToday: query.today,
  } : undefined };
}

export function useTodayHours() {
  const query = useAchievementYear();
  return { ...query, data: query.data?.dailyData.find(day => day.date === query.today)?.hours ?? 0 };
}

export function useDailyData() {
  const query = useAchievementYear();
  return { ...query, data: query.data?.dailyData ?? [] };
}

export function useEnhancedMonthlyBreakdown() {
  const query = useAchievementYear();
  const { i18n } = useTranslation();
  return { ...query, data: query.data?.monthlySeconds.map((seconds, index) => ({
    month: new Intl.DateTimeFormat(i18n.language, { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(query.year, index, 15))),
    hours: +(seconds / 3600).toFixed(1), target: Math.round(YEARLY_GOAL_HOURS / 12),
  })) };
}
