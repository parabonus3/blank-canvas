import type { TaskPriority } from "@/hooks/useTasks";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Flame, ArrowUp, Minus, ArrowDown } from "lucide-react";

const CONFIG: Record<TaskPriority, { label: string; icon: any; className: string }> = {
  urgent: { label: "kanban.priority.urgent", icon: Flame, className: "text-red-500 bg-red-500/10 border-red-500/30" },
  high: { label: "kanban.priority.high", icon: ArrowUp, className: "text-orange-500 bg-orange-500/10 border-orange-500/30" },
  medium: { label: "kanban.priority.medium", icon: Minus, className: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  low: { label: "kanban.priority.low", icon: ArrowDown, className: "text-muted-foreground bg-muted border-border" },
};

export function PriorityBadge({ priority, size = "sm" }: { priority: TaskPriority; size?: "sm" | "xs" }) {
  const { t } = useTranslation();
  const cfg = CONFIG[priority];
  const Icon = cfg.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border font-medium",
      size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5",
      cfg.className
    )}>
      <Icon className={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {t(cfg.label, priority)}
    </span>
  );
}
