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
  const { t } = useTranslation();

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

  // Build last `days` worth of dates
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
  const weeks: typeof cells[] = [];
  let current: typeof cells = [];
  cells.forEach((c) => {
    if (current.length === 0 && c.date.getDay() !== 0) {
      // pad start
      for (let p = 0; p < c.date.getDay(); p++) current.push({ date: new Date(0), minutes: -1, key: `pad-${p}` });
    }
    current.push(c);
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
  });
  if (current.length > 0) weeks.push(current);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        {t("rooms.activity_heatmap")}
      </h3>
      <p className="text-xs text-muted-foreground">{t("rooms.heatmap_desc")}</p>
      <div className="overflow-x-auto">
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((c) => (
                <div
                  key={c.key}
                  title={c.minutes < 0 ? "" : `${fmtDate(c.date)} — ${c.minutes}min`}
                  className={cn(
                    "h-3 w-3 rounded-sm",
                    c.minutes < 0 ? "bg-transparent" : intensity(c.minutes),
                  )}
                />
              ))}
            </div>
          ))}
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
