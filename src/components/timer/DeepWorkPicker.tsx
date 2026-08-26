import { useTranslation } from "react-i18next";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEEP_WORK_TARGETS } from "@/hooks/useFocusCommitments";

interface Props {
  /** Meta em minutos, ou null quando o modo está desligado. */
  value: number | null;
  onChange: (value: number | null) => void;
  className?: string;
}

export function DeepWorkPicker({ value, onChange, className }: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn("rounded-xl border border-border bg-card/50 p-3 space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{t("focus.deep_work", "Modo Deep Work")}</span>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {t("focus.deep_work_hint", "Assuma um compromisso de foco. Se parar antes, registramos o motivo para você entender o que te interrompe.")}
      </p>
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          className={cn(
            "h-11 rounded-lg border text-xs font-medium transition-colors",
            value === null
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40",
          )}
        >
          {t("focus.off", "Livre")}
        </button>
        {DEEP_WORK_TARGETS.map((min) => (
          <button
            key={min}
            type="button"
            onClick={() => onChange(min)}
            aria-pressed={value === min}
            className={cn(
              "h-11 rounded-lg border text-xs font-semibold tabular-nums transition-colors",
              value === min
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {min}
            <span className="ms-0.5 text-[10px] font-normal">min</span>
          </button>
        ))}
      </div>
    </div>
  );
}
