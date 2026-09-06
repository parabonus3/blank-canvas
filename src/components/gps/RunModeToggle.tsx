import { useTranslation } from "react-i18next";
import { Footprints, MapPinOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ACTIVITY_ICONS, ACTIVITY_TYPES, type ActivityType } from "@/lib/activityTypes";

interface Props {
  enabled: boolean;
  onChange: (v: boolean) => void;
  supported: boolean;
  activityType?: ActivityType;
  onActivityTypeChange?: (t: ActivityType) => void;
  className?: string;
}

/** Opt-in toggle shown before starting the timer. */
export function RunModeToggle({
  enabled,
  onChange,
  supported,
  activityType = "run",
  onActivityTypeChange,
  className,
}: Props) {
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
    <div
      className={cn(
        "rounded-xl border-2 transition-colors",
        enabled ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className="w-full flex items-center gap-3 p-3 text-left"
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

      {enabled && onActivityTypeChange && (
        <div className="px-3 pb-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t("runs.activity_type")}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ACTIVITY_TYPES.map((type) => {
              const Icon = ACTIVITY_ICONS[type];
              const active = activityType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onActivityTypeChange(type)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t(`runs.type_${type}`)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
