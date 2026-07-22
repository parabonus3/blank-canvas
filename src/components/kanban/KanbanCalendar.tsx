import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Task } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, isSameMonth, isSameDay, format,
} from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { PriorityBadge } from "./PriorityBadge";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
  onOpenTask: (task: Task) => void;
}

export function KanbanCalendar({ tasks, onOpenTask }: Props) {
  const { t, i18n } = useTranslation();
  const [cursor, setCursor] = useState(new Date());
  const locale = i18n.language.startsWith("pt") ? ptBR : enUS;

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const tasksByDay = useMemo(() => {
    const m = new Map<string, Task[]>();
    tasks.filter(t => t.due_date).forEach(t => {
      const k = t.due_date!.slice(0, 10);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    });
    return m;
  }, [tasks]);

  const weekdays = [0, 1, 2, 3, 4, 5, 6].map(i => format(new Date(2024, 0, 7 + i), "EEEEE", { locale }));

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" onClick={() => setCursor(subMonths(cursor, 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <h3 className="font-semibold capitalize">{format(cursor, "MMMM yyyy", { locale })}</h3>
        <Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground mb-1">
        {weekdays.map((d, i) => <div key={i} className="uppercase">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(d => {
          const dayTasks = tasksByDay.get(format(d, "yyyy-MM-dd")) || [];
          const isToday = isSameDay(d, new Date());
          const outside = !isSameMonth(d, cursor);
          return (
            <div key={d.toISOString()} className={cn(
              "min-h-[70px] sm:min-h-[100px] rounded-md border p-1 space-y-0.5 text-left",
              outside && "opacity-40",
              isToday && "border-primary bg-primary/5"
            )}>
              <div className={cn("text-[10px] font-semibold", isToday && "text-primary")}>{format(d, "d")}</div>
              {dayTasks.slice(0, 3).map(task => (
                <button key={task.id} onClick={() => onOpenTask(task)}
                  className={cn(
                    "w-full text-[10px] truncate rounded px-1 py-0.5 text-left border transition-colors hover:bg-accent",
                    task.is_completed && "opacity-60 line-through",
                    task.priority === "urgent" && "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
                    task.priority === "high" && "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
                    task.priority === "medium" && "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
                    task.priority === "low" && "border-muted-foreground/30 bg-muted",
                  )}>
                  {task.title}
                </button>
              ))}
              {dayTasks.length > 3 && <div className="text-[9px] text-muted-foreground">+{dayTasks.length - 3}</div>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
