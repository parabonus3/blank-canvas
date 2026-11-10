import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, ChevronDown, ListChecks, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTimeBlocks, useUpdateTimeBlock } from "@/hooks/useTimeBlocks";
import { routineTotalMinutes, useFocusRoutines, useRoutineRuns, type FocusRoutine } from "@/hooks/useFocusRoutines";
import { useTimezone } from "@/hooks/useTimezone";
import { blockAfter, blockMinutes, currentOrNextBlock, dayBlocksProgress } from "@/lib/weekPlan";
import { routineDayStatus, todayKeyFor } from "@/lib/routineStatus";
import { STATUS_STYLES } from "@/lib/routineAppearance";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

interface Props {
  onStartBlock: (b: { id: string; project_id: string | null; task_id: string | null }) => void;
  onStartRoutine: (r: FocusRoutine) => void;
  disabled?: boolean;
}

/** Cartão único "Agora": o que fazer agora (plano do dia + rotinas de hoje), o que vem depois e progresso do dia. */
export function NowCard({ onStartBlock, onStartRoutine, disabled }: Props) {
  const { t } = useTranslation();
  const { timezone } = useTimezone();
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 60_000); return () => clearInterval(id); }, []);
  const today = useMemo(() => new Date(), []);
  const { data: blocks = [] } = useTimeBlocks(today);
  const { data: routines = [] } = useFocusRoutines();
  const { data: runs = [] } = useRoutineRuns(1);
  const update = useUpdateTimeBlock();
  const todayKey = todayKeyFor(timezone);

  const hit = useMemo(() => currentOrNextBlock(blocks), [blocks, tick]);
  const after = useMemo(() => (hit ? blockAfter(blocks as any[], (hit.block as any).id) : null), [blocks, hit]);
  const routineRows = routines.map((r) => ({ r, status: routineDayStatus(runs.filter((x) => x.routine_id === r.id), r.weekdays, todayKey, todayKey) }));
  const todaysRoutines = routineRows.filter((x) => x.r.weekdays.includes(new Date(`${todayKey}T12:00:00Z`).getUTCDay()) || x.status === "done" || x.status === "partial");
  const pendingRoutine = todaysRoutines.find((x) => x.status === "pending");
  const blockProg = dayBlocksProgress(blocks);
  const done = blockProg.done + todaysRoutines.filter((x) => x.status === "done").length;
  const total = blockProg.total + todaysRoutines.length;

  if (!hit && !pendingRoutine && routines.length === 0 && total === 0) return null;

  const reschedule = (block: any, mode: "30" | "tomorrow") => {
    const dur = new Date(block.end_at).getTime() - new Date(block.start_at).getTime();
    const s = mode === "30" ? new Date(Date.now() + 30 * 60000) : (() => { const d = new Date(block.start_at); d.setDate(d.getDate() + 1); return d; })();
    update.mutate({ id: block.id, start_at: s.toISOString(), end_at: new Date(s.getTime() + dur).toISOString(), reminder_sent_at: null } as any);
  };

  const allDone = total > 0 && done >= total;
  const state = hit?.state;

  return (
    <section
      className={cn(
        "rounded-xl border p-3 text-sm space-y-2",
        allDone && !hit ? "border-success/50 bg-success/5" : state === "missed" ? "border-warning/50 bg-warning/5" : "border-primary/40 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          {t("nowcard.title")}
        </p>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <span className={cn("text-[11px] tabular-nums", allDone ? "text-success font-semibold" : "text-muted-foreground")}>
              {t("nowcard.progress", { done, total })}
            </span>
          )}
          <Link to="/today" className="text-[11px] text-primary hover:underline">{t("nowcard.see_day")}</Link>
        </div>
      </div>

      {total > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", allDone ? "bg-success" : "bg-primary")} style={{ width: `${Math.round((done / total) * 100)}%` }} />
        </div>
      )}

      {hit ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">
                {state === "now" ? t("plannedbanner.now") : state === "next" ? t("plannedbanner.next") : t("plannedbanner.missed")}
              </p>
              <p className="truncate font-semibold">
                {hit.block.title}{" "}
                <span className="font-normal tabular-nums text-muted-foreground">· {hhmm(hit.block.start_at)}–{hhmm(hit.block.end_at)}</span>
              </p>
            </div>
            {state === "missed" && (
              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={t("plannedbanner.dismiss") as string} onClick={() => update.mutate({ id: (hit.block as any).id, is_done: true })}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="h-8 gap-1 text-xs" disabled={disabled || !hit.block.project_id} onClick={() => onStartBlock(hit.block as any)}>
              <Play className="h-3.5 w-3.5" />{t("plannedbanner.start")}
            </Button>
            {state === "missed" && (
              <>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => reschedule(hit.block, "30")}>{t("plannedbanner.in30")}</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => reschedule(hit.block, "tomorrow")}>{t("plannedbanner.tomorrow")}</Button>
              </>
            )}
          </div>
          {!hit.block.project_id && <p className="text-[11px] text-muted-foreground">{t("plannedbanner.no_project")}</p>}
        </div>
      ) : pendingRoutine ? (
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{pendingRoutine.r.emoji || "🎯"}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground">{t("nowcard.routine_today")}</p>
            <p className="truncate font-semibold">{pendingRoutine.r.title} <span className="font-normal text-muted-foreground tabular-nums">· {routineTotalMinutes(pendingRoutine.r.steps)} min</span></p>
          </div>
          <Button size="sm" className="h-8 gap-1 text-xs" disabled={disabled} onClick={() => onStartRoutine(pendingRoutine.r)}>
            <Play className="h-3.5 w-3.5" />{t("plannedbanner.start")}
          </Button>
        </div>
      ) : allDone ? (
        <p className="flex items-center gap-1.5 font-semibold text-success"><CheckCircle2 className="h-4 w-4" />{t("nowcard.all_done")}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{t("nowcard.nothing")}</p>
      )}

      {after && (
        <p className="truncate text-[11px] text-muted-foreground">
          {t("nowcard.after")}: <span className="text-foreground">{after.title}</span> · {hhmm(after.start_at)} · {blockMinutes(after)} min
        </p>
      )}

      {routines.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
          {todaysRoutines.map(({ r, status }) => (
            <span key={r.id} title={t(`routines.status_${status}`) as string} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]", STATUS_STYLES[status].card || "border-border")}>
              <span>{r.emoji || "🎯"}</span>{r.title}
            </span>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="ml-auto h-7 gap-1 text-[11px] text-muted-foreground" disabled={disabled}>
                <ListChecks className="h-3.5 w-3.5" />{t("nowcard.start_routine")}<ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {routines.map((r) => (
                <DropdownMenuItem key={r.id} onClick={() => onStartRoutine(r)}>
                  <span className="mr-2">{r.emoji || "🎯"}</span>{r.title}
                  <span className="ml-auto pl-3 text-xs text-muted-foreground tabular-nums">{routineTotalMinutes(r.steps)} min</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </section>
  );
}
