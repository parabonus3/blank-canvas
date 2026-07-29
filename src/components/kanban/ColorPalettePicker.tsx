import { cn } from "@/lib/utils";
import { Check, Ban } from "lucide-react";

export const BOARD_PALETTE = [
  "#94a3b8", "#64748b", "#ef4444", "#f97316",
  "#f59e0b", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

interface Props {
  value: string | null;
  onChange: (color: string | null) => void;
  allowNone?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ColorPalettePicker({ value, onChange, allowNone = true, size = "md", className }: Props) {
  const sz = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  return (
    <div className={cn("grid grid-cols-6 gap-1.5", className)}>
      {allowNone && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            sz,
            "rounded-full border-2 flex items-center justify-center bg-muted text-muted-foreground transition-transform hover:scale-110",
            !value ? "border-foreground" : "border-transparent"
          )}
          aria-label="none"
        >
          <Ban className="h-3 w-3" />
        </button>
      )}
      {BOARD_PALETTE.map((c) => {
        const active = value?.toLowerCase() === c.toLowerCase();
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={cn(
              sz,
              "rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110",
              active ? "border-foreground" : "border-transparent"
            )}
            style={{ background: c }}
            aria-label={c}
          >
            {active && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
          </button>
        );
      })}
    </div>
  );
}
