import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, TrendingUp, Repeat, Trash2, Plus } from "lucide-react";
import { AnnualGoal, useDeleteAnnualGoal, useLogGoalProgress, useToggleSimpleGoal, useHabitPeriodCount } from "@/hooks/useAnnualGoals";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

interface Props { goal: AnnualGoal; categoryColor?: string }

export function GoalCard({ goal, categoryColor }: Props) {
  const { t } = useTranslation();
  const del = useDeleteAnnualGoal();
  const logProgress = useLogGoalProgress();
  const toggle = useToggleSimpleGoal();
  const [customValue, setCustomValue] = useState("");

  const progressPct = Math.min(100, (goal.current_value / Math.max(1, goal.target_value)) * 100);

  const habitCount = useHabitPeriodCount(goal.id, goal.goal_type === "habit");

  const fireCelebration = () => {
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
  };

  const handleSimpleToggle = async () => {
    const newComplete = !goal.is_completed;
    await toggle.mutateAsync({ id: goal.id, complete: newComplete, target: goal.target_value });
    if (newComplete) fireCelebration();
  };

  const handleAdd = async (val: number) => {
    if (val <= 0) return;
    const wouldComplete = goal.current_value + val >= goal.target_value;
    await logProgress.mutateAsync({ goal_id: goal.id, value: val });
    if (wouldComplete && !goal.is_completed) fireCelebration();
  };

  const handleCustomAdd = async () => {
    const val = Number(customValue);
    if (!val) return;
    await handleAdd(val);
    setCustomValue("");
  };

  const TypeIcon = goal.goal_type === "simple" ? CheckCircle2 : goal.goal_type === "progress" ? TrendingUp : Repeat;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Card className={cn("p-4 space-y-3 relative overflow-hidden", goal.is_completed && "bg-primary/5 border-primary/30")}>
        {categoryColor && (
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: categoryColor }} />
        )}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {goal.goal_type === "simple" ? (
              <Checkbox
                checked={goal.is_completed}
                onCheckedChange={handleSimpleToggle}
                className="mt-0.5 h-5 w-5 shrink-0"
              />
            ) : (
              <TypeIcon className="h-4 w-4 mt-1 text-primary shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <h4 className={cn("font-medium text-sm truncate", goal.is_completed && "line-through text-muted-foreground")}>
                {goal.title}
              </h4>
              {goal.description && <p className="text-xs text-muted-foreground line-clamp-1">{goal.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {goal.is_completed && (
              <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] px-1.5 py-0">
                {t("annual_goals.completed")}
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(goal.id)}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {goal.goal_type === "progress" && (
          <>
            <Progress value={progressPct} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">
                {goal.current_value}{goal.unit ? ` ${goal.unit}` : ""} / {goal.target_value}{goal.unit ? ` ${goal.unit}` : ""}
              </span>
              <span className="text-muted-foreground">{progressPct.toFixed(0)}%</span>
            </div>
            {!goal.is_completed && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 5, 10].map((n) => (
                  <Button key={n} size="sm" variant="outline" className="h-8 px-2.5 text-xs" onClick={() => handleAdd(n)}>
                    +{n}
                  </Button>
                ))}
                <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                  <Input
                    type="number"
                    placeholder={t("annual_goals.quick_add")}
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button size="icon" variant="default" className="h-8 w-8 shrink-0" onClick={handleCustomAdd}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {goal.goal_type === "habit" && (
          <>
            <Progress value={progressPct} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">
                {habitCount.data ?? 0} / {goal.target_value} {goal.frequency_period === "weekly" ? t("annual_goals.this_week") : t("annual_goals.this_month")}
              </span>
              <span className="text-muted-foreground">
                {goal.current_value}/{goal.target_value} {t("annual_goals.year")}
              </span>
            </div>
            {!goal.is_completed && (
              <Button size="sm" className="w-full h-8" onClick={() => handleAdd(1)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> {t("annual_goals.log_today")}
              </Button>
            )}
          </>
        )}
      </Card>
    </motion.div>
  );
}
