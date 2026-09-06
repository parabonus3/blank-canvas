import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Footprints, Medal, Mountain, Route as RouteIcon, Timer, TrendingUp } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  computeTotals,
  useDeleteGpsActivity,
  useGpsActivities,
  useGpsRecords,
  type GpsActivity,
} from "@/hooks/useGpsActivities";
import { RunDetailModal } from "@/components/gps/RunDetailModal";
import { LazyRouteMap } from "@/components/gps/LazyRouteMap";
import { formatDistance, formatDuration, formatPace } from "@/lib/geo";
import {
  ACTIVITY_ICONS,
  ACTIVITY_TYPES,
  formatSpeed,
  isSpeedBased,
  normalizeActivityType,
  type ActivityType,
} from "@/lib/activityTypes";
import { cn } from "@/lib/utils";

export default function Runs() {
  const { t, i18n } = useTranslation();
  const { data: activities = [], isLoading } = useGpsActivities();
  const { data: records = [] } = useGpsRecords();
  const del = useDeleteGpsActivity();
  const [selected, setSelected] = useState<GpsActivity | null>(null);
  const [filter, setFilter] = useState<ActivityType | "all">("all");

  const availableTypes = useMemo(() => {
    const set = new Set<ActivityType>();
    activities.forEach((a) => set.add(normalizeActivityType(a.activity_type)));
    return ACTIVITY_TYPES.filter((tp) => set.has(tp));
  }, [activities]);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? activities
        : activities.filter((a) => normalizeActivityType(a.activity_type) === filter),
    [activities, filter],
  );

  const totals = computeTotals(filtered);

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

        {/* Filtro por modalidade */}
        {availableTypes.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              {t("runs.all_types")}
            </FilterChip>
            {availableTypes.map((tp) => {
              const Icon = ACTIVITY_ICONS[tp];
              return (
                <FilterChip key={tp} active={filter === tp} onClick={() => setFilter(tp)}>
                  <Icon className="h-3.5 w-3.5" />
                  {t(`runs.type_${tp}`)}
                </FilterChip>
              );
            })}
          </div>
        )}

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

        {/* Recordes por modalidade */}
        {records.length > 0 && (
          <Card>
            <CardContent className="p-3 sm:p-4 space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Medal className="h-3.5 w-3.5 text-primary" />
                {t("runs.records_title")}
              </p>
              <div className="space-y-2">
                {records.map((r) => {
                  const type = normalizeActivityType(r.activity_type);
                  const Icon = ACTIVITY_ICONS[type];
                  const speedMode = isSpeedBased(type);
                  const best = r.best_pace_seconds_per_km ? Number(r.best_pace_seconds_per_km) : null;
                  return (
                    <div
                      key={r.activity_type}
                      className="rounded-xl border border-border bg-muted/30 p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          <Icon className="h-4 w-4 text-primary shrink-0" />
                          {t(`runs.type_${type}`)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {t("runs.records_count", { count: Number(r.total_activities || 0) })}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <RecordStat
                          label={t("runs.record_total")}
                          value={formatDistance(Number(r.total_distance_meters || 0))}
                        />
                        <RecordStat
                          label={t("runs.record_longest")}
                          value={formatDistance(Number(r.longest_distance_meters || 0))}
                        />
                        <RecordStat
                          label={speedMode ? t("runs.record_speed") : t("runs.record_pace")}
                          value={
                            speedMode
                              ? `${formatSpeed(best)} ${t("runs.kmh")}`
                              : `${formatPace(best)} /km`
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-2">
              <Footprints className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">{t("runs.empty_title")}</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">{t("runs.empty_desc")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((a) => {
              const type = normalizeActivityType(a.activity_type);
              const Icon = ACTIVITY_ICONS[type];
              const speedMode = isSpeedBased(type);
              const pace = a.avg_pace_seconds_per_km ? Number(a.avg_pace_seconds_per_km) : null;
              return (
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
                        <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{a.project?.name || t(`runs.type_${type}`)}</span>
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
                          {speedMode
                            ? `${formatSpeed(pace)} ${t("runs.kmh")}`
                            : `${formatPace(pace)} /km`}
                        </span>
                        <span>↑ {Math.round(Number(a.elevation_gain_meters || 0))} m</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
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

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

function RecordStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card border border-border py-1.5">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground truncate px-1">{label}</p>
      <p className="text-xs sm:text-sm font-bold font-mono tabular-nums">{value}</p>
    </div>
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
