import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useHourHeatmap } from "@/hooks/useHourHeatmap";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function fmtMin(m: number) {
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return h > 0 ? `${h}h${min > 0 ? ` ${min}m` : ""}` : `${min}m`;
}

/** Heatmap 7 dias × horas: descobre o melhor horário e o melhor dia do usuário. */
export function HourHeatmapCard({ className, days = 90 }: { className?: string; days?: number }) {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const { data = [] } = useHourHeatmap(days);

  // Mobile: blocos de 2h (12 colunas). Desktop: 24 colunas.
  const bucketSize = isMobile ? 2 : 1;
  const buckets = 24 / bucketSize;

  const grid = useMemo(() => {
    const g: number[][] = Array.from({ length: 7 }, () => Array(buckets).fill(0));
    data.forEach((r) => {
      if (r.dow < 0 || r.dow > 6) return;
      g[r.dow][Math.floor(r.hour / bucketSize)] += r.total_minutes;
    });
    return g;
  }, [data, buckets, bucketSize]);

  const totals = useMemo(() => {
    const byHour = Array(24).fill(0);
    const byDay = Array(7).fill(0);
    data.forEach((r) => {
      byHour[r.hour] += r.total_minutes;
      byDay[r.dow] += r.total_minutes;
    });
    const bestHour = byHour.indexOf(Math.max(...byHour));
    const bestDay = byDay.indexOf(Math.max(...byDay));
    const total = byHour.reduce((a, b) => a + b, 0);
    return { byHour, byDay, bestHour, bestDay, total };
  }, [data]);

  const max = Math.max(1, ...grid.flat());

  const dayFmt = new Intl.DateTimeFormat(i18n.language, { weekday: "short" });
  const refSunday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, []);
  const dayLabels = [0, 1, 2, 3, 4, 5, 6].map((dow) => {
    const d = new Date(refSunday);
    d.setDate(refSunday.getDate() + dow);
    return dayFmt.format(d).replace(".", "");
  });

  const intensity = (m: number) => {
    if (m <= 0) return "bg-muted/40";
    const ratio = m / max;
    if (ratio < 0.2) return "bg-primary/20";
    if (ratio < 0.4) return "bg-primary/40";
    if (ratio < 0.65) return "bg-primary/60";
    if (ratio < 0.85) return "bg-primary/80";
    return "bg-primary";
  };

  if (totals.total <= 0) return null;

  const hourLabel = (i: number) => {
    const start = i * bucketSize;
    return String(start).padStart(2, "0");
  };

  return (
    <Card className={className}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-primary" />
            {t("heatmap.title", "Seus horários produtivos")}
          </h3>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {t("heatmap.period", { count: days, defaultValue: "últimos {{count}} dias" })}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("heatmap.best_hour", "Melhor horário")}
            </p>
            <p className="text-lg font-bold tabular-nums text-primary">
              {String(totals.bestHour).padStart(2, "0")}:00
            </p>
            <p className="text-[10px] text-muted-foreground">{fmtMin(totals.byHour[totals.bestHour])}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("heatmap.best_day", "Melhor dia")}
            </p>
            <p className="text-lg font-bold capitalize">{dayLabels[totals.bestDay]}</p>
            <p className="text-[10px] text-muted-foreground">{fmtMin(totals.byDay[totals.bestDay])}</p>
          </div>
        </div>

        <div className="space-y-1">
          {/* Hour labels */}
          <div className="flex gap-[3px] pl-8">
            {Array.from({ length: buckets }).map((_, i) => (
              <div key={i} className="min-w-0 flex-1 text-center text-[8px] text-muted-foreground tabular-nums">
                {isMobile ? (i % 2 === 0 ? hourLabel(i) : "") : i % 3 === 0 ? hourLabel(i) : ""}
              </div>
            ))}
          </div>

          {grid.map((row, dow) => (
            <div key={dow} className="flex items-center gap-[3px]">
              <div className="w-8 shrink-0 pr-1 text-right text-[9px] capitalize text-muted-foreground">
                {dayLabels[dow]}
              </div>
              {row.map((m, i) => (
                <div
                  key={i}
                  title={`${dayLabels[dow]} ${hourLabel(i)}:00 — ${fmtMin(m)}`}
                  className={cn("h-3.5 min-w-0 flex-1 rounded-sm", intensity(m))}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{t("heatmap.less", "Menos")}</span>
          <div className="flex gap-[3px]">
            <div className="h-2.5 w-2.5 rounded-sm bg-muted/40" />
            <div className="h-2.5 w-2.5 rounded-sm bg-primary/20" />
            <div className="h-2.5 w-2.5 rounded-sm bg-primary/40" />
            <div className="h-2.5 w-2.5 rounded-sm bg-primary/60" />
            <div className="h-2.5 w-2.5 rounded-sm bg-primary/80" />
            <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
          </div>
          <span>{t("heatmap.more", "Mais")}</span>
        </div>
      </CardContent>
    </Card>
  );
}
