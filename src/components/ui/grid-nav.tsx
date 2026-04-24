import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface GridNavItem {
  value: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
}

interface GridNavProps {
  items: GridNavItem[];
  value: string;
  onChange: (value: string) => void;
  columns?: string;
  className?: string;
}

export function GridNav({ items, value, onChange, columns, className }: GridNavProps) {
  const gridCols = columns || (
    items.length === 2 ? "grid-cols-2" :
    items.length === 3 ? "grid-cols-3" :
    "grid-cols-2 sm:grid-cols-4"
  );

  return (
    <div className={cn("grid gap-3", gridCols, className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = value === item.value;

        return (
          <button
            key={item.value}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all duration-200 cursor-pointer",
              isActive
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
            <span className={cn("text-xs font-medium", isActive && "text-primary")}>
              {item.label}
            </span>
            {item.badge != null && (
              <Badge
                variant="destructive"
                className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 text-[10px] rounded-full"
              >
                {typeof item.badge === "number" && item.badge > 99 ? "99+" : item.badge}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
