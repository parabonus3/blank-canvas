import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  resolved: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  closed: "bg-muted text-muted-foreground border-border",
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  urgent: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export function TicketStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className={cn("text-xs", statusColors[status] || "")}>
      {t(`support.status_${status}`)}
    </Badge>
  );
}

export function TicketPriorityBadge({ priority }: { priority: string }) {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className={cn("text-xs", priorityColors[priority] || "")}>
      {t(`support.priority_${priority}`)}
    </Badge>
  );
}
