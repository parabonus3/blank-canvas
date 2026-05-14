import { useTranslation } from "react-i18next";
import { Target } from "lucide-react";
import { useGoalsWithProgress } from "@/hooks/useGoals";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ActiveGoalsStripProps {
  variant?: "default" | "fullscreen";
  className?: string;
}

/**
 * Discreet horizontal strip showing in-progress goals (excludes completed).
 * Used in Timer page and Fullscreen Timer.
 */
export function ActiveGoalsStrip({ variant = "default", className }: ActiveGoalsStripProps) {
  const { t } = useTranslation();
  const { data: goals = [] } = useGoalsWithProgress();

  // Only show goals not yet completed
  const active = goals.filter((g) => g.status !== "completed");
  if (active.length === 0) return null;

  const visible = active.slice(0, 3);
  const extra = active.slice(3);
  const isFs = variant === "fullscreen";

  const Chip = ({ g }: { g: (typeof active)[number] }) => {
    const color = g.project?.category?.color || "hsl(var(--primary))";
    const name = g.project?.name || "—";
    const pct = Math.round(g.progress);
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border bg-muted/40 px-2.5 py-1 snap-start shrink-0",
          isFs ? "text-[11px]" : "text-xs"
        )}
        title={`${name} • ${pct}%`}
      >
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="truncate max-w-[110px] text-foreground/80">{name}</span>
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
