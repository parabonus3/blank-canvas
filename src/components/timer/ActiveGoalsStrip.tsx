import { useTranslation } from "react-i18next";
import { Target } from "lucide-react";
import { useAnnualGoals, useLifeCategories } from "@/hooks/useAnnualGoals";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ActiveGoalsStripProps {
  variant?: "default" | "fullscreen";
  className?: string;
}

/**
 * Discreet horizontal strip showing in-progress annual goals (excludes completed).
 * Used in Timer page and Fullscreen Timer.
 */
export function ActiveGoalsStrip({ variant = "default", className }: ActiveGoalsStripProps) {
  const { t } = useTranslation();
  const { data: goals = [] } = useAnnualGoals();
  const { data: categories = [] } = useLifeCategories();

  // Only show goals not yet completed and with progress < 100
  const active = goals.filter((g) => {
    if (g.is_completed || g.archived) return false;
    const pct = (g.current_value / Math.max(1, g.target_value)) * 100;
    return pct < 100;
  });
  if (active.length === 0) return null;

  const visible = active.slice(0, 3);
  const extra = active.slice(3);
  const isFs = variant === "fullscreen";

  const colorFor = (catId: string | null) =>
    (catId && categories.find((c) => c.id === catId)?.color) || "hsl(var(--primary))";

  const Chip = ({ g }: { g: (typeof active)[number] }) => {
    const color = colorFor(g.category_id);
    const pct = Math.min(100, Math.round((g.current_value / Math.max(1, g.target_value)) * 100));
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border bg-muted/40 px-2.5 py-1 snap-start shrink-0",
          isFs ? "text-[11px]" : "text-xs"
        )}
        title={`${g.title} • ${pct}%`}
      >
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="truncate max-w-[120px] text-foreground/80">{g.title}</span>
        <div className="w-12 h-1 rounded-full bg-foreground/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <span className="tabular-nums text-muted-foreground">{pct}%</span>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 overflow-x-auto snap-x scrollbar-none",
        isFs ? "max-w-[92vw]" : "w-full",
        className
      )}
    >
      <Target
        className={cn("shrink-0 text-muted-foreground", isFs ? "h-3 w-3" : "h-3.5 w-3.5")}
        aria-hidden
      />
      {visible.map((g) => (
        <Chip key={g.id} g={g} />
      ))}
      {extra.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "rounded-full border bg-muted/40 px-2 py-1 shrink-0 hover:bg-muted/70 transition",
                isFs ? "text-[11px]" : "text-xs"
              )}
              aria-label={t("timer.goals_more", { defaultValue: "Mais metas" })}
            >
              +{extra.length}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 space-y-1">
            {extra.map((g) => (
              <Chip key={g.id} g={g} />
            ))}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
