import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, CalendarCheck2, CheckCircle2, Clock3, MapPin, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeeklyReview } from "@/hooks/useWeeklyReview";
import { cn } from "@/lib/utils";
import { activityLabelKey } from "@/lib/activityTypes";

function formatMinutes(seconds: number) {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

function change(current: number, previous: number) {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function WeeklyReviewCard({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const review = useWeeklyReview();

  if (review.isLoading) return <Skeleton className={compact ? "h-44" : "h-64"} />;
  if (review.isError) return <p role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{t("weekly_review.load_error")}</p>;
  if (!review.data) return null;

  const { current, previous } = review.data;
  const distance = Object.values(current.distanceByType).reduce((sum, value) => sum + value, 0);
  const previousDistance = Object.values(previous.distanceByType).reduce((sum, value) => sum + value, 0);
  const items = [
    { icon: Clock3, label: t("weekly_review.focus"), value: formatMinutes(current.focusSeconds), delta: change(current.focusSeconds, previous.focusSeconds) },
    { icon: CheckCircle2, label: t("weekly_review.tasks"), value: String(current.completedTasks), delta: change(current.completedTasks, previous.completedTasks) },
    { icon: CalendarCheck2, label: t("weekly_review.planned"), value: `${current.plannedMinutes}m`, delta: null },
    { icon: MapPin, label: t("weekly_review.distance"), value: `${distance.toFixed(1)} km`, delta: change(distance, previousDistance) },
  ];
  const actionRoutes = {
    goal: review.data.suggestedProjectId ? `/timer?project=${review.data.suggestedProjectId}` : "/projects",
    budget: "/dashboard",
    task: "/tasks",
    plan: "/today",
    review: "/dashboard",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4 text-primary" />{t("weekly_review.title")}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{t("weekly_review.subtitle")}</p>
          </div>
          {compact && <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>{t("weekly_review.details")}</Button>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!review.data.hasData ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{t("weekly_review.empty")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {items.map(({ icon: Icon, label, value, delta }) => (
              <div key={label} className="min-w-0 border-s-2 border-border ps-3">
                <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5 shrink-0" />{label}</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                  <span className="font-semibold tabular-nums">{value}</span>
                  {delta !== null && <span className={cn("text-[10px] tabular-nums", delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground")}>{delta > 0 ? "+" : ""}{delta}%</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {!compact && current.projectGoalsTotal > 0 && (
          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">{t("weekly_review.project_goals")}</span>
            <strong>{current.projectGoalsReached}/{current.projectGoalsTotal}</strong>
          </div>
        )}

        {!compact && Object.keys(current.distanceByType).length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground">{t("weekly_review.distance_types")}</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(current.distanceByType).map(([type, kilometers]) => (
                <span key={type} className="rounded-md bg-muted px-2 py-1 text-xs">
                  {t(activityLabelKey(type === "bike" ? "ride" : type))}: <strong>{kilometers.toFixed(1)} km</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {!compact && review.data.budgetTargetMinutes > 0 && (
          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">{t("weekly_review.budget")}</span>
            <strong>{review.data.budgetUsedMinutes}m / {review.data.budgetTargetMinutes}m</strong>
          </div>
        )}

        <Button type="button" variant="outline" onClick={() => navigate(actionRoutes[review.data.nextAction])} className="h-auto w-full justify-start gap-3 bg-muted/30 p-3 text-start hover:bg-muted">
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase text-muted-foreground">{t("weekly_review.next_action")}</span>
            <span className="block text-sm font-medium">{t(`weekly_review.actions.${review.data.nextAction}`)}</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Button>
      </CardContent>
    </Card>
  );
}