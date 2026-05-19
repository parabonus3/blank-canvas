import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { GridNav } from "@/components/ui/grid-nav";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Target, Trophy, ListChecks, Folder, CheckCircle2, Lock, MoreVertical, Trash2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAnnualGoals, useAnnualGoalsStats, useLifeCategories, useDeleteCategory, useDuplicateGoalsToYear } from "@/hooks/useAnnualGoals";
import { CreateCategoryDialog } from "@/components/goals/CreateCategoryDialog";
import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { GoalCard } from "@/components/goals/GoalCard";
import { ChecklistList } from "@/components/checklist/ChecklistList";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as Icons from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const key = name.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  const C = (Icons as any)[key] || Icons.Target;
  return <C className={className} />;
}

export default function Goals() {
  const { t } = useTranslation();
  const { hasFeature } = useSubscription();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [activeTab, setActiveTab] = useState("annual");
  const { data: categories = [] } = useLifeCategories();
  const { data: goals = [] } = useAnnualGoals(year);
  const { data: stats } = useAnnualGoalsStats(year);
  const deleteCategory = useDeleteCategory();
  const duplicate = useDuplicateGoalsToYear();

  if (!hasFeature("goals")) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
          <Lock className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-2xl font-bold">{t("annual_goals.title")}</h2>
          <p className="text-muted-foreground max-w-md">{t("pricing.feature_locked_desc")}</p>
          <Button asChild><Link to="/pricing">{t("rooms.upgrade_for_more")}</Link></Button>
        </div>
      </MainLayout>
    );
  }

  const goalsByCategory = (catId: string | null) => goals.filter((g) => g.category_id === catId);
  const uncategorized = goalsByCategory(null);

  // Category-level progress
  const categoryProgress = (catId: string) => {
    const list = goalsByCategory(catId);
    if (!list.length) return 0;
    const sum = list.reduce((acc, g) => acc + Math.min(100, (g.current_value / Math.max(1, g.target_value)) * 100), 0);
    return sum / list.length;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("annual_goals.title")} {year}</h1>
            <p className="text-sm text-muted-foreground">{t("annual_goals.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <CreateCategoryDialog
              trigger={<Button variant="outline" size="sm"><Folder className="h-4 w-4 mr-1.5" />{t("annual_goals.new_category")}</Button>}
            />
            <CreateGoalDialog
              year={year}
              categories={categories}
              trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1.5" />{t("annual_goals.new_goal")}</Button>}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <GridNav
            items={[
              { value: "annual", label: t("annual_goals.tab_annual"), icon: Target },
              { value: "checklist", label: t("checklist.title"), icon: ListChecks },
              { value: "history", label: t("annual_goals.tab_history"), icon: Trophy },
            ]}
            value={activeTab}
            onChange={setActiveTab}
            columns="grid-cols-3"
          />

          <TabsContent value="annual" className="mt-4 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">{t("annual_goals.overall_progress")}</div>
                <div className="text-2xl font-bold mt-1">{Math.round(stats?.overall_progress || 0)}%</div>
                <Progress value={stats?.overall_progress || 0} className="h-1.5 mt-2" />
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">{t("annual_goals.goals_completed")}</div>
                <div className="text-2xl font-bold mt-1">{stats?.completed_goals || 0}<span className="text-sm text-muted-foreground">/{stats?.total_goals || 0}</span></div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">{t("annual_goals.categories_count")}</div>
                <div className="text-2xl font-bold mt-1">{stats?.categories_count || 0}</div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5">
                <div className="text-xs text-muted-foreground">{t("annual_goals.year")}</div>
                <div className="text-2xl font-bold mt-1 flex items-center gap-1.5"><Sparkles className="h-5 w-5 text-primary" />{year}</div>
              </Card>
            </div>

            {/* Category progress bars */}
            {categories.length > 0 && (
              <Card className="p-4 space-y-3">
                <h3 className="text-sm font-semibold">{t("annual_goals.progress_by_category")}</h3>
                <div className="space-y-2.5">
                  {categories.map((c) => {
                    const pct = categoryProgress(c.id);
                    return (
                      <div key={c.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <CategoryIcon name={c.icon} className="h-3.5 w-3.5" />
                            <span className="font-medium">{c.name}</span>
                            <span className="text-muted-foreground">({goalsByCategory(c.id).length})</span>
                          </span>
                          <span className="text-muted-foreground">{Math.round(pct)}%</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Empty state */}
            {categories.length === 0 && uncategorized.length === 0 && (
              <Card className="p-10 text-center space-y-3">
                <Folder className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">{t("annual_goals.no_categories")}</p>
                <CreateCategoryDialog
                  trigger={<Button><Folder className="h-4 w-4 mr-1.5" />{t("annual_goals.new_category")}</Button>}
                />
              </Card>
            )}

            {/* Categories with goals */}
            {categories.map((c) => {
              const list = goalsByCategory(c.id);
              return (
                <div key={c.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${c.color}20`, color: c.color }}>
                        <CategoryIcon name={c.icon} className="h-4 w-4" />
                      </span>
                      <h3 className="font-semibold">{c.name}</h3>
                      <span className="text-xs text-muted-foreground">{list.length} {t("annual_goals.goals_label")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CreateGoalDialog
                        year={year}
                        categories={categories}
                        defaultCategoryId={c.id}
                        trigger={<Button variant="ghost" size="sm"><Plus className="h-4 w-4" /></Button>}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (confirm(t("annual_goals.confirm_delete_category"))) deleteCategory.mutate(c.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {list.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-10">{t("annual_goals.no_goals_in_category")}</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {list.map((g) => <GoalCard key={g.id} goal={g} categoryColor={c.color} categories={categories} />)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Uncategorized */}
            {uncategorized.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-muted-foreground">{t("annual_goals.no_category")}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {uncategorized.map((g) => <GoalCard key={g.id} goal={g} categories={categories} />)}
                </div>
              </div>
            )}

            {/* Duplicate to next year */}
            {goals.length > 0 && year === CURRENT_YEAR && (
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm(t("annual_goals.confirm_duplicate"))) {
                      duplicate.mutate({ from: year, to: year + 1 });
                    }
                  }}
                >
                  {t("annual_goals.duplicate_to_next_year")}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="checklist" className="mt-4">
            <ChecklistList />
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            <h3 className="text-sm font-semibold">{t("annual_goals.completed_goals")}</h3>
            {goals.filter((g) => g.is_completed).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("annual_goals.no_completed_yet")}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {goals.filter((g) => g.is_completed).map((g) => {
                  const cat = categories.find((c) => c.id === g.category_id);
                  return (
                    <Card key={g.id} className="p-4 bg-gradient-to-br from-primary/5 to-transparent">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm truncate">{g.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {cat?.name || t("annual_goals.no_category")} • {g.completed_at && new Date(g.completed_at).toLocaleDateString()}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
