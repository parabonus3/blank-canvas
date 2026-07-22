import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useUpdateTask, useDeleteTask, type Task, type TaskPriority } from "@/hooks/useTasks";
import { useTaskChecklists, useCreateChecklistItem, useToggleChecklistItem, useDeleteChecklistItem } from "@/hooks/useTaskChecklists";
import { useTaskComments, useAddComment, useDeleteComment } from "@/hooks/useTaskComments";
import { useTaskLabels, useAddLabel, useRemoveLabel } from "@/hooks/useTaskLabels";
import { useTaskTimeLogs, useAddTimeLog } from "@/hooks/useTaskTimeLogs";
import { useProjects } from "@/hooks/useProjects";
import { Trash2, Plus, Play, X, Clock, MessageSquare, CheckSquare, Tag as TagIcon } from "lucide-react";
import { PriorityBadge } from "./PriorityBadge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const LABEL_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#22c55e", "#06b6d4", "#eab308", "#ef4444"];

function fmtHM(sec: number) {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  return `${m}m`;
}

interface Props {
  task: Task | null;
  onClose: () => void;
  onStartTimer: (task: Task) => void;
  hasActiveTimer: boolean;
}

export function TaskDetailDrawer({ task, onClose, onStartTimer, hasActiveTimer }: Props) {
  const { t } = useTranslation();
  const { data: projects } = useProjects();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: checklists } = useTaskChecklists(task?.id);
  const createCheck = useCreateChecklistItem();
  const toggleCheck = useToggleChecklistItem();
  const deleteCheck = useDeleteChecklistItem();
  const { data: comments } = useTaskComments(task?.id);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const { data: labels } = useTaskLabels(task?.id);
  const addLabel = useAddLabel();
  const removeLabel = useRemoveLabel();
  const { data: timeLogs } = useTaskTimeLogs(task?.id);
  const addLog = useAddTimeLog();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newCheck, setNewCheck] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [logMinutes, setLogMinutes] = useState("");

  useEffect(() => {
    if (task) { setTitle(task.title); setDescription(task.description || ""); }
  }, [task?.id]);

  if (!task) return null;

  const saveTitle = () => title.trim() && title !== task.title && updateTask.mutate({ id: task.id, title: title.trim() });
  const saveDescription = () => description !== (task.description || "") && updateTask.mutate({ id: task.id, description: description || null });

  const checkDone = (checklists || []).filter(c => c.is_completed).length;
  const checkTotal = checklists?.length || 0;
  const progress = checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0;

  return (
    <Sheet open={!!task} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        <div className="p-4 border-b">
          <SheetHeader className="mb-3">
            <SheetTitle asChild>
              <Input value={title} onChange={e => setTitle(e.target.value)} onBlur={saveTitle}
                className="text-lg font-semibold h-auto border-0 shadow-none focus-visible:ring-0 px-0" />
            </SheetTitle>
          </SheetHeader>

          <div className="flex items-center gap-2 flex-wrap">
            <PriorityBadge priority={task.priority} />
            {task.project_id && !task.is_completed && (
              <Button size="sm" onClick={() => onStartTimer(task)} disabled={hasActiveTimer} className="ms-auto">
                <Play className="h-3.5 w-3.5 me-1" />{t("kanban.start_focus", "Focar")}
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b h-11 px-2 bg-transparent">
            <TabsTrigger value="details">{t("kanban.tab_details", "Detalhes")}</TabsTrigger>
            <TabsTrigger value="checklist">
              <CheckSquare className="h-3.5 w-3.5 me-1" />{checkTotal > 0 ? `${checkDone}/${checkTotal}` : t("kanban.tab_checklist", "Checklist")}
            </TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="h-3.5 w-3.5 me-1" />{comments?.length || ""}
            </TabsTrigger>
            <TabsTrigger value="time"><Clock className="h-3.5 w-3.5 me-1" />{t("kanban.tab_time", "Tempo")}</TabsTrigger>
          </TabsList>

          {/* DETAILS */}
          <TabsContent value="details" className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>{t("kanban.task_description", "Descrição")}</Label>
              <Textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} onBlur={saveDescription} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("kanban.priority.label", "Prioridade")}</Label>
                <Select value={task.priority} onValueChange={(v) => updateTask.mutate({ id: task.id, priority: v as TaskPriority })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t("kanban.priority.low", "Baixa")}</SelectItem>
                    <SelectItem value="medium">{t("kanban.priority.medium", "Média")}</SelectItem>
                    <SelectItem value="high">{t("kanban.priority.high", "Alta")}</SelectItem>
                    <SelectItem value="urgent">{t("kanban.priority.urgent", "Urgente")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("kanban.due_date", "Prazo")}</Label>
                <Input type="date" value={task.due_date?.slice(0, 10) || ""}
                  onChange={e => updateTask.mutate({ id: task.id, due_date: e.target.value || null })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("kanban.project", "Projeto")}</Label>
              <Select value={task.project_id || "none"} onValueChange={v => updateTask.mutate({ id: task.id, project_id: v !== "none" ? v : null })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("kanban.no_project", "Sem projeto")}</SelectItem>
                  {(projects || []).map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Labels */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><TagIcon className="h-3.5 w-3.5" />{t("kanban.labels", "Etiquetas")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {(labels || []).map(l => (
                  <Badge key={l.id} variant="outline" className="gap-1 pr-1" style={{ borderColor: l.color, color: l.color }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: l.color }} />
                    {l.name}
                    <button onClick={() => removeLabel.mutate({ id: l.id, task_id: task.id })} className="ms-1 opacity-60 hover:opacity-100">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newLabelName} onChange={e => setNewLabelName(e.target.value)}
                  placeholder={t("kanban.label_name_ph", "Nome da etiqueta") as string} className="h-8" />
                <div className="flex gap-1 items-center">
                  {LABEL_COLORS.slice(0, 4).map(c => (
                    <button key={c} onClick={() => setNewLabelColor(c)} type="button"
                      className={cn("h-5 w-5 rounded-full border-2", newLabelColor === c ? "border-foreground" : "border-transparent")}
                      style={{ background: c }} />
                  ))}
                </div>
                <Button size="sm" onClick={() => {
                  if (newLabelName.trim()) {
                    addLabel.mutate({ task_id: task.id, name: newLabelName.trim(), color: newLabelColor });
                    setNewLabelName("");
                  }
                }}><Plus className="h-3.5 w-3.5" /></Button>
              </div>
            </div>

            <div className="pt-3 border-t">
              <Button variant="ghost" size="sm" className="text-destructive"
                onClick={() => { if (confirm(t("kanban.delete_task_confirm", "Excluir esta tarefa?") as string)) { deleteTask.mutate(task.id); onClose(); } }}>
                <Trash2 className="h-4 w-4 me-2" />{t("kanban.delete_task", "Excluir tarefa")}
              </Button>
            </div>
          </TabsContent>

          {/* CHECKLIST */}
          <TabsContent value="checklist" className="p-4 space-y-3">
            {checkTotal > 0 && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{checkDone}/{checkTotal}</span><span>{progress}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              {(checklists || []).map(item => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <Checkbox checked={item.is_completed} onCheckedChange={() => toggleCheck.mutate({ id: item.id, is_completed: !item.is_completed })} />
                  <span className={cn("flex-1 text-sm", item.is_completed && "line-through text-muted-foreground")}>{item.title}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => deleteCheck.mutate({ id: item.id, task_id: task.id })}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newCheck} onChange={e => setNewCheck(e.target.value)}
                placeholder={t("kanban.add_subtask", "Adicionar subtarefa") as string}
                onKeyDown={e => { if (e.key === "Enter" && newCheck.trim()) { createCheck.mutate({ task_id: task.id, title: newCheck.trim() }); setNewCheck(""); } }} />
              <Button size="sm" onClick={() => { if (newCheck.trim()) { createCheck.mutate({ task_id: task.id, title: newCheck.trim() }); setNewCheck(""); } }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          {/* COMMENTS */}
          <TabsContent value="comments" className="p-4 space-y-3">
            <div className="space-y-2">
              {(comments || []).map(c => (
                <div key={c.id} className="rounded-lg border bg-muted/30 p-3 group relative">
                  <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), "dd/MM HH:mm")}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => deleteComment.mutate({ id: c.id, task_id: task.id })}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {!comments?.length && <p className="text-sm text-muted-foreground text-center py-6">{t("kanban.no_comments", "Nenhum comentário ainda")}</p>}
            </div>
            <div className="flex gap-2">
              <Textarea rows={2} value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder={t("kanban.write_comment", "Escreva um comentário...") as string} />
              <Button size="sm" onClick={() => { if (newComment.trim()) { addComment.mutate({ task_id: task.id, content: newComment.trim() }); setNewComment(""); } }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          {/* TIME */}
          <TabsContent value="time" className="p-4 space-y-3">
            <div className="rounded-lg border bg-primary/5 p-3">
              <div className="text-xs text-muted-foreground">{t("kanban.total_tracked", "Total registrado")}</div>
              <div className="text-2xl font-bold text-primary">{fmtHM(task.total_tracked_seconds || 0)}</div>
              {task.estimated_minutes && (
                <div className="text-xs text-muted-foreground mt-1">
                  {t("kanban.of_estimated", "de {{est}} estimado", { est: fmtHM(task.estimated_minutes * 60) })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("kanban.log_time", "Registrar tempo manual (min)")}</Label>
              <div className="flex gap-2">
                <Input type="number" min={1} value={logMinutes} onChange={e => setLogMinutes(e.target.value)} />
                <Button onClick={() => {
                  const n = parseInt(logMinutes, 10);
                  if (n > 0) { addLog.mutate({ task_id: task.id, seconds: n * 60 }); setLogMinutes(""); }
                }}>{t("common.add", "Adicionar")}</Button>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t">
              <div className="text-xs text-muted-foreground">{t("kanban.history", "Histórico")}</div>
              {(timeLogs || []).map(l => (
                <div key={l.id} className="flex items-center justify-between text-sm py-1">
                  <span>{fmtHM(l.seconds)}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(l.logged_at), "dd/MM HH:mm")}</span>
                </div>
              ))}
              {!timeLogs?.length && <p className="text-xs text-muted-foreground text-center py-3">{t("kanban.no_logs", "Nenhum registro ainda")}</p>}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
