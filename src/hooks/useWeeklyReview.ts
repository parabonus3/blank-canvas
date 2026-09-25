import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone } from "@/hooks/useTimezone";
import { startOfWeekInTz } from "@/lib/timezone";

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
      const previousStart = new Date(currentStart.getTime() - 7 * 86400_000);
      const nextStart = new Date(currentStart.getTime() + 7 * 86400_000);
      const startIso = previousStart.toISOString();
      const endIso = nextStart.toISOString();

      const [entriesResult, tasksResult, blocksResult, gpsResult, goalsResult, budgetsResult] = await Promise.all([
        supabase
          .from("time_entries")
          .select("project_id, start_time, end_time, duration, project:projects(category_id)")
          .eq("user_id", user.id)
          .not("end_time", "is", null)
          .gte("start_time", startIso)
          .lt("start_time", endIso),
        supabase
          .from("tasks")
          .select("project_id, completed_at")
          .eq("user_id", user.id)
          .eq("is_completed", true)
          .gte("completed_at", startIso)
          .lt("completed_at", endIso),
        (supabase as any)
          .from("time_blocks")
          .select("start_at, end_at")
          .gte("start_at", startIso)
          .lt("start_at", endIso),
        (supabase as any)
          .from("gps_activities")
          .select("started_at, distance_meters, activity_type")
          .eq("user_id", user.id)
          .gte("started_at", startIso)
          .lt("started_at", endIso),
        supabase
          .from("goals")
          .select("project_id, target_minutes, goal_type, start_date, end_date")
          .eq("user_id", user.id)
          .eq("goal_type", "weekly")
          .lte("start_date", nextStart.toISOString().slice(0, 10))
          .gte("end_date", previousStart.toISOString().slice(0, 10)),
        (supabase as any).from("category_budgets").select("category_id, weekly_minutes"),
      ]);

      const firstError = [entriesResult, tasksResult, blocksResult, gpsResult, goalsResult, budgetsResult].find((result) => result.error)?.error;
      if (firstError) throw firstError;

      const current = emptyWeek();
      const previous = emptyWeek();
      const categoryMinutes: Record<string, number> = {};
      const projectMinutes: Record<string, number> = {};

      const inCurrent = (value: string) => new Date(value) >= currentStart;
      for (const entry of entriesResult.data || []) {
        const target = inCurrent(entry.start_time) ? current : previous;
        const seconds = Number(entry.duration || 0);
        target.focusSeconds += seconds;
        if (target === current) {
          projectMinutes[entry.project_id] = (projectMinutes[entry.project_id] || 0) + Math.round(seconds / 60);
          const project = entry.project as { category_id?: string | null } | null;
          if (project?.category_id) categoryMinutes[project.category_id] = (categoryMinutes[project.category_id] || 0) + Math.round(seconds / 60);
        }
      }

      for (const task of tasksResult.data || []) {
        if (!task.completed_at) continue;
        (inCurrent(task.completed_at) ? current : previous).completedTasks += 1;
      }

      for (const block of (blocksResult.data || []) as Array<{ start_at: string; end_at: string }>) {
        const minutes = Math.max(0, Math.round((new Date(block.end_at).getTime() - new Date(block.start_at).getTime()) / 60000));
        (inCurrent(block.start_at) ? current : previous).plannedMinutes += minutes;
      }

      for (const activity of (gpsResult.data || []) as Array<{ started_at: string; distance_meters: number; activity_type: string }>) {
        const target = inCurrent(activity.started_at) ? current : previous;
        target.distanceByType[activity.activity_type] = (target.distanceByType[activity.activity_type] || 0) + Number(activity.distance_meters || 0) / 1000;
      }

      for (const goal of goalsResult.data || []) {
        const start = new Date(`${goal.start_date}T12:00:00Z`);
        const target = start >= currentStart ? current : previous;
        target.projectGoalsTotal += 1;
        if ((projectMinutes[goal.project_id] || 0) >= goal.target_minutes && target === current) target.projectGoalsReached += 1;
      }

      const budgets = (budgetsResult.data || []) as Array<{ category_id: string; weekly_minutes: number }>;
      const overBudget = budgets.find((budget) => (categoryMinutes[budget.category_id] || 0) > budget.weekly_minutes);
      const behindGoal = (goalsResult.data || []).find((goal) => new Date(`${goal.start_date}T12:00:00Z`) >= currentStart && (projectMinutes[goal.project_id] || 0) < goal.target_minutes);

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
