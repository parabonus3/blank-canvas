import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, CheckCircle2, Clock3, Play, Target, Timer, Zap } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { SEO } from "@/components/SEO";
import { DayAgendaCard } from "@/components/timer/DayAgendaCard";
import { ActiveGoalsStrip } from "@/components/timer/ActiveGoalsStrip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAllUserTasks } from "@/hooks/useTasks";
import { useActiveTimeEntry, useStartTimer, useTimeEntries } from "@/hooks/useTimeEntries";
import { useGoalsWithProgress } from "@/hooks/useGoals";
import { useFocusRoutines } from "@/hooks/useFocusRoutines";
import { useTimezone } from "@/hooks/useTimezone";
import { startOfDayInTz } from "@/lib/timezone";

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

export default function Today() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { timezone, formatInTz } = useTimezone();
  const { data: tasks = [] } = useAllUserTasks();
  const { data: entries = [] } = useTimeEntries();
  const { data: activeEntry } = useActiveTimeEntry();
  const { data: goals = [] } = useGoalsWithProgress();
  const { data: routines = [] } = useFocusRoutines();
  const startTimer = useStartTimer();

  const todayStart = startOfDayInTz(new Date(), timezone);
  const todayEntries = entries.filter(entry => new Date(entry.start_time) >= todayStart && entry.duration);
  const focusedMinutes = Math.floor(todayEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60);
  const completedToday = tasks.filter(task => task.is_completed && task.completed_at && new Date(task.completed_at) >= todayStart).length;

  const nextTasks = useMemo(() => tasks
    .filter(task => !task.is_completed && task.status !== "archived")
    .sort((a, b) => {
      if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
      return rank[a.priority] - rank[b.priority];
    })
    .slice(0, 3), [tasks]);

  const activeGoal = [...goals].filter(goal => goal.status !== "completed").sort((a, b) => b.progress - a.progress)[0];
  const firstRoutine = routines[0];

  const startTask = async (task: (typeof nextTasks)[number]) => {
    if (!task.project_id) {
      navigate(`/tasks/board/${task.board_id}`);
      return;
    }
    await startTimer.mutateAsync({ projectId: task.project_id, taskId: task.id });
    navigate("/timer");
  };

  return (
    <MainLayout>
      <SEO title={t("today.seo_title")} path="/today" noindex localeOnly />
      <div className="mx-auto max-w-3xl space-y-4 pb-2">
        <header className="space-y-1">
          <p className="text-sm font-medium text-primary">{formatInTz(new Date(), "EEEE, dd MMMM")}</p>
          <h1 className="text-2xl font-bold">{t("today.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("today.subtitle")}</p>
        </header>

        {activeEntry && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Timer className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-primary">{t("today.active_focus")}</p>
                <p className="truncate font-semibold">{activeEntry.project?.name}</p>
              </div>
              <Button size="sm" onClick={() => navigate("/timer")}>{t("today.open_timer")}</Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="border-s-2 border-primary px-3 py-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-4 w-4" />{t("today.focused")}</div>
            <p className="mt-1 text-xl font-bold">{formatMinutes(focusedMinutes)}</p>
          </div>
          <div className="border-s-2 border-success px-3 py-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4" />{t("today.completed")}</div>
            <p className="mt-1 text-xl font-bold">{completedToday}</p>
          </div>
        </div>

        <DayAgendaCard />

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><Zap className="h-4 w-4 text-primary" />{t("today.next_tasks")}</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/tasks")}>{t("today.view_all")}</Button>
          </div>
          {nextTasks.length ? (
            <div className="divide-y rounded-md border">
              {nextTasks.map(task => (
                <div key={task.id} className="flex min-w-0 items-center gap-3 p-3">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.due_date ? formatInTz(new Date(task.due_date), "dd MMM · HH:mm") : t(`today.priority.${task.priority}`)}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0" disabled={!!activeEntry || startTimer.isPending} onClick={() => startTask(task)} aria-label={t("today.start_task")}>
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{t("today.no_tasks")}</p>}
        </section>

        {activeGoal && (
          <section className="space-y-2 rounded-md border p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-primary" />{t("today.current_goal")}</h2>
              <span className="text-sm font-semibold">{Math.round(activeGoal.progress)}%</span>
            </div>
            <p className="truncate text-sm">{activeGoal.project?.name}</p>
            <Progress value={activeGoal.progress} className="h-2" />
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/timer?project=${activeGoal.project_id}`)}>{t("today.continue_goal")}</Button>
          </section>
        )}

        {firstRoutine && (
          <section className="flex items-center gap-3 rounded-md border p-4">
            <span className="text-2xl">{firstRoutine.emoji || "▶"}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{t("today.routine")}</p>
              <p className="truncate text-sm font-semibold">{firstRoutine.title}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/timer?options=1")}>{t("today.open")}</Button>
          </section>
        )}

        <ActiveGoalsStrip />
      </div>
    </MainLayout>
  );
}
