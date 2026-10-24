import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ListChecks, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FocusRoutineDialog } from "@/components/timer/FocusRoutineDialog";
import {
  routineTotalMinutes,
  useDeleteFocusRoutine,
  useFocusRoutines,
  useRoutineRuns,
  type FocusRoutine,
} from "@/hooks/useFocusRoutines";
import { useTimezone } from "@/hooks/useTimezone";
import { lastDaysKeys, routineDayStatus, todayKeyFor } from "@/lib/routineStatus";
import { STATUS_STYLES, routineColor } from "@/lib/routineAppearance";

interface Props {
  onStart: (routine: FocusRoutine) => void;
  className?: string;
}

export function FocusRoutinesCard({ onStart, className }: Props) {
  const { t } = useTranslation();
  const { timezone } = useTimezone();
  const { data: routines, isLoading } = useFocusRoutines();
  const { data: runs = [] } = useRoutineRuns(7);
  const del = useDeleteFocusRoutine();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FocusRoutine | null>(null);
  const todayKey = todayKeyFor(timezone);
  const days = lastDaysKeys(todayKey, 7);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <section className={cn("rounded-xl border border-border bg-card/50 p-3 sm:p-4 space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ListChecks className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-sm font-semibold truncate">{t("routines.title", "Rotinas de foco")}</h2>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" />
          {t("routines.new", "Nova")}
        </Button>
      </div>

      {isLoading ? (
        <div className="h-16 rounded-lg bg-muted/50 animate-pulse" />
      ) : !routines || routines.length === 0 ? (
        <button
          type="button"
          onClick={openNew}
          className="w-full rounded-lg border border-dashed border-border p-4 text-left text-xs leading-relaxed text-muted-foreground hover:border-primary/50"
        >
          {t("routines.empty", "Crie uma sequência de etapas (foco e pausas) e inicie tudo com um toque.")}
        </button>
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {routines.map((r) => {
            const status = routineDayStatus(runs.filter((x) => x.routine_id === r.id), r.weekdays, todayKey, todayKey);
            const cardStyle = STATUS_STYLES[status].card || routineColor(r.color).ring;
            return (
              <li key={r.id} className={cn("rounded-xl border-2 bg-background/60 p-3 space-y-2", cardStyle)}>
                <div className="flex items-start gap-2">
                  <span className="text-2xl leading-none shrink-0">{r.emoji || "🎯"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{r.title}</p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {t("routines.summary", "{{steps}} etapas · {{min}} min", {
                        steps: r.steps.length,
                        min: routineTotalMinutes(r.steps),
                      })}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                    {t(`routines.status_${status}`)}
                  </span>
                </div>

                <div className="flex items-center gap-1" aria-label={t("routines.last_7", "Últimos 7 dias")}>
                  {days.map((d) => {
                    const s = routineDayStatus(runs.filter((x) => x.routine_id === r.id), r.weekdays, d, todayKey);
                    return (
                      <span
                        key={d}
                        title={`${d} · ${t(`routines.status_${s}`)}`}
                        className={cn("h-2 flex-1 rounded-full", STATUS_STYLES[s].dot)}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center gap-1">
                  <Button size="sm" className="h-9 flex-1 gap-1 text-xs" onClick={() => onStart(r)}>
                    <Play className="h-3.5 w-3.5" />
                    {t("routines.start", "Iniciar")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground"
                    onClick={() => {
                      setEditing(r);
                      setDialogOpen(true);
                    }}
                    aria-label={t("common.edit", "Editar")}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground"
                    onClick={() => del.mutate(r.id)}
                    aria-label={t("common.delete", "Excluir")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <FocusRoutineDialog open={dialogOpen} onOpenChange={setDialogOpen} routine={editing} />
    </section>
  );
}
