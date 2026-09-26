import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone } from "@/hooks/useTimezone";
import { startOfWeekInTz, toTimezone } from "@/lib/timezone";

export interface WeekSnapshot {
  focusSeconds: number;
  completedTasks: number;
  plannedMinutes: number;
  distanceByType: Record<string, number>;
  projectGoalsReached: number;
  projectGoalsTotal: number;
}

export interface WeeklyReviewData {
  current: WeekSnapshot;
  previous: WeekSnapshot;
  categoryMinutes: Record<string, number>;
  nextAction: "goal" | "budget" | "task" | "plan" | "review";
  suggestedProjectId: string | null;
  hasData: boolean;
}

const emptyWeek = (): WeekSnapshot => ({
  focusSeconds: 0,
  completedTasks: 0,
  plannedMinutes: 0,
  distanceByType: {},
  projectGoalsReached: 0,
  projectGoalsTotal: 0,
});

export function useWeeklyReview() {
  const { user } = useAuth();
  const { timezone } = useTimezone();

  return useQuery({
    queryKey: ["weeklyReview", user?.id, timezone],
    queryFn: async (): Promise<WeeklyReviewData> => {
      if (!user) {
        return { current: emptyWeek(), previous: emptyWeek(), categoryMinutes: {}, nextAction: "review", suggestedProjectId: null, hasData: false };
      }

      const currentStart = startOfWeekInTz(new Date(), timezone);
      // Advance calendar weeks, not UTC hours: daylight-saving weeks may be 167/169 hours.
      const wallMonday = toTimezone(currentStart, timezone);
      const weekBoundary = (days: number) => startOfWeekInTz(
        new Date(Date.UTC(wallMonday.getFullYear(), wallMonday.getMonth(), wallMonday.getDate() + days, 12)), timezone
      );
      const previousStart = weekBoundary(-7);
      const nextStart = weekBoundary(7);
      const dateKey = (date: Date) => {
        const wall = toTimezone(date, timezone);
        return `${wall.getFullYear()}-${String(wall.getMonth() + 1).padStart(2, "0")}-${String(wall.getDate()).padStart(2, "0")}`;
      };
      const startIso = previousStart.toISOString();
      const endIso = nextStart.toISOString();

      // PostgREST returns at most 1000 rows in a single response. Fetch every page.
      const allPages = async <T,>(makeQuery: () => any): Promise<T[]> => {
        const rows: T[] = [];
        for (let page = 0; ; page++) {
          const { data, error } = await makeQuery().range(page * 1000, (page + 1) * 1000 - 1);
          if (error) throw error;
          const batch = (data || []) as T[];
          rows.push(...batch);
          if (batch.length < 1000) return rows;
        }
      };

      const [entries, tasks, blocks, gps, goals, budgets] = await Promise.all([
        allPages<{ project_id: string; start_time: string; duration: number | null; project: { category_id: string | null } | null }>(() => supabase
          .from("time_entries")
          .select("project_id, start_time, duration, project:projects(category_id)")
          .eq("user_id", user.id)
          .not("end_time", "is", null)
          .gte("start_time", startIso)
          .lt("start_time", endIso).order("start_time").order("id")),
        allPages<{ project_id: string | null; completed_at: string | null }>(() => supabase
          .from("tasks")
          .select("project_id, completed_at")
          .eq("user_id", user.id)
          .eq("is_completed", true)
          .gte("completed_at", startIso)
          .lt("completed_at", endIso).order("completed_at").order("id")),
        allPages<{ start_at: string; end_at: string }>(() => (supabase as any)
          .from("time_blocks")
          .select("start_at, end_at")
          .eq("user_id", user.id)
          .gte("start_at", startIso)
          .lt("start_at", endIso).order("start_at").order("id")),
        allPages<{ started_at: string; distance_meters: number; activity_type: string }>(() => (supabase as any)
          .from("gps_activities")
          .select("started_at, distance_meters, activity_type")
          .eq("user_id", user.id)
          .gte("started_at", startIso)
          .lt("started_at", endIso).order("started_at").order("id")),
        allPages<{ project_id: string; target_minutes: number; start_date: string; end_date: string }>(() => supabase
          .from("goals")
          .select("project_id, target_minutes, start_date, end_date")
          .eq("user_id", user.id)
          .eq("goal_type", "weekly")
          .lte("start_date", dateKey(nextStart))
          .gte("end_date", dateKey(previousStart)).order("start_date").order("id")),
        allPages<{ category_id: string; weekly_minutes: number }>(() => (supabase as any).from("category_budgets").select("category_id, weekly_minutes").eq("user_id", user.id).order("id")),
      ]);

      const current = emptyWeek();
      const previous = emptyWeek();
      const categoryMinutes: Record<string, number> = {};
      const projectSeconds: Record<string, number> = {};
      const previousProjectSeconds: Record<string, number> = {};
      const categorySeconds: Record<string, number> = {};

      const inCurrent = (value: string) => new Date(value) >= currentStart;
      for (const entry of entries) {
        const target = inCurrent(entry.start_time) ? current : previous;
        const seconds = Number(entry.duration || 0);
        target.focusSeconds += seconds;
        const projectTotals = target === current ? projectSeconds : previousProjectSeconds;
        projectTotals[entry.project_id] = (projectTotals[entry.project_id] || 0) + seconds;
        if (target === current && entry.project?.category_id) {
          categorySeconds[entry.project.category_id] = (categorySeconds[entry.project.category_id] || 0) + seconds;
        }
      }
      for (const [categoryId, seconds] of Object.entries(categorySeconds)) categoryMinutes[categoryId] = Math.floor(seconds / 60);

      for (const task of tasks) {
        if (!task.completed_at) continue;
        (inCurrent(task.completed_at) ? current : previous).completedTasks += 1;
      }

      for (const block of blocks) {
        const minutes = Math.max(0, Math.round((new Date(block.end_at).getTime() - new Date(block.start_at).getTime()) / 60000));
        (inCurrent(block.start_at) ? current : previous).plannedMinutes += minutes;
      }

      for (const activity of gps) {
        const target = inCurrent(activity.started_at) ? current : previous;
        target.distanceByType[activity.activity_type] = (target.distanceByType[activity.activity_type] || 0) + Number(activity.distance_meters || 0) / 1000;
      }

      for (const goal of goals) {
        // Project goals have inclusive calendar dates, independent of the device timezone.
        for (const [week, start, seconds] of [[current, dateKey(currentStart), projectSeconds], [previous, dateKey(previousStart), previousProjectSeconds]] as const) {
          if (goal.start_date <= start && goal.end_date >= start) {
            week.projectGoalsTotal++;
            if ((seconds[goal.project_id] || 0) >= goal.target_minutes * 60) week.projectGoalsReached++;
          }
        }
      }

      const overBudget = budgets.find((budget) => (categoryMinutes[budget.category_id] || 0) > budget.weekly_minutes);
      const behindGoal = goals.find((goal) => goal.start_date <= dateKey(currentStart) && goal.end_date >= dateKey(currentStart) && (projectSeconds[goal.project_id] || 0) < goal.target_minutes * 60);

      let nextAction: WeeklyReviewData["nextAction"] = "review";
      if (behindGoal) nextAction = "goal";
      else if (overBudget) nextAction = "budget";
      else if (current.completedTasks === 0) nextAction = "task";
      else if (current.plannedMinutes === 0) nextAction = "plan";

      const hasData = current.focusSeconds > 0 || current.completedTasks > 0 || current.plannedMinutes > 0 || Object.keys(current.distanceByType).length > 0;
      return {
        current,
        previous,
        categoryMinutes,
        nextAction,
        suggestedProjectId: behindGoal?.project_id || null,
        hasData,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}
