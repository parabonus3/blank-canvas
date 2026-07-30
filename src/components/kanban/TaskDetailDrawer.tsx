import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUpdateTask, useDeleteTask, type Task, type TaskPriority } from "@/hooks/useTasks";
import { useTaskChecklists, useCreateChecklistItem, useToggleChecklistItem, useDeleteChecklistItem } from "@/hooks/useTaskChecklists";
import { useTaskComments, useAddComment, useDeleteComment } from "@/hooks/useTaskComments";
import { useTaskLabels, useAddLabel, useRemoveLabel } from "@/hooks/useTaskLabels";
import { useTaskTimeLogs, useAddTimeLog } from "@/hooks/useTaskTimeLogs";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import {
  Trash2, Plus, Play, X, Clock, MessageSquare, CheckSquare, Tag as TagIcon,
  Users, FileText, ChevronLeft, Paperclip,
} from "lucide-react";
import { PriorityBadge } from "./PriorityBadge";
import { TaskMemberAssigner } from "./TaskMemberAssigner";
import { MemberAvatars } from "./MemberAvatars";
import { TaskAttachmentsSection } from "./TaskAttachmentsSection";
import { useTaskAttachments } from "@/hooks/useTaskAttachments";
import { useTaskMembers, useBoardRole } from "@/hooks/useBoardCollab";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR, enUS, es, fr, de, it, ja, ko, zhCN, ru, ar, id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

const DATE_LOCALES: Record<string, any> = {
  "pt-BR": ptBR, "en-US": enUS, "es-ES": es, "fr-FR": fr, "de-DE": de,
  "it-IT": it, "ja-JP": ja, "ko-KR": ko, "zh-CN": zhCN, "ru-RU": ru,
  "ar-SA": ar, "id-ID": idLocale,
};

const LABEL_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#22c55e", "#06b6d4", "#eab308", "#ef4444"];

function fmtHM(sec: number) {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  return `${m}m`;
}
function fmtShort(sec: number) {
  if (!sec) return "0m";
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h` : `${m}m`;
}

interface Props {
  task: Task | null;
  onClose: () => void;
  onStartTimer: (task: Task) => void;
  hasActiveTimer: boolean;
  boardId?: string;
}

type SectionId = "details" | "checklist" | "members" | "comments" | "time" | "attachments";

export function TaskDetailDrawer({ task, onClose, onStartTimer, hasActiveTimer, boardId }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const dateLocale = DATE_LOCALES[i18n.language] || enUS;
  const { data: projects } = useProjects();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: checklists } = useTaskChecklists(task?.id);
  const { data: taskMembers = [] } = useTaskMembers(task?.id);
  const { data: attachments = [] } = useTaskAttachments(task?.id);
  const boardRole = useBoardRole(boardId);
  const canEdit = boardRole !== "viewer";
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
  const [section, setSection] = useState<SectionId | null>(null);

  useEffect(() => {
    if (task) { setTitle(task.title); setDescription(task.description || ""); setSection(null); }
  }, [task?.id]);

  if (!task) return null;

  const saveTitle = () => title.trim() && title !== task.title && updateTask.mutate({ id: task.id, title: title.trim() });
  const saveDescription = () => description !== (task.description || "") && updateTask.mutate({ id: task.id, description: description || null });

  const checkDone = (checklists || []).filter(c => c.is_completed).length;
  const checkTotal = checklists?.length || 0;
  const progress = checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0;
  const commentCount = comments?.length || 0;
  const totalSec = task.total_tracked_seconds || 0;

  const tiles: Array<{
    id: SectionId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    { id: "details", label: t("kanban.tab_details", "Detalhes"), icon: FileText },
    { id: "checklist", label: t("kanban.tab_checklist", "Checklist"), icon: CheckSquare, badge: checkTotal > 0 ? `${checkDone}/${checkTotal}` : undefined },
    { id: "members", label: t("kanban.tab_members", "Membros"), icon: Users, badge: taskMembers.length > 0 ? String(taskMembers.length) : undefined },
    { id: "comments", label: t("kanban.tab_comments", "Comentários"), icon: MessageSquare, badge: commentCount > 0 ? String(commentCount) : undefined },
    { id: "time", label: t("kanban.tab_time", "Tempo"), icon: Clock, badge: totalSec > 0 ? fmtShort(totalSec) : undefined },
    { id: "attachments", label: t("kanban.tab_attachments", "Anexos"), icon: Paperclip, badge: attachments.length > 0 ? String(attachments.length) : undefined },
  ];

  const renderTiles = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {tiles.map(({ id, label, icon: Icon, badge }) => {
        const active = section === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={cn(
              "relative flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all",
              "hover:border-primary/50 hover:shadow-sm active:scale-[0.98]",
              active
                ? "border-primary bg-primary text-primary-foreground shadow"
                : "border-border bg-card"
            )}
          >
            {badge && (
              <span className={cn(
                "absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                active ? "bg-primary-foreground text-primary" : "bg-primary/10 text-primary"
              )}>
                {badge}
              </span>
            )}
            <Icon className="h-6 w-6" />
            <span className="text-xs font-medium leading-tight">{label}</span>
          </button>
        );
      })}
    </div>
  );

  const renderSection = () => {
    if (!section) return null;
    return (
      <div className="mt-4 space-y-3">
        <button
          type="button"
          onClick={() => setSection(null)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {t("kanban.back_to_shortcuts", "Voltar aos atalhos")}
        </button>

        {section === "details" && (
          <div className="space-y-4">
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
          </div>
        )}

        {section === "checklist" && (
          <div className="space-y-3">
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
                <ChecklistRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggleCheck.mutate({ id: item.id, is_completed: !item.is_completed })}
                  onDelete={() => deleteCheck.mutate({ id: item.id, task_id: task.id })}
                  dateLocale={dateLocale}
                />
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
          </div>
        )}

        {section === "members" && (
          boardId ? (
            <TaskMemberAssigner taskId={task.id} boardId={boardId} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">{t("kanban.no_members")}</p>
          )
        )}

        {section === "comments" && (
          <div className="space-y-3">
            <div className="space-y-2">
              {(comments || []).map(c => {
                const isMine = c.user_id === user?.id;
                const initials = (c.display_name || "?").trim().slice(0, 2).toUpperCase();
                return (
                  <div key={c.id} className="flex gap-2 group">
                    <Avatar className="h-8 w-8 shrink-0">
                      {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 rounded-lg border bg-muted/30 p-2.5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold truncate">
                          {isMine ? t("kanban.comment_you", "Você") : (c.display_name || "—")}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: dateLocale })}
                        </span>
                        {isMine && (
                          <Button size="icon" variant="ghost" className="h-6 w-6 ms-auto opacity-0 group-hover:opacity-100"
                            onClick={() => deleteComment.mutate({ id: c.id, task_id: task.id })}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{c.content}</p>
                    </div>
                  </div>
                );
              })}
              {!comments?.length && <p className="text-sm text-muted-foreground text-center py-6">{t("kanban.no_comments", "Nenhum comentário ainda")}</p>}
            </div>
            <div className="flex gap-2">
              <Textarea rows={2} value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder={t("kanban.write_comment", "Escreva um comentário...") as string} />
              <Button size="sm" onClick={() => { if (newComment.trim()) { addComment.mutate({ task_id: task.id, content: newComment.trim() }); setNewComment(""); } }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {section === "time" && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-primary/5 p-3">
              <div className="text-xs text-muted-foreground">{t("kanban.total_tracked", "Total registrado")}</div>
              <div className="text-2xl font-bold text-primary">{fmtHM(totalSec)}</div>
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
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet open={!!task} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        <div className="p-4 border-b sticky top-0 bg-background z-10">
          <SheetHeader className="mb-3">
            <SheetTitle asChild>
              <Input value={title} onChange={e => setTitle(e.target.value)} onBlur={saveTitle}
                className="text-lg font-semibold h-auto border-0 shadow-none focus-visible:ring-0 px-0" />
            </SheetTitle>
          </SheetHeader>

          <div className="flex items-center gap-2 flex-wrap">
            <PriorityBadge priority={task.priority} />
            {taskMembers.length > 0 && (
              <MemberAvatars members={taskMembers} size="xs" max={4} />
            )}
            {task.project_id && !task.is_completed && (
              <Button size="sm" onClick={() => onStartTimer(task)} disabled={hasActiveTimer} className="ms-auto">
                <Play className="h-3.5 w-3.5 me-1" />{t("kanban.start_focus")}
              </Button>
            )}
          </div>
        </div>

        <div className="p-4">
          {renderTiles()}
          {renderSection()}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Row for a single checklist item — shows author + completion attribution. */
function ChecklistRow({
  item, onToggle, onDelete, dateLocale,
}: {
  item: { id: string; title: string; is_completed: boolean; user_id: string; completed_by: string | null; completed_at: string | null; created_at: string };
  onToggle: () => void;
  onDelete: () => void;
  dateLocale: any;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const uids = Array.from(new Set([item.user_id, item.completed_by].filter(Boolean) as string[]));
  const { data: profileMap } = useQuery({
    queryKey: ["checklist_profiles", uids.sort().join(",")],
    queryFn: async () => {
      const map = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      await Promise.all(uids.map(async (uid) => {
        const { data } = await (supabase as any).rpc("get_member_public_stats", { _user_id: uid });
        const row = Array.isArray(data) ? data[0] : null;
        if (row) map.set(uid, { display_name: row.display_name ?? null, avatar_url: row.avatar_url ?? null });
      }));
      return map;
    },
    enabled: uids.length > 0,
    staleTime: 60_000,
  });

  const nameFor = (uid: string | null | undefined) => {
    if (!uid) return null;
    if (uid === user?.id) return t("kanban.comment_you", "Você");
    return profileMap?.get(uid)?.display_name || "—";
  };
  const avatarFor = (uid: string | null | undefined) => (uid ? profileMap?.get(uid)?.avatar_url ?? null : null);

  const doneBy = item.is_completed ? nameFor(item.completed_by) : null;
  const createdBy = !item.is_completed ? nameFor(item.user_id) : null;
  const doneAvatar = item.is_completed ? avatarFor(item.completed_by) : null;

  return (
    <div className="group rounded-md hover:bg-muted/40 transition-colors px-1.5 py-1">
      <div className="flex items-center gap-2">
        <Checkbox checked={item.is_completed} onCheckedChange={onToggle} />
        <span className={cn("flex-1 text-sm", item.is_completed && "line-through text-muted-foreground")}>{item.title}</span>
        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100"
          onClick={onDelete} aria-label={t("common.delete", "Excluir") as string}>
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
      {(doneBy || createdBy) && (
        <div className="ms-6 mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {doneBy ? (
            <>
              <Avatar className="h-4 w-4">
                {doneAvatar && <AvatarImage src={doneAvatar} />}
                <AvatarFallback className="bg-primary/20 text-primary text-[8px]">
                  {(doneBy || "?").trim().slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {t("kanban.checklist_done_by", "Concluído por {{name}}", { name: doneBy })}
                {item.completed_at ? ` · ${formatDistanceToNow(new Date(item.completed_at), { addSuffix: true, locale: dateLocale })}` : ""}
              </span>
            </>
          ) : (
            <span className="truncate opacity-70">
              {t("kanban.checklist_created_by", "Criado por {{name}}", { name: createdBy })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
