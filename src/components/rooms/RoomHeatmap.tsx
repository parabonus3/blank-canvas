import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  roomId: string;
  days?: number;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

export function RoomHeatmap({ roomId, days = 84 }: Props) {
  const { t, i18n } = useTranslation();

  const { data = [] } = useQuery({
    queryKey: ["roomHeatmapDaily", roomId, days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_room_heatmap", {
        _room_id: roomId,
        _days: days,
      });
      if (error) throw error;
      return (data || []) as { day: string; total_minutes: number; sessions: number }[];
    },
    enabled: !!roomId,
    staleTime: 60000,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const map = new Map<string, number>();
  data.forEach((r) => map.set(r.day, Number(r.total_minutes) || 0));

  const cells: { date: Date; minutes: number; key: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: d, minutes: map.get(key) || 0, key });
  }

  const max = Math.max(1, ...cells.map((c) => c.minutes));
  const intensity = (m: number) => {
    if (m <= 0) return "bg-muted/40";
    const ratio = m / max;
    if (ratio < 0.2) return "bg-primary/20";
    if (ratio < 0.4) return "bg-primary/40";
    if (ratio < 0.65) return "bg-primary/60";
    if (ratio < 0.85) return "bg-primary/80";
    return "bg-primary";
  };

  // Build weeks (columns) — start each column on Sunday for consistency
  type Cell = { date: Date; minutes: number; key: string };
  const weeks: Cell[][] = [];
  let current: Cell[] = [];
  cells.forEach((c) => {
    if (current.length === 0 && c.date.getDay() !== 0) {
      for (let p = 0; p < c.date.getDay(); p++)
        current.push({ date: new Date(0), minutes: -1, key: `pad-${p}-${c.key}` });
    }
    current.push(c);
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
  });
  if (current.length > 0) {
    while (current.length < 7) current.push({ date: new Date(0), minutes: -1, key: `tail-${current.length}` });
    weeks.push(current);
  }

  // Month labels: show short month name above the first column where that month begins
  const monthFmt = new Intl.DateTimeFormat(i18n.language, { month: "short" });
  const monthLabels = weeks.map((week, wi) => {
    const firstReal = week.find((c) => c.minutes >= 0);
    if (!firstReal) return "";
    if (wi === 0) return monthFmt.format(firstReal.date);
    const prevWeek = weeks[wi - 1];
    const prevReal = [...prevWeek].reverse().find((c) => c.minutes >= 0);
    if (!prevReal) return monthFmt.format(firstReal.date);
    return firstReal.date.getMonth() !== prevReal.date.getMonth()
      ? monthFmt.format(firstReal.date)
      : "";
  });

  // Weekday labels — use locale-aware narrow names; show on Mon/Wed/Fri rows
  const weekdayFmt = new Intl.DateTimeFormat(i18n.language, { weekday: "narrow" });
  const refSunday = new Date();
  refSunday.setDate(refSunday.getDate() - refSunday.getDay());
  const weekdayLabels = [0, 1, 2, 3, 4, 5, 6].map((dow) => {
    const d = new Date(refSunday);
    d.setDate(refSunday.getDate() + dow);
    return weekdayFmt.format(d);
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          {t("rooms.activity_heatmap")}
        </h3>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {t("rooms.heatmap_period_label", { count: days, defaultValue: "últimos {{count}} dias" })}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("rooms.heatmap_desc_v2", {
          defaultValue: "Quanto tempo a sala estudou em cada dia. Quadrado mais escuro = mais minutos.",
        })}
      </p>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 min-w-full">
          {/* Month labels row */}
          <div className="flex gap-[3px] pl-6">
            {monthLabels.map((m, i) => (
              <div
                key={`m-${i}`}
                className="w-3.5 text-[9px] text-muted-foreground font-medium capitalize text-left"
                style={{ minWidth: "14px" }}
              >
                {m}
              </div>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {/* Weekday labels column */}
            <div className="flex flex-col gap-[3px] mr-1 w-4">
              {weekdayLabels.map((wd, i) => (
                <div
                  key={`wd-${i}`}
                  className={cn(
                    "h-3.5 text-[9px] text-muted-foreground leading-[14px] text-right pr-0.5",
                    i % 2 === 0 ? "opacity-0" : "opacity-100",
                  )}
                >
                  {wd}
                </div>
              ))}
            </div>

            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((c) => (
                  <div
                    key={c.key}
                    title={c.minutes < 0 ? "" : `${fmtDate(c.date)} — ${c.minutes}min`}
                    className={cn(
                      "h-3.5 w-3.5 rounded-sm",
                      c.minutes < 0 ? "bg-transparent" : intensity(c.minutes),
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{t("rooms.heatmap_less", { defaultValue: "Menos" })}</span>
        <div className="flex gap-[3px]">
          <div className="h-2.5 w-2.5 rounded-sm bg-muted/40" />
          <div className="h-2.5 w-2.5 rounded-sm bg-primary/20" />
          <div className="h-2.5 w-2.5 rounded-sm bg-primary/40" />
          <div className="h-2.5 w-2.5 rounded-sm bg-primary/60" />
          <div className="h-2.5 w-2.5 rounded-sm bg-primary/80" />
          <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
        </div>
        <span>{t("rooms.heatmap_more", { defaultValue: "Mais" })}</span>
      </div>
    </div>
  );
}
