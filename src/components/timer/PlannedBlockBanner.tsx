import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimeBlocks, useUpdateTimeBlock } from "@/hooks/useTimeBlocks";
import { currentOrNextBlock } from "@/lib/weekPlan";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

/** Mostra no cronômetro parado o bloco planejado (agora, próximo ou que ficou para trás). */
export function PlannedBlockBanner({ onStart, disabled }: { onStart: (b: { id: string; project_id: string | null; task_id: string | null }) => void; disabled?: boolean }) {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 60_000); return () => clearInterval(id); }, []);
  const today = useMemo(() => new Date(), []);
  const { data: blocks = [] } = useTimeBlocks(today);
  const update = useUpdateTimeBlock();
  const hit = useMemo(() => currentOrNextBlock(blocks), [blocks, tick]);
  if (!hit) return null;
  const { block, state } = hit;

  const reschedule = (minutes: number) => {
    const base = state === "missed" ? Date.now() : new Date(block.start_at).getTime();
    const dur = new Date(block.end_at).getTime() - new Date(block.start_at).getTime();
    const s = new Date(base + minutes * 60000);
    update.mutate({ id: block.id, start_at: s.toISOString(), end_at: new Date(s.getTime() + dur).toISOString(), reminder_sent_at: null } as any);
  };

  return (
    <div className={cn("rounded-xl border p-3 text-sm", state === "missed" ? "border-destructive/40 bg-destructive/5" : "border-primary/40 bg-primary/5")}>
      <div className="flex items-start gap-2">
        <CalendarClock className={cn("mt-0.5 h-4 w-4 shrink-0", state === "missed" ? "text-destructive" : "text-primary")} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {state === "now" ? t("plannedbanner.now") : state === "next" ? t("plannedbanner.next") : t("plannedbanner.missed")}
          </p>
          <p className="truncate font-semibold">{block.title} <span className="font-normal tabular-nums text-muted-foreground">· {hhmm(block.start_at)}–{hhmm(block.end_at)}</span></p>
        </div>
        {state === "missed" && (
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={t("plannedbanner.dismiss") as string} onClick={() => update.mutate({ id: block.id, is_done: true })}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" className="h-8 gap-1 text-xs" disabled={disabled || !block.project_id} onClick={() => onStart(block)}>
          <Play className="h-3.5 w-3.5" />{t("plannedbanner.start")}
        </Button>
        {state === "missed" && (
          <>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => reschedule(30)}>{t("plannedbanner.in30")}</Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => {
              const s = new Date(block.start_at); s.setDate(s.getDate() + 1);
              const dur = new Date(block.end_at).getTime() - new Date(block.start_at).getTime();
              update.mutate({ id: block.id, start_at: s.toISOString(), end_at: new Date(s.getTime() + dur).toISOString(), reminder_sent_at: null } as any);
            }}>{t("plannedbanner.tomorrow")}</Button>
          </>
        )}
      </div>
      {!block.project_id && <p className="mt-1 text-[11px] text-muted-foreground">{t("plannedbanner.no_project")}</p>}
    </div>
  );
}
