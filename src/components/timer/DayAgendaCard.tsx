import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Plus, Play, Trash2, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useProjects } from "@/hooks/useProjects";
import { useAllUserTasks } from "@/hooks/useTasks";
import { useStartTimer, useActiveTimeEntry } from "@/hooks/useTimeEntries";
import {
  useTimeBlocks, useCreateTimeBlock, useDeleteTimeBlock, useUpdateTimeBlock,
  useBlocksActualMinutes, type TimeBlock,
} from "@/hooks/useTimeBlocks";
import { cn } from "@/lib/utils";

const DURATIONS = [15, 30, 45, 60, 90, 120];

function hhmm(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function plannedMinutes(b: TimeBlock) {
  return Math.round((new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 60000);
}

/** Agenda do dia: blocos de horário com planejado vs. real e start do cronômetro. */
export function DayAgendaCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const { data: blocks = [] } = useTimeBlocks(today);
  const { data: actual } = useBlocksActualMinutes(blocks);
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useAllUserTasks();
  const { data: activeEntry } = useActiveTimeEntry();
  const createBlock = useCreateTimeBlock();
  const updateBlock = useUpdateTimeBlock();
  const deleteBlock = useDeleteTimeBlock();
  const startTimer = useStartTimer();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [taskId, setTaskId] = useState("none");
  const [projectId, setProjectId] = useState("none");
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [duration, setDuration] = useState(60);

  const openTasks = tasks.filter((tk) => !tk.is_completed);

  const reset = () => {
    setTitle(""); setTaskId("none"); setProjectId("none"); setDuration(60);
  };

  const handleCreate = async () => {
    const task = taskId !== "none" ? openTasks.find((tk) => tk.id === taskId) : null;
    const finalTitle = (title.trim() || task?.title || "").trim();
    if (!finalTitle) return;
    const [h, m] = startTime.split(":").map(Number);
    const start = new Date(today);
    start.setHours(h || 0, m || 0, 0, 0);
    const end = new Date(start.getTime() + duration * 60000);
    await createBlock.mutateAsync({
      title: finalTitle,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      task_id: task?.id ?? null,
      project_id: (task?.project_id ?? (projectId !== "none" ? projectId : null)) || null,
    });
    reset();
    setOpen(false);
  };

  const handleStart = async (b: TimeBlock) => {
    if (!b.project_id) {
      navigate("/");
      return;
    }
    await startTimer.mutateAsync({ projectId: b.project_id, taskId: b.task_id });
    navigate("/");
  };

  return (
    <Card className={className}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="h-4 w-4 text-primary" />
            {t("timeblock.title", "Agenda de hoje")}
          </h3>
          <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            {t("timeblock.add", "Bloco")}
          </Button>
        </div>

        {blocks.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("timeblock.empty", "Reserve horários do seu dia e inicie o cronômetro direto do bloco.")}
          </p>
        ) : (
          <div className="space-y-2">
            {blocks.map((b) => {
              const planned = plannedMinutes(b);
              const real = actual?.get(b.id) ?? 0;
              const pct = planned > 0 ? Math.min(100, (real / planned) * 100) : 0;
              const done = b.is_done || real >= planned;
              return (
                <div
                  key={b.id}
                  className={cn(
                    "rounded-xl border p-2.5",
                    done ? "border-primary/40 bg-primary/5" : "bg-card",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-11 shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {hhmm(b.start_at)}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className={cn("truncate text-sm font-medium", done && "text-primary")}>{b.title}</p>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", done ? "bg-primary" : "bg-orange-500")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {t("timeblock.planned_vs_real", {
                          planned,
                          real,
                          defaultValue: "planejado {{planned}}min · real {{real}}min",
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={!!activeEntry || startTimer.isPending}
                        title={t("timeblock.start", "Iniciar") as string}
                        onClick={() => handleStart(b)}
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title={t("timeblock.mark_done", "Concluir") as string}
                        onClick={() => updateBlock.mutate({ id: b.id, is_done: !b.is_done })}
                      >
                        <Check className={cn("h-3.5 w-3.5", b.is_done && "text-primary")} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground"
                        title={t("common.delete", "Excluir") as string}
                        onClick={() => deleteBlock.mutate(b.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("timeblock.new_title", "Novo bloco de horário")}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("timeblock.field_task", "Tarefa (opcional)")}</Label>
                <Select value={taskId} onValueChange={setTaskId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("timeblock.no_task", "Sem tarefa")}</SelectItem>
                    {openTasks.slice(0, 100).map((tk) => (
                      <SelectItem key={tk.id} value={tk.id}>{tk.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t("timeblock.field_title", "Título")}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("timeblock.title_placeholder", "Ex.: Estudar cálculo") as string}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("timeblock.field_project", "Projeto (para o cronômetro)")}</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("timeblock.no_project", "Sem projeto")}</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("timeblock.field_start", "Início")}</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("timeblock.field_duration", "Duração")}</Label>
                  <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleCreate} disabled={createBlock.isPending} className="w-full sm:w-auto">
                {t("common.save", "Salvar")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
