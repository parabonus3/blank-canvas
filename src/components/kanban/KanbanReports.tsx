import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Task } from "@/hooks/useTasks";
import type { BoardColumn } from "@/hooks/useBoardColumns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, Clock, ListTodo, AlertCircle, Users, FileDown } from "lucide-react";
import { useBoardTeamStats } from "@/hooks/useBoardTeamStats";
import { useBoardActivity, activityLabel } from "@/hooks/useTaskActivity";
import { useBoardTaskMembers } from "@/hooks/useBoardCollab";
import { exportBoardOperationPDF } from "@/lib/pdfExport";
import { format } from "date-fns";

interface Props {
  tasks: Task[];
  columns: BoardColumn[];
  boardId?: string;
  boardTitle?: string;
}

function fmtHM(sec: number) {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  return `${m}m`;
}

export function KanbanReports({ tasks, columns, boardId, boardTitle }: Props) {
  const { t } = useTranslation();
  const { data: team = [] } = useBoardTeamStats(boardId);
  const { data: activity = [] } = useBoardActivity(boardId);
  const { data: taskMembersMap } = useBoardTaskMembers(boardId);

  const handleExport = async () => {
    const colTitle = (id: string | null) => columns.find(c => c.id === id)?.title || "—";
    const now = new Date();
    const done = tasks.filter(tk => tk.is_completed).length;
    const overdue = tasks.filter(tk => !tk.is_completed && tk.due_date && new Date(tk.due_date) < now).length;

    await exportBoardOperationPDF({
      boardTitle: boardTitle || "—",
      generatedFor: boardTitle || "",
      totals: {
        tasks: tasks.length,
        done,
        open: tasks.length - done,
        overdue,
        seconds: tasks.reduce((s, tk) => s + (tk.total_tracked_seconds || 0), 0),
      },
      byColumn: columns.map(c => {
        const list = tasks.filter(tk => tk.column_id === c.id);
        return {
          column: c.title,
          total: list.length,
          done: list.filter(tk => tk.is_completed).length,
          seconds: list.reduce((s, tk) => s + (tk.total_tracked_seconds || 0), 0),
        };
      }),
      byMember: team.map(m => ({ name: m.name, assigned: m.assigned, done: m.done, seconds: m.seconds, checkDone: m.checkDone })),
      tasks: tasks.map(tk => ({
        title: tk.title,
        column: colTitle(tk.column_id),
        status: tk.is_completed ? t("kanban.status_done", "Concluída") : t("kanban.status_open", "Em aberto"),
        priority: t(`kanban.priority.${tk.priority}`, tk.priority),
        due: tk.due_date ? format(new Date(tk.due_date), "dd/MM/yyyy") : "—",
        members: (taskMembersMap?.get(tk.id) || []).map((m: any) => m.display_name || "—").join(", ") || "—",
        progress: tk.is_completed ? "100%" : "—",
        time: fmtHM(tk.total_tracked_seconds || 0),
      })),
      activity: activity.slice(0, 120).map(a => ({
        who: a.display_name || "—",
        what: `${a.task_title ? `[${a.task_title}] ` : ""}${activityLabel(a, t as any)}`,
        when: format(new Date(a.created_at), "dd/MM HH:mm"),
      })),
      labelsI18n: {
        board_report: t("kanban.board_report", "Relatório de Operação"),
        tasks: t("kanban.report_total", "Total de tarefas"),
        task: t("kanban.task", "Tarefa"),
        done: t("kanban.report_completed", "Concluídas"),
        open: t("kanban.status_open", "Em aberto"),
        overdue: t("kanban.report_overdue", "Atrasadas"),
        total_tracked: t("kanban.report_time", "Tempo total registrado"),
        by_member: t("kanban.by_member", "Por membro"),
        by_column: t("kanban.report_by_column", "Por coluna"),
        member: t("kanban.member", "Membro"),
        assigned: t("kanban.assigned", "Atribuídas"),
        checklist: t("kanban.tab_checklist", "Checklist"),
        time_logged: t("kanban.time_logged", "Tempo"),
        column: t("kanban.column", "Coluna"),
        priority: t("kanban.priority", "Prioridade"),
        due_date: t("kanban.due_date", "Prazo"),
        who: t("kanban.who", "Quem"),
        when: t("kanban.when", "Quando"),
        what: t("kanban.what", "Ação"),
        activity: t("kanban.tab_activity", "Histórico"),
      },
    });
  };

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

      <Card className="lg:col-span-3 order-first lg:order-none">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-sm flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              {t("kanban.by_member", "Por membro")}
            </h4>
            <Button variant="outline" size="sm" className="h-8" onClick={handleExport}>
              <FileDown className="h-3.5 w-3.5 me-1.5" />
              <span className="text-xs">{t("kanban.export_board_report", "Relatório PDF")}</span>
            </Button>
          </div>
          {team.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">{t("kanban.no_members", "Nenhum membro ainda")}</p>
          ) : (
            <div className="space-y-2">
              {team.map(m => (
                <div key={m.user_id} className="flex items-center gap-2.5 rounded-lg border bg-card/60 p-2.5">
                  <Avatar className="h-8 w-8 shrink-0">
                    {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                    <AvatarFallback className="bg-primary/15 text-primary text-[10px]">
                      {(m.name || "?").trim().slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">{m.name}</div>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span>{t("kanban.assigned", "Atribuídas")}: {m.assigned}</span>
                      <span className="text-green-600 dark:text-green-400">{t("kanban.report_completed", "Concluídas")}: {m.done}</span>
                      {m.overdue > 0 && <span className="text-destructive">{t("kanban.report_overdue", "Atrasadas")}: {m.overdue}</span>}
                      <span>{t("kanban.tab_checklist", "Checklist")}: {m.checkDone}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-primary tabular-nums">{fmtHM(m.seconds)}</div>
                    <div className="text-[9px] text-muted-foreground">{t("kanban.time_logged", "Tempo")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
