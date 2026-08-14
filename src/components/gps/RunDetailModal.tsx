import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LazyRouteMap } from "@/components/gps/LazyRouteMap";
import { computeSplits, formatDistance, formatDuration, formatPace } from "@/lib/geo";
import type { GpsActivity } from "@/hooks/useGpsActivities";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Props {
  activity: GpsActivity | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export function RunDetailModal({ activity, onClose, onDelete }: Props) {
  const { t, i18n } = useTranslation();
  const points = activity?.points ?? [];
  const splits = useMemo(() => computeSplits(points), [points]);

  if (!activity) return null;

  const dateLabel = new Date(activity.started_at).toLocaleString(i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Dialog open={!!activity} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {activity.project?.name || t("runs.title")}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{dateLabel}</p>
        </DialogHeader>

        <LazyRouteMap points={points} className="h-44 sm:h-72" />

        <p className="text-[11px] leading-relaxed text-muted-foreground rounded-lg bg-muted/40 border border-border p-2">
          {t("runs.approx_note")}
        </p>


        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <Stat label={t("runs.distance")} value={formatDistance(Number(activity.distance_meters))} />
          <Stat label={t("runs.time")} value={formatDuration(activity.elapsed_seconds || activity.moving_seconds)} />
          <Stat
            label={t("runs.avg_pace")}
            value={`${formatPace(activity.avg_pace_seconds_per_km ? Number(activity.avg_pace_seconds_per_km) : null)} /km`}
          />
          <Stat label={t("runs.elevation")} value={`${Math.round(Number(activity.elevation_gain_meters || 0))} m`} />
        </div>

        {splits.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("runs.splits")}
            </p>
            {(() => {
              const best = Math.min(...splits.map((s) => s.paceSecondsPerKm));
              const worst = Math.max(...splits.map((s) => s.paceSecondsPerKm));
              const range = Math.max(1, worst - best);
              return splits.map((s) => {
                const width = 30 + ((worst - s.paceSecondsPerKm) / range) * 70;
                return (
                  <div key={s.km} className="flex items-center gap-2">
                    <span className="w-8 text-xs font-mono text-muted-foreground shrink-0">
                      {s.meters < 1000 ? formatDistance(s.meters) : `${s.km}`}
                    </span>
                    <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="w-14 text-right text-xs font-mono tabular-nums">
                      {formatPace(s.paceSecondsPerKm)}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive self-start"
            onClick={() => {
              onDelete(activity.id);
              onClose();
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            {t("runs.delete")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 py-2 px-1">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-bold font-mono tabular-nums">{value}</p>
    </div>
  );
}
