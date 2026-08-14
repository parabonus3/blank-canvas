import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Footprints, Gauge, MapPin, Mountain, Pause, Satellite, TriangleAlert } from "lucide-react";
import { LazyRouteMap } from "@/components/gps/LazyRouteMap";
import { formatDistance, formatPace, type GeoPoint } from "@/lib/geo";
import { cn } from "@/lib/utils";

interface Props {
  points: GeoPoint[];
  distance: number;
  currentPace: number | null;
  accuracy: number | null;
  acquiring: boolean;
  error: "denied" | "unavailable" | "timeout" | null;
  paused?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  className?: string;
}

export function RunLivePanel({
  points,
  distance,
  currentPace,
  accuracy,
  acquiring,
  error,
  paused,
  collapsed,
  onToggleCollapsed,
  className,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn("rounded-2xl border border-primary/25 bg-card p-3 sm:p-4 space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex items-center gap-2 min-w-0 text-left"
          aria-expanded={!collapsed}
        >
          <span className="h-8 w-8 rounded-lg bg-primary/10 ring-1 ring-primary/25 flex items-center justify-center shrink-0">
            <Footprints className="h-4 w-4 text-primary" />
          </span>
          <span className="text-sm font-semibold truncate">{t("runs.live_title")}</span>
          {onToggleCollapsed && (
            collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              : <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </button>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border",
            error
              ? "bg-destructive/10 text-destructive border-destructive/30"
              : paused
                ? "bg-warning/15 text-warning border-warning/40"
                : acquiring
                ? "bg-warning/15 text-warning border-warning/40"
                : "bg-success/10 text-success border-success/30",
          )}
        >
          {error ? <TriangleAlert className="h-3 w-3" /> : paused ? <Pause className="h-3 w-3" /> : <Satellite className="h-3 w-3" />}
          {paused && !error
            ? t("runs.paused")
            : error === "denied"
            ? t("runs.gps_denied_short")
            : error
              ? t("runs.gps_weak")
              : acquiring
                ? t("runs.gps_acquiring")
                : t("runs.gps_ok")}
        </span>
      </div>

      {!collapsed && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-muted/50 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("runs.distance")}</p>
              <p className="text-lg sm:text-xl font-bold font-mono tabular-nums">{formatDistance(distance)}</p>
            </div>
            <div className="rounded-xl bg-muted/50 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("runs.pace")}</p>
              <p className="text-lg sm:text-xl font-bold font-mono tabular-nums">{formatPace(currentPace)}</p>
              <p className="text-[10px] text-muted-foreground">{t("runs.per_km")}</p>
            </div>
            <div className="rounded-xl bg-muted/50 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("runs.points")}</p>
              <p className="text-lg sm:text-xl font-bold font-mono tabular-nums">{points.length}</p>
              {accuracy != null && (
                <p className="text-[10px] text-muted-foreground">±{Math.round(accuracy)} m</p>
              )}
            </div>
          </div>

          {points.length > 0 ? (
            <LazyRouteMap points={points} follow={!paused} className="h-40 sm:h-52" interactive={false} />
          ) : (
            <div className="h-40 sm:h-52 rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-2 text-center px-4">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {error === "denied" ? t("runs.gps_denied_desc") : t("runs.waiting_signal")}
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-muted/40 border border-border p-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t("runs.approx_note")}
              {accuracy != null && (
                <>
                  {" "}
                  <span
                    className={cn(
                      "font-medium",
                      accuracy <= 12 ? "text-success" : accuracy <= 25 ? "text-warning" : "text-destructive",
                    )}
                  >
                    {t("runs.signal_quality", {
                      quality: accuracy <= 12
                        ? t("runs.signal_good")
                        : accuracy <= 25
                          ? t("runs.signal_fair")
                          : t("runs.signal_weak"),
                      meters: Math.round(accuracy),
                    })}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/30 p-2">
            <Gauge className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-warning-foreground/90 dark:text-warning">
              {t("runs.keep_open_hint")}
            </p>
          </div>

          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Mountain className="h-3 w-3" />
            {t("runs.free_maps_note")}
          </p>

        </>
      )}
    </div>
  );
}

