import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CHALLENGE_CATEGORIES,
  getTemplatesByCategory,
  type ChallengeCategory,
  type ChallengeTemplate,
} from "@/lib/roomChallengeTemplates";

interface Props {
  selectedId: string | null;
  onSelect: (tpl: ChallengeTemplate) => void;
  onPickBlank: () => void;
}

export function ChallengeTemplatePicker({ selectedId, onSelect, onPickBlank }: Props) {
  const { t } = useTranslation();
  const [cat, setCat] = useState<ChallengeCategory>("study");
  const items = getTemplatesByCategory(cat);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {CHALLENGE_CATEGORIES.map((c) => {
          const Icon = c.icon;
          const active = cat === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(`rooms.challenges.templates.categories.${c.id}`)}
            </button>
          );
        })}
      </div>


      {cat === "custom" ? (
        <button
          type="button"
          onClick={onPickBlank}
          className={cn(
            "w-full rounded-lg border-2 border-dashed p-4 text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors",
          )}
        >
          {t("rooms.challenges.templates.start_blank_cta")}
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((tpl) => {
            const active = selectedId === tpl.id;
            const periodLabel = t(
              tpl.period === "daily"
                ? "rooms.challenges.period_daily_short"
                : "rooms.challenges.period_weekly_short",
            );
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onSelect(tpl)}
                className={cn(
                  "relative text-left rounded-lg border p-2.5 min-h-[88px] transition-all",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-background hover:bg-muted/50",
                )}
              >
                {active && (
                  <span className="absolute top-1.5 right-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <div className="text-xl mb-1 leading-none">{tpl.emoji}</div>
                <div className="text-xs font-medium leading-tight line-clamp-2">
                  {t(`rooms.challenges.templates.items.${tpl.id}.title`)}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {tpl.targetMinutes}min · {periodLabel}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
