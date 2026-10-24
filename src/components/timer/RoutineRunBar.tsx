import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Coffee, SkipForward, Target, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RoutineRunState, RoutineStep } from "@/hooks/useFocusRoutines";

interface Props {
  run: RoutineRunState;
  currentStep: RoutineStep;
  /** Cronômetro rodando (etapa de foco em andamento). */
  isRunning: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onStop: () => void;
  className?: string;
}

function fmt(seconds: number) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RoutineRunBar({ run, currentStep, isRunning, onComplete, onSkip, onStop, className }: Props) {
  const { t } = useTranslation();
  const isBreak = currentStep.kind === "break";
  const [breakLeft, setBreakLeft] = useState(currentStep.minutes * 60);

  // Contagem local só para etapas de pausa — não cria registro de tempo.
  useEffect(() => {
    setBreakLeft(currentStep.minutes * 60);
    if (currentStep.kind !== "break") return;
    const id = setInterval(() => setBreakLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [currentStep.id, currentStep.kind, currentStep.minutes]);


  return (
    <div
      className={cn(
        "rounded-xl border p-3 space-y-2",
        isBreak ? "border-warning/40 bg-warning/5" : "border-primary/40 bg-primary/5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none">{run.emoji || "🎯"}</span>
          <span className="text-sm font-medium truncate">{run.title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {run.index + 1}/{run.steps.length}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onStop} aria-label={t("routines.end", "Encerrar rotina")}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ol className="flex items-center gap-1" aria-label={t("routines.steps", "Etapas")}>
        {run.steps.map((s, i) => {
          const done = run.done.includes(s.id);
          const skipped = run.skipped?.includes(s.id);
          return (
            <li
              key={s.id}
              title={`${s.title || (s.kind === "break" ? t("routines.kind_break") : t("routines.kind_focus"))} · ${s.minutes} min`}
              className={cn(
                "h-2 rounded-full transition-all",
                i === run.index ? "flex-[2] bg-primary animate-pulse" : "flex-1",
                done && "bg-success",
                skipped && "bg-warning",
                !done && !skipped && i !== run.index && "bg-muted",
              )}
            />
          );
        })}
      </ol>

      <div className="flex items-center gap-2">
        {isBreak ? <Coffee className="h-4 w-4 text-warning shrink-0" /> : <Target className="h-4 w-4 text-primary shrink-0" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {currentStep.title || (isBreak ? t("routines.kind_break", "Pausa") : t("routines.kind_focus", "Foco"))}
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {isBreak
              ? t("routines.break_left", "Pausa · {{time}} restantes", { time: fmt(breakLeft) })
              : isRunning
                ? t("routines.focus_running", "Foco de {{min}} min — a etapa avança quando você parar.", { min: currentStep.minutes })
                : t("routines.focus_ready", "Foco de {{min}} min — toque em play para começar.", { min: currentStep.minutes })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {isBreak ? (
          <Button size="sm" className="h-9 gap-1 text-xs col-span-1" onClick={onComplete}>
            <Check className="h-3.5 w-3.5" />
            {t("routines.break_done", "Pausa concluída")}
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-9 gap-1 text-xs col-span-1" onClick={onComplete} disabled={isRunning}>
            <Check className="h-3.5 w-3.5" />
            {t("routines.mark_done", "Marcar feita")}
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-9 gap-1 text-xs" onClick={onSkip}>
          <SkipForward className="h-3.5 w-3.5" />
          {t("routines.skip", "Pular etapa")}
        </Button>
      </div>
    </div>
  );
}
