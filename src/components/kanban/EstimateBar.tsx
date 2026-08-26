import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

function fmtHM(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  return `${m}m`;
}

export function estimateState(trackedSeconds: number, estimatedMinutes: number) {
  const ratio = trackedSeconds / (estimatedMinutes * 60);
  if (ratio > 1) return "over" as const;
  if (ratio >= 0.8) return "close" as const;
  return "ok" as const;
}

interface Props {
  trackedSeconds: number;
  estimatedMinutes: number;
  /** Versão compacta usada no cartão do quadro. */
  compact?: boolean;
  className?: string;
}

/** Estimado vs. real de uma tarefa. */
export function EstimateBar({ trackedSeconds, estimatedMinutes, compact, className }: Props) {
  const { t } = useTranslation();
  const estSec = estimatedMinutes * 60;
  const state = estimateState(trackedSeconds, estimatedMinutes);
  const pct = Math.min(100, Math.round((trackedSeconds / estSec) * 100));
  const overSec = Math.max(0, trackedSeconds - estSec);

  const barColor =
    state === "over" ? "bg-destructive" : state === "close" ? "bg-orange-500" : "bg-emerald-500";
  const textColor =
    state === "over"
      ? "text-destructive"
      : state === "close"
        ? "text-orange-600 dark:text-orange-400"
        : "text-emerald-600 dark:text-emerald-400";

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
          state === "over"
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : state === "close"
              ? "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          className,
        )}
        title={t("kanban.estimate_vs_real", "Estimado vs. real")}
      >
        {fmtHM(trackedSeconds)}/{fmtHM(estSec)}
      </span>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{t("kanban.estimate_vs_real", "Estimado vs. real")}</span>
        <span className={cn("font-semibold tabular-nums", textColor)}>
          {fmtHM(trackedSeconds)} / {fmtHM(estSec)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {state === "over"
          ? t("kanban.estimate_over", "Passou {{time}} da estimativa", { time: fmtHM(overSec) })
          : state === "close"
            ? t("kanban.estimate_close", "Perto do limite da estimativa")
            : t("kanban.estimate_ok", "Dentro da estimativa ({{pct}}%)", { pct })}
      </p>
    </div>
  );
}
