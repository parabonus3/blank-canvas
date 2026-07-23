import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/hooks/useTasks";
import { useTaskChecklists } from "@/hooks/useTaskChecklists";
import { useTaskLabels } from "@/hooks/useTaskLabels";
import { PriorityBadge } from "./PriorityBadge";
import { DueDateBadge } from "./DueDateBadge";
import { MemberAvatars } from "./MemberAvatars";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, Clock, Play, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

function fmtHM(sec: number) {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  return `${m}m`;
}

interface Props {
  task: Task;
  onClick: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onStartTimer?: (task: Task) => void;
  hasActiveTimer?: boolean;
  isDragging?: boolean;
  members?: Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>;
  activeUserIds?: string[];
  activeProfiles?: Map<string, { display_name: string | null; avatar_url: string | null }>;
}

function TaskCardComponent({ task, onClick, onToggleComplete, onStartTimer, hasActiveTimer, isDragging, members = [], activeUserIds = [], activeProfiles }: Props) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: sortableDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Translate.toString(transform), transition };
  const { data: checklists } = useTaskChecklists(task.id);
  const { data: labels } = useTaskLabels(task.id);

  const checkTotal = checklists?.length || 0;
  const checkDone = (checklists || []).filter(c => c.is_completed).length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border bg-card p-3 shadow-sm transition-all hover:border-primary/50 hover:shadow-md",
        (isDragging || sortableDragging) && "opacity-40",
        task.is_completed && "opacity-60"
      )}
    >
      {/* Drag handle overlay covers card except interactive zones */}
      <div className="absolute inset-0 rounded-lg cursor-grab active:cursor-grabbing"
        {...attributes} {...listeners}
        onClick={(e) => { e.stopPropagation(); onClick(task); }}
      />

      <div className="relative pointer-events-none space-y-2">
        {/* Labels bar */}
        {!!labels?.length && (
          <div className="flex gap-1 flex-wrap">
            {labels.map(l => (
              <span key={l.id} className="h-1.5 w-8 rounded-full" style={{ background: l.color }} title={l.name} />
            ))}
          </div>
        )}

        {/* Title with checkbox */}
        <div className="flex items-start gap-2">
          <div className="pointer-events-auto pt-0.5" onClick={e => e.stopPropagation()}>
            <Checkbox checked={task.is_completed} onCheckedChange={() => onToggleComplete(task)} />
          </div>
          <h4 className={cn("text-sm font-medium leading-snug flex-1", task.is_completed && "line-through text-muted-foreground")}>
            {task.title}
          </h4>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.priority !== "medium" && <PriorityBadge priority={task.priority} size="xs" />}
          {task.due_date && <DueDateBadge dueDate={task.due_date} completed={task.is_completed} />}
          {checkTotal > 0 && (
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border",
              checkDone === checkTotal ? "text-green-500 border-green-500/30 bg-green-500/10" : "text-muted-foreground border-border bg-muted"
            )}>
              <CheckSquare className="h-2.5 w-2.5" />{checkDone}/{checkTotal}
            </span>
          )}
          {task.total_tracked_seconds > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary">
              <Clock className="h-2.5 w-2.5" />{fmtHM(task.total_tracked_seconds)}
            </span>
          )}
        </div>

        {/* Actions row */}
        {onStartTimer && task.project_id && !task.is_completed && (
          <div className="pointer-events-auto flex justify-end -mb-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onStartTimer(task)}
              disabled={hasActiveTimer}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="h-2.5 w-2.5" />{t("kanban.start_focus", "Focar")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const TaskCard = memo(TaskCardComponent);
