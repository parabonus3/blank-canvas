import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Task } from "@/hooks/useTasks";
import type { BoardColumn } from "@/hooks/useBoardColumns";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, ListTodo, AlertCircle } from "lucide-react";

interface Props {
  tasks: Task[];
  columns: BoardColumn[];
}

function fmtHM(sec: number) {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  return `${m}m`;
}

export function KanbanReports({ tasks, columns }: Props) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.is_completed).length;
    const overdue = tasks.filter(t => !t.is_completed && t.due_date && new Date(t.due_date) < new Date()).length;
    const trackedSec = tasks.reduce((s, t) => s + (t.total_tracked_seconds || 0), 0);
    const byColumn = columns.map(c => ({
      title: c.title,
      color: c.color,
      count: tasks.filter(t => t.column_id === c.id).length,
    }));
    const byPriority = ["urgent", "high", "medium", "low"].map(p => ({
      key: p, count: tasks.filter(t => t.priority === p).length,
    }));
    return { total, done, overdue, trackedSec, byColumn, byPriority };
  }, [tasks, columns]);

  const completionPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const maxCol = Math.max(1, ...stats.byColumn.map(c => c.count));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><ListTodo className="h-5 w-5" /></div>
          <div>
            <div className="text-xs text-muted-foreground">{t("kanban.report_total", "Total de tarefas")}</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>
          <div>
            <div className="text-xs text-muted-foreground">{t("kanban.report_completed", "Concluídas")}</div>
            <div className="text-2xl font-bold">{stats.done} <span className="text-sm text-muted-foreground font-normal">({completionPct}%)</span></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center"><AlertCircle className="h-5 w-5" /></div>
          <div>
            <div className="text-xs text-muted-foreground">{t("kanban.report_overdue", "Atrasadas")}</div>
            <div className="text-2xl font-bold">{stats.overdue}</div>
          </div>
        </CardContent>
      </Card>
      <Card className="lg:col-span-3">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-semibold">{t("kanban.report_time", "Tempo total registrado")}: {fmtHM(stats.trackedSec)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardContent className="p-4 space-y-3">
          <h4 className="font-semibold text-sm">{t("kanban.report_by_column", "Por coluna")}</h4>
          <div className="space-y-2">
            {stats.byColumn.map(c => (
              <div key={c.title}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="truncate">{c.title}</span><span className="text-muted-foreground">{c.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(c.count / maxCol) * 100}%`, background: c.color || "hsl(var(--primary))" }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="font-semibold text-sm">{t("kanban.report_by_priority", "Por prioridade")}</h4>
          <div className="space-y-1.5">
            {stats.byPriority.map(p => (
              <div key={p.key} className="flex items-center justify-between text-sm">
                <span className="capitalize">{t(`kanban.priority.${p.key}`, p.key)}</span>
                <span className="font-semibold">{p.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
