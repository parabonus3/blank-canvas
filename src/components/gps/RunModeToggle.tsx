import { useTranslation } from "react-i18next";
import { Footprints, MapPinOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface Props {
  enabled: boolean;
  onChange: (v: boolean) => void;
  supported: boolean;
  className?: string;
}

/** Opt-in toggle shown before starting the timer. */
export function RunModeToggle({ enabled, onChange, supported, className }: Props) {
  const { t } = useTranslation();

  if (!supported) {
    return (
      <div className={cn("flex items-center gap-2 rounded-xl border border-dashed border-border p-3", className)}>
        <MapPinOff className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">{t("runs.not_supported")}</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={cn(
        "w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors",
        enabled ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
        className,
      )}
    >
      <span
        className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
          enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Footprints className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold truncate">{t("runs.mode_title")}</span>
        <span className="block text-[11px] text-muted-foreground leading-snug">
          {t("runs.mode_desc")}
        </span>
      </span>
      <Switch checked={enabled} onCheckedChange={onChange} aria-label={t("runs.mode_title")} />
    </button>
  );
}
