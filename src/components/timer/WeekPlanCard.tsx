import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarRange, Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects } from "@/hooks/useProjects";
import { useWeekTimeBlocks, useCreateTimeBlock, useCreateTimeBlocksBulk, useDeleteTimeBlock } from "@/hooks/useTimeBlocks";
import { useFocusRoutines, routineTotalMinutes } from "@/hooks/useFocusRoutines";
import { weekDays, plannedByDay, copyDayToEmptyDays, blockMinutes, sameLocalDay } from "@/lib/weekPlan";
import { cn } from "@/lib/utils";

const DURATIONS = [15, 30, 45, 60, 90, 120];
const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const fmt = (min: number) => `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;

/** Planejar a semana: visão segunda→domingo dos blocos da agenda, com adicionar e repetir dia. */
export function WeekPlanCard({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const now = useMemo(() => new Date(), []);
  const days = useMemo(() => weekDays(now), [now]);
  const { data: blocks = [] } = useWeekTimeBlocks(days[0]);
  const { data: projects = [] } = useProjects();
  const { data: routines = [] } = useFocusRoutines();
  const create = useCreateTimeBlock();
  const bulk = useCreateTimeBlocksBulk();
  const del = useDeleteTimeBlock();

  const todayIdx = days.findIndex((d) => sameLocalDay(d, now));
  const [sel, setSel] = useState(Math.max(0, todayIdx));
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("none");
  const [start, setStart] = useState("09:00");
  const [duration, setDuration] = useState(60);

  const perDay = plannedByDay(blocks, days);
  const total = perDay.reduce((s, d) => s + d.minutes, 0);
  const max = Math.max(60, ...perDay.map((d) => d.minutes));
  const selDay = perDay[sel];
  const routineMin = routines
    .filter((r) => r.steps.length > 0 && r.weekdays.includes(selDay.day.getDay()))
    .reduce((s, r) => s + routineTotalMinutes(r.steps), 0);
  const isPast = (d: Date) => d < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const emptyFuture = perDay.slice(sel + 1).filter((d) => !isPast(d.day));

  const label = (d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(i18n.language, opts).format(d);

  const save = async () => {
    if (!title.trim()) return;
    const [h, m] = start.split(":").map(Number);
    const s = new Date(selDay.day); s.setHours(h || 0, m || 0, 0, 0);
    await create.mutateAsync({ title: title.trim(), start_at: s.toISOString(), end_at: new Date(s.getTime() + duration * 60000).toISOString(), project_id: projectId !== "none" ? projectId : null });
    setTitle(""); setOpen(false);
  };

  const repeat = async () => {
    const rows = copyDayToEmptyDays(selDay.blocks, emptyFuture);
    await bulk.mutateAsync(rows);
    toast.success(t("weekplan.copied", { count: rows.length }));
  };

  return (
    <Card className={className}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarRange className="h-4 w-4 text-primary" />{t("weekplan.title")}
          </h3>
          <span className="text-xs tabular-nums text-muted-foreground">{t("weekplan.total", { h: Math.floor(total / 60), m: String(total % 60).padStart(2, "0") })}</span>
        </div>

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

        <div className="space-y-2 rounded-xl border p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold capitalize">
              {sel === todayIdx ? t("weekplan.today") : label(selDay.day, { weekday: "long", day: "numeric" })}
              <span className="ml-1 font-normal tabular-nums text-muted-foreground">· {fmt(selDay.minutes)}</span>
            </p>
            {!isPast(selDay.day) && (
              <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setOpen(true)}>
                <Plus className="h-3.5 w-3.5" />{t("weekplan.add")}
              </Button>
            )}
          </div>
          {routineMin > 0 && <p className="text-[11px] text-muted-foreground">{t("weekplan.routines", { min: routineMin })}</p>}
          {selDay.blocks.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("weekplan.empty")}</p>
          ) : (
            selDay.blocks.map((b) => (
              <div key={b.id} className="flex items-center gap-2 text-sm">
                <span className="w-11 shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">{hhmm(b.start_at)}</span>
                <span className={cn("min-w-0 flex-1 truncate", b.is_done && "text-primary")}>{b.title}</span>
                <span className="text-[10px] tabular-nums text-muted-foreground">{blockMinutes(b)} min</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label={t("common.delete", "Excluir") as string} onClick={() => del.mutate(b.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
          {selDay.blocks.length > 0 && emptyFuture.some((d) => d.blocks.length === 0) && (
            <Button size="sm" variant="outline" className="h-8 w-full gap-1 text-xs" disabled={bulk.isPending} onClick={repeat}>
              <Copy className="h-3.5 w-3.5" />{t("weekplan.repeat")}
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">{t("weekplan.hint")}</p>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="capitalize">{label(selDay.day, { weekday: "long", day: "numeric", month: "long" })}</DialogTitle>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("timeblock.field_start", "Início")}</Label>
                  <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("timeblock.field_duration", "Duração")}</Label>
                  <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={save} disabled={create.isPending || !title.trim()} className="w-full sm:w-auto">{t("common.save", "Salvar")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
