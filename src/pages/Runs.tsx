import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Footprints, Mountain, Route as RouteIcon, Timer, TrendingUp } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  computeTotals,
  useDeleteGpsActivity,
  useGpsActivities,
  type GpsActivity,
} from "@/hooks/useGpsActivities";
import { RunDetailModal } from "@/components/gps/RunDetailModal";
import { LazyRouteMap } from "@/components/gps/LazyRouteMap";
import { formatDistance, formatDuration, formatPace } from "@/lib/geo";

export default function Runs() {
  const { t, i18n } = useTranslation();
  const { data: activities = [], isLoading } = useGpsActivities();
  const del = useDeleteGpsActivity();
  const [selected, setSelected] = useState<GpsActivity | null>(null);
  const totals = computeTotals(activities);

  return (
    <MainLayout>
      <SEO title={t("runs.title")} path="/runs" noindex localeOnly />
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Footprints className="h-6 w-6 text-primary" />
            {t("runs.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("runs.subtitle")}</p>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <TotalCard icon={RouteIcon} label={t("runs.this_month")} value={formatDistance(totals.monthMeters)} />
          <TotalCard icon={TrendingUp} label={t("runs.this_year")} value={formatDistance(totals.yearMeters)} />
          <TotalCard icon={Mountain} label={t("runs.longest")} value={formatDistance(totals.longestMeters)} />
          <TotalCard
            icon={Timer}
            label={t("runs.best_pace")}
            value={`${formatPace(totals.bestPace)} /km`}
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ) : activities.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-2">
              <Footprints className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">{t("runs.empty_title")}</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">{t("runs.empty_desc")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {activities.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className="w-full text-left rounded-2xl border border-border bg-card p-3 hover:border-primary/40 transition-colors"
              >
                <div className="flex gap-3">
                  <LazyRouteMap
                    points={a.points || []}
                    className="h-20 w-20 sm:h-24 sm:w-32 shrink-0"
                    interactive={false}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate">
                        {a.project?.name || t("runs.title")}
                      </p>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {new Date(a.started_at).toLocaleDateString(i18n.language, {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground font-mono tabular-nums">
                      <span className="text-foreground font-bold">
                        {formatDistance(Number(a.distance_meters))}
                      </span>
                      <span>{formatDuration(a.elapsed_seconds || a.moving_seconds)}</span>
                      <span>
                        {formatPace(a.avg_pace_seconds_per_km ? Number(a.avg_pace_seconds_per_km) : null)} /km
                      </span>
                      <span>↑ {Math.round(Number(a.elevation_gain_meters || 0))} m</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <RunDetailModal
          activity={selected}
          onClose={() => setSelected(null)}
          onDelete={(id) => del.mutate(id)}
        />
      </div>
    </MainLayout>
  );
}

function TotalCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] uppercase tracking-wide truncate">{label}</span>
      </div>
      <p className="text-base sm:text-lg font-bold font-mono tabular-nums mt-0.5">{value}</p>
    </div>
  );
}
