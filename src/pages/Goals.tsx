import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { MainLayout } from "@/components/layout/MainLayout";
import { useGoalsWithProgress, useCreateGoal, useDeleteGoal } from "@/hooks/useGoals";
import { useGoalHistory, useAddGoalToHistory, useGoalHistoryStats } from "@/hooks/useGoalHistory";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { GridNav } from "@/components/ui/grid-nav";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Target, Trophy, CheckCircle2, Clock, ListChecks } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { useTimezone } from "@/hooks/useTimezone";
import { cn } from "@/lib/utils";
import { GrowthTree } from "@/components/GrowthTree";
import { useAnnualProgress } from "@/hooks/useAchievements";
import { ChecklistList } from "@/components/checklist/ChecklistList";
import { useChecklistHistory } from "@/hooks/useChecklists";
import { usePagination as useChecklistPagination } from "@/hooks/usePagination";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Lock } from "lucide-react";
import { Link } from "react-router-dom";

export default function Goals() {
  const { t } = useTranslation();
  const { hasFeature } = useSubscription();
  const { formatInTz } = useTimezone();
  const { data: goals, isLoading } = useGoalsWithProgress();
  const { data: projects } = useProjects();
  const { data: goalHistory, isLoading: historyLoading } = useGoalHistory();
  const createGoal = useCreateGoal();
  const deleteGoal = useDeleteGoal();
  const addToHistory = useAddGoalToHistory();
  const historyStats = useGoalHistoryStats();
  const { data: annualProgress } = useAnnualProgress();
  const [historyProjectFilter, setHistoryProjectFilter] = useState("all");
  const { data: checklistHistory = [], isLoading: checklistHistoryLoading } = useChecklistHistory(historyProjectFilter);
  const checklistHistoryPagination = useChecklistPagination(checklistHistory, 12);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [targetHours, setTargetHours] = useState("1");
  const [goalType, setGoalType] = useState<"daily" | "weekly">("daily");
  const [activeTab, setActiveTab] = useState("active");
  const historyPagination = usePagination(goalHistory || [], 12);

  // Check for completed goals and move them to history
  useEffect(() => {
    if (goals) {
      goals.forEach(goal => {
        if (goal.status === "completed" && goal.progress >= 100) {
          addToHistory.mutate({
            project_id: goal.project_id,
            goal_type: goal.goal_type,
            target_minutes: goal.target_minutes,
            achieved_minutes: goal.currentMinutes,
            start_date: goal.start_date,
            end_date: goal.end_date
          }, {
            onSuccess: () => {
              deleteGoal.mutate(goal.id);
            }
          });
        }
      });
    }
  }, [goals]);

  const handleCreate = async () => {
    if (projectId && targetHours) {
      const today = new Date();
      let startDate: Date;
      let endDate: Date;
      
      if (goalType === "daily") {
        startDate = today;
        endDate = addDays(today, 0); // Same day
      } else {
        startDate = startOfWeek(today, { weekStartsOn: 1 });
        endDate = endOfWeek(today, { weekStartsOn: 1 });
      }
      
      await createGoal.mutateAsync({
        project_id: projectId,
        target_minutes: parseInt(targetHours) * 60,
        goal_type: goalType,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
      });
      setDialogOpen(false);
      setProjectId("");
      setTargetHours("1");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-primary";
      case "on-track": return "bg-amber-500";
      case "behind": return "bg-destructive";
      default: return "bg-muted";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return t('goals.completed');
      case "on-track": return t('goals.on_track');
      case "behind": return t('goals.behind');
      default: return "";
    }
  };

  if (!hasFeature("goals")) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
          <Lock className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-2xl font-bold">{t('goals.title')}</h2>
          <p className="text-muted-foreground max-w-md">{t('pricing.feature_locked_desc')}</p>
          <Button asChild>
            <Link to="/pricing">{t('rooms.upgrade_for_more')}</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('goals.title')}</h1>
            <p className="text-muted-foreground">{t('goals.subtitle')}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />{t('goals.new_goal')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('goals.create_goal')}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('goals.project')}</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger><SelectValue placeholder={t('timer.select_project')} /></SelectTrigger>
                    <SelectContent>{projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('goals.type')}</Label>
                  <Select value={goalType} onValueChange={(v) => setGoalType(v as "daily" | "weekly")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t('goals.daily')}</SelectItem>
                      <SelectItem value="weekly">{t('goals.weekly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('goals.target_hours')}</Label>
                  <Input type="number" min="1" value={targetHours} onChange={e => setTargetHours(e.target.value)} />
                </div>
                <Button onClick={handleCreate} disabled={!projectId || !targetHours}>{t('goals.create')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('goals.completed')}</CardTitle>
              <Trophy className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{historyStats.totalCompleted}</div>
              <p className="text-xs text-muted-foreground">{t('goals.history')}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('goals.daily')}</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{historyStats.dailyCompleted}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('goals.weekly')}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{historyStats.weeklyCompleted}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4 flex items-center justify-center">
              {annualProgress && (
                <GrowthTree
                  totalHours={annualProgress.totalHours}
                  stage={annualProgress.stage}
                  stageName={annualProgress.stageName}
                  progress={annualProgress.progress}
                  size="sm"
                  showStats={false}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <GridNav
            items={[
              { value: "active", label: t('goals.active'), icon: Target },
              { value: "checklist", label: t('checklist.title'), icon: ListChecks },
              { value: "history", label: t('goals.history'), icon: Trophy },
            ]}
            value={activeTab}
            onChange={setActiveTab}
            columns="grid-cols-3"
          />

          <TabsContent value="active" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {goals?.map(goal => (
                <Card key={goal.id}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                      {goal.project?.category && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: goal.project.category.color }} />}
                      <CardTitle className="text-lg">{goal.project?.name}</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteGoal.mutate(goal.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{goal.goal_type === "daily" ? t('goals.daily_goal') : t('goals.weekly_goal')}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-xs text-white", getStatusColor(goal.status))}>{getStatusText(goal.status)}</span>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                    <div className="flex justify-between text-sm">
                      <span>{Math.floor(goal.currentMinutes / 60)}h {goal.currentMinutes % 60}m</span>
                      <span className="text-muted-foreground">{t('goals.of')} {goal.target_minutes / 60}h</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {goals?.length === 0 && !isLoading && <p className="text-muted-foreground col-span-full text-center py-8">{t('goals.no_goals')}</p>}
            </div>
          </TabsContent>

          <TabsContent value="checklist" className="mt-4">
            <ChecklistList />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {historyPagination.paginatedItems.map(goal => (
                <Card key={goal.id} className="bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                      {goal.project?.category && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: goal.project.category.color }} />}
                      <CardTitle className="text-base">{goal.project?.name}</CardTitle>
                    </div>
                    <Badge variant="default" className="bg-primary">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t('goals.completed')}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {goal.goal_type === "daily" ? t('goals.daily_goal') : t('goals.weekly_goal')}
                      </span>
                      <span className="text-muted-foreground">
                        {formatInTz(new Date(goal.completed_at), "dd/MM/yyyy")}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t('goals.achieved')}: {Math.floor(goal.achieved_minutes / 60)}h {goal.achieved_minutes % 60}m</span>
                      <span className="text-muted-foreground">{t('goals.target')}: {goal.target_minutes / 60}h</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!goalHistory || goalHistory.length === 0) && !historyLoading && (
                <p className="text-muted-foreground col-span-full text-center py-8">{t('goals.no_history')}</p>
              )}
            </div>
            {(goalHistory?.length || 0) > 0 && (
              <PaginationControls
                currentPage={historyPagination.currentPage}
                totalPages={historyPagination.totalPages}
                pageSize={historyPagination.pageSize}
                totalItems={historyPagination.totalItems}
                setCurrentPage={historyPagination.setCurrentPage}
                setPageSize={historyPagination.setPageSize}
                pageSizeOptions={[12, 24, 48]}
              />
            )}

            {/* Checklist History */}
            <>
              <div className="flex items-center justify-between mt-6 mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  {t('checklist.completed_items')}
                </h3>
                <Select value={historyProjectFilter} onValueChange={setHistoryProjectFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={t("checklist.all_projects")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("checklist.all_projects")}</SelectItem>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {checklistHistory.length > 0 ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {checklistHistoryPagination.paginatedItems.map((item) => (
                      <div key={item.id} className="rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{item.title}</p>
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.period_type === 'daily' ? t('checklist.daily') : item.period_type === 'weekly' ? t('checklist.weekly') : item.period_type === 'monthly' ? t('checklist.monthly') : t('checklist.yearly')}</span>
                          {item.project && <span>• {item.project.name}</span>}
                          <span>• {formatInTz(new Date(item.completed_at), "dd/MM/yyyy")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {checklistHistory.length > 12 && (
                    <PaginationControls
                      currentPage={checklistHistoryPagination.currentPage}
                      totalPages={checklistHistoryPagination.totalPages}
                      pageSize={checklistHistoryPagination.pageSize}
                      totalItems={checklistHistoryPagination.totalItems}
                      setCurrentPage={checklistHistoryPagination.setCurrentPage}
                      setPageSize={checklistHistoryPagination.setPageSize}
                      pageSizeOptions={[12, 24, 48]}
                    />
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-center py-4 text-sm">{t('checklist.no_items')}</p>
              )}
            </>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
