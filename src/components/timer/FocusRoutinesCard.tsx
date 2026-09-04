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
  type FocusRoutine,
} from "@/hooks/useFocusRoutines";

interface Props {
  onStart: (routine: FocusRoutine) => void;
  className?: string;
}

export function FocusRoutinesCard({ onStart, className }: Props) {
  const { t } = useTranslation();
  const { data: routines, isLoading } = useFocusRoutines();
  const del = useDeleteFocusRoutine();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FocusRoutine | null>(null);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div className={cn("rounded-xl border border-border bg-card/50 p-3 space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ListChecks className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">{t("routines.title", "Rotinas de foco")}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" />
          {t("routines.new", "Nova")}
        </Button>
      </div>

      {isLoading ? (
        <div className="h-10 rounded-lg bg-muted/50 animate-pulse" />
      ) : !routines || routines.length === 0 ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("routines.empty", "Crie uma sequência de etapas (foco e pausas) e inicie tudo com um toque.")}
        </p>
      ) : (
        <ul className="space-y-2">
          {routines.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 p-2">
              <span className="text-lg leading-none w-6 text-center shrink-0">{r.emoji || "🎯"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{r.title}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {t("routines.summary", "{{steps}} etapas · {{min}} min", {
                    steps: r.steps.length,
                    min: routineTotalMinutes(r.steps),
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground shrink-0"
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
                className="h-8 w-8 text-muted-foreground shrink-0"
                onClick={() => del.mutate(r.id)}
                aria-label={t("common.delete", "Excluir")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" className="h-8 gap-1 text-xs shrink-0" onClick={() => onStart(r)}>
                <Play className="h-3.5 w-3.5" />
                {t("routines.start", "Iniciar")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <FocusRoutineDialog open={dialogOpen} onOpenChange={setDialogOpen} routine={editing} />
    </div>
  );
}
