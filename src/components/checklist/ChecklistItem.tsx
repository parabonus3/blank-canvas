import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown, Trash2, Archive } from "lucide-react";
import type { ChecklistItem as ChecklistItemType } from "@/hooks/useChecklists";
import { cn } from "@/lib/utils";

interface Props {
  item: ChecklistItemType;
  isFirst: boolean;
  isLast: boolean;
  onToggle: (item: ChecklistItemType) => void;
  onSendToHistory: (item: ChecklistItemType) => void;
  onDelete: (id: string) => void;
  onMoveUp: (item: ChecklistItemType) => void;
  onMoveDown: (item: ChecklistItemType) => void;
}

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function ChecklistItemCard({ item, isFirst, isLast, onToggle, onSendToHistory, onDelete, onMoveUp, onMoveDown }: Props) {
  const { t } = useTranslation();

  const recurrenceLabel = (() => {
    if (item.recurrence_type === "once") return t("checklist.once");
    if (item.recurrence_type === "daily") return t("checklist.daily_recurring");
    if (item.recurrence_type === "specific_days" && item.recurrence_days?.length) {
      return item.recurrence_days.map(d => t(`checklist.${d}`)).join(", ");
    }
    return item.recurrence_type;
  })();

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/30",
      item.is_completed && "opacity-60"
    )}>
      <Checkbox
        checked={item.is_completed}
        onCheckedChange={() => onToggle(item)}
        className="h-5 w-5"
      />

      <div className="flex-1 min-w-0">
        <p className={cn("font-medium truncate", item.is_completed && "line-through text-muted-foreground")}>
          {item.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant="outline" className="text-xs">{recurrenceLabel}</Badge>
          {item.project && (
            <Badge variant="secondary" className="text-xs gap-1">
              {item.project.color && (
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.project.color }} />
              )}
              {item.project.name}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {item.is_completed && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSendToHistory(item)} title={t("checklist.send_to_history")}>
            <Archive className="h-3.5 w-3.5 text-primary" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isFirst} onClick={() => onMoveUp(item)}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isLast} onClick={() => onMoveDown(item)}>
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(item.id)}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
