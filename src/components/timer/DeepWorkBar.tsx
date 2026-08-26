import { useTranslation } from "react-i18next";
import { Target, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  targetMinutes: number;
  elapsedSeconds: number;
  className?: string;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Progresso do compromisso de foco durante a sessão. */
export function DeepWorkBar({ targetMinutes, elapsedSeconds, className }: Props) {
  const { t } = useTranslation();
  const targetSec = targetMinutes * 60;
  const pct = Math.min(100, Math.round((elapsedSeconds / targetSec) * 100));
  const done = elapsedSeconds >= targetSec;
  const remaining = Math.max(0, targetSec - elapsedSeconds);

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 space-y-2 transition-colors",
        done ? "border-emerald-500/40 bg-emerald-500/10" : "border-primary/30 bg-primary/5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          {done ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Target className="h-3.5 w-3.5 text-primary" />
          )}
          {t("focus.commitment", "Compromisso")} {targetMinutes}min
        </span>
        <span
          className={cn(
            "font-mono font-semibold tabular-nums",
            done ? "text-emerald-600 dark:text-emerald-400" : "text-primary",
          )}
        >
          {done ? t("focus.goal_reached", "Meta batida!") : t("focus.remaining", "faltam {{time}}", { time: fmt(remaining) })}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", done ? "bg-emerald-500" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
