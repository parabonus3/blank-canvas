import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarRange, ChevronLeft, ChevronRight, Copy, CopyPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects } from "@/hooks/useProjects";
import { useWeekTimeBlocks, useCreateTimeBlock, useCreateTimeBlocksBulk, useDeleteTimeBlock, useUpdateTimeBlock, type TimeBlock } from "@/hooks/useTimeBlocks";
import { useFocusRoutines, routineTotalMinutes } from "@/hooks/useFocusRoutines";
import {
  weekDays, plannedByDay, copyDayToEmptyDays, copyWeekToEmptyDays, blockMinutes, sameLocalDay,
  shiftedWeekStart, clampWeekOffset, MAX_WEEKS_AHEAD, MAX_WEEKS_BACK,
} from "@/lib/weekPlan";
import { cn } from "@/lib/utils";

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];
const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmt = (min: number) => `${Math.floor(min / 60)}h${pad(min % 60)}`;
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Planejar semanas: navega da semana atual até 8 à frente, com copiar semana, repetir dia e mover blocos. */
export function WeekPlanCard({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const now = useMemo(() => new Date(), []);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [offset, setOffset] = useState(0);
  const weekStart = useMemo(() => shiftedWeekStart(now, offset), [now, offset]);
  const prevStart = useMemo(() => shiftedWeekStart(now, offset - 1), [now, offset]);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const { data: blocks = [] } = useWeekTimeBlocks(weekStart);
  const { data: prevBlocks = [] } = useWeekTimeBlocks(prevStart);
  const { data: projects = [] } = useProjects();
  const { data: routines = [] } = useFocusRoutines();
  const create = useCreateTimeBlock();
  const update = useUpdateTimeBlock();
  const bulk = useCreateTimeBlocksBulk();
  const del = useDeleteTimeBlock();

  const todayIdx = days.findIndex((d) => sameLocalDay(d, now));
  const [sel, setSel] = useState(Math.max(0, todayIdx));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TimeBlock | null>(null);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("none");
  const [date, setDate] = useState(isoDay(now));
  const [start, setStart] = useState("09:00");
  const [duration, setDuration] = useState(60);

  const goWeek = (n: number) => {
    const next = clampWeekOffset(n);
    setOffset(next);
    setSel(next === 0 ? Math.max(0, weekDays(now).findIndex((d) => sameLocalDay(d, now))) : 0);
  };

  const isPast = (d: Date) => d < today;
  const perDay = plannedByDay(blocks, days);
  const total = perDay.reduce((s, d) => s + d.minutes, 0);
  const prevTotal = prevBlocks.reduce((s, b) => s + blockMinutes(b), 0);
  const emptyDays = perDay.filter((d) => !isPast(d.day) && d.blocks.length === 0).length;
  const max = Math.max(60, ...perDay.map((d) => d.minutes));
  const selDay = perDay[sel] ?? perDay[0];
  const routineMin = routines
    .filter((r) => r.steps.length > 0 && r.weekdays.includes(selDay.day.getDay()))
    .reduce((s, r) => s + routineTotalMinutes(r.steps), 0);
  const emptyFuture = perDay.filter((d, i) => i !== sel && !isPast(d.day));
  const weekRows = copyWeekToEmptyDays(prevBlocks, perDay, now);
  const weekIsPast = days[6] < today;
  const isWeekendPrompt = offset === 0 && [5, 6, 0].includes(now.getDay());

  const label = (d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(i18n.language, opts).format(d);
  const range = `${label(days[0], { day: "numeric", month: "short" })} – ${label(days[6], { day: "numeric", month: "short" })}`;

  const openNew = () => {
    setEditing(null); setTitle(""); setProjectId("none"); setDate(isoDay(selDay.day)); setStart("09:00"); setDuration(60); setOpen(true);
  };
  const openEdit = (b: TimeBlock) => {
    setEditing(b); setTitle(b.title); setProjectId(b.project_id ?? "none");
    setDate(isoDay(new Date(b.start_at))); setStart(hhmm(b.start_at)); setDuration(blockMinutes(b) || 60); setOpen(true);
  };

  const save = async () => {
    if (!title.trim()) return;
    const [y, mo, d] = date.split("-").map(Number);
    const [h, m] = start.split(":").map(Number);
    const s = new Date(y, (mo || 1) - 1, d || 1, h || 0, m || 0, 0, 0);
    const payload = { title: title.trim(), start_at: s.toISOString(), end_at: new Date(s.getTime() + duration * 60000).toISOString(), project_id: projectId !== "none" ? projectId : null };
    if (editing) await update.mutateAsync({ id: editing.id, ...payload, reminder_sent_at: null } as any);
    else await create.mutateAsync(payload);
    setOpen(false);
  };

  const repeatDay = async () => {
    const rows = copyDayToEmptyDays(selDay.blocks, emptyFuture);
    await bulk.mutateAsync(rows);
    toast.success(t("weekplan.copied", { count: rows.length }));
  };
  const copyWeek = async () => {
    await bulk.mutateAsync(weekRows);
    toast.success(t("weekplan.copied", { count: weekRows.length }));
  };

  const diff = total - prevTotal;

  return (
    <Card className={className}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarRange className="h-4 w-4 text-primary" />{t("weekplan.title")}
          </h3>
          <span className="text-xs tabular-nums text-muted-foreground">{t("weekplan.total", { h: Math.floor(total / 60), m: pad(total % 60) })}</span>
        </div>

        <div className="flex items-center justify-between gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={offset <= -MAX_WEEKS_BACK} onClick={() => goWeek(offset - 1)} aria-label={t("weekplan.prev_week") as string}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 text-center">
            <p className="truncate text-xs font-semibold">
              {offset === 0 ? t("weekplan.this_week") : offset === 1 ? t("weekplan.next_week") : range}
            </p>
            <p className="text-[11px] text-muted-foreground">{range}</p>
          </div>
          <div className="flex items-center gap-1">
            {offset !== 0 && (
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => goWeek(0)}>{t("weekplan.this_week")}</Button>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={offset >= MAX_WEEKS_AHEAD} onClick={() => goWeek(offset + 1)} aria-label={t("weekplan.next_week") as string}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isWeekendPrompt && (
          <button onClick={() => goWeek(1)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-left text-xs">
            <span className="font-medium">{t("weekplan.plan_next_prompt")}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
          </button>
        )}

        <div className="grid grid-cols-7 gap-1" role="tablist">
          {perDay.map((d, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={sel === i}
              onClick={() => setSel(i)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border px-0.5 py-1.5 text-[10px] transition-colors",
                sel === i ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted",
                isPast(d.day) && sel !== i && "opacity-60",
              )}
            >
              <span className={cn("font-medium uppercase", i === todayIdx && "text-primary")}>{label(d.day, { weekday: "narrow" })}</span>
              <span className="tabular-nums">{d.day.getDate()}</span>
              <div className="flex h-8 w-2 items-end overflow-hidden rounded-full bg-muted">
                <div className="w-full rounded-full bg-primary" style={{ height: `${(d.minutes / max) * 100}%` }} />
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {!weekIsPast && <span>{t("weekplan.empty_days", { count: emptyDays })}</span>}
          {prevTotal > 0 && (
            <span className={cn(diff >= 0 ? "text-primary" : "")}>
              {t("weekplan.vs_prev", { sign: diff >= 0 ? "+" : "−", value: fmt(Math.abs(diff)) })}
            </span>
          )}
        </div>

        {!weekIsPast && weekRows.length > 0 && (
          <Button size="sm" variant="outline" className="h-8 w-full gap-1 text-xs" disabled={bulk.isPending} onClick={copyWeek}>
            <CopyPlus className="h-3.5 w-3.5" />{t("weekplan.copy_prev_week", { count: weekRows.length })}
          </Button>
        )}

        <div className="space-y-2 rounded-xl border p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs font-semibold capitalize">
              {sameLocalDay(selDay.day, now) ? t("weekplan.today") : label(selDay.day, { weekday: "long", day: "numeric", month: "short" })}
              <span className="ml-1 font-normal tabular-nums text-muted-foreground">· {fmt(selDay.minutes)}</span>
            </p>
            {!isPast(selDay.day) && (
              <Button size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs" onClick={openNew}>
                <Plus className="h-3.5 w-3.5" />{t("weekplan.add")}
              </Button>
            )}
          </div>
          {routineMin > 0 && <p className="text-[11px] text-muted-foreground">{t("weekplan.routines", { min: routineMin })}</p>}
          {selDay.blocks.length === 0 ? (
            <p className="text-xs text-muted-foreground">{isPast(selDay.day) ? t("weekplan.past_readonly") : t("weekplan.empty")}</p>
          ) : (
            selDay.blocks.map((b) => (
              <div key={b.id} className="flex items-center gap-2 text-sm">
                <span className="w-11 shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">{hhmm(b.start_at)}</span>
                <span className={cn("min-w-0 flex-1 truncate", (b.is_done || b.time_entry_id) && "text-primary")}>{b.title}</span>
                <span className="text-[10px] tabular-nums text-muted-foreground">{blockMinutes(b)} min</span>
                {!isPast(selDay.day) && (
                  <>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label={t("weekplan.move") as string} onClick={() => openEdit(b)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label={t("common.delete", "Excluir") as string} onClick={() => del.mutate(b.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
          {selDay.blocks.length > 0 && emptyFuture.some((d) => d.blocks.length === 0) && (
            <Button size="sm" variant="outline" className="h-8 w-full gap-1 text-xs" disabled={bulk.isPending} onClick={repeatDay}>
              <Copy className="h-3.5 w-3.5" />{t("weekplan.repeat")}
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">{t("weekplan.hint")}</p>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? t("weekplan.move") : t("weekplan.add")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("timeblock.field_title", "Título")}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("timeblock.title_placeholder", "Ex.: Estudar cálculo") as string} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("timeblock.field_project", "Projeto (para o cronômetro)")}</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("timeblock.no_project", "Sem projeto")}</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("weekplan.field_day")}</Label>
                <Input type="date" value={date} min={isoDay(today)} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("timeblock.field_start", "Início")}</Label>
                  <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("timeblock.field_duration", "Duração")}</Label>
                  <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Array.from(new Set([...DURATIONS, duration])).sort((a, b) => a - b).map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={save} disabled={create.isPending || update.isPending || !title.trim() || !date} className="w-full sm:w-auto">{t("common.save", "Salvar")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
