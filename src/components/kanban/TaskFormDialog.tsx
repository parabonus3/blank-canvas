import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask, type TaskPriority } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  boardId: string;
  columnId: string | null;
  defaultProjectId?: string | null;
}

export function TaskFormDialog({ open, onOpenChange, boardId, columnId, defaultProjectId }: Props) {
  const { t } = useTranslation();
  const { data: projects } = useProjects();
  const create = useCreateTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState<string>(defaultProjectId || "none");
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>("");

  useEffect(() => {
    if (open) {
      setTitle(""); setDescription(""); setPriority("medium"); setDueDate("");
      setProjectId(defaultProjectId || "none"); setEstimatedMinutes("");
    }
  }, [open, defaultProjectId]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await create.mutateAsync({
      board_id: boardId,
      column_id: columnId,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
      project_id: projectId !== "none" ? projectId : null,
      estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("kanban.new_task", "Nova tarefa")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("kanban.task_title", "Título")}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} autoFocus placeholder={t("kanban.task_title_ph", "O que precisa ser feito?") as string} />
          </div>
          <div className="space-y-2">
            <Label>{t("kanban.task_description", "Descrição")}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("kanban.priority.label", "Prioridade")}</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
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
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("kanban.project", "Projeto")}</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("kanban.no_project", "Sem projeto")}</SelectItem>
                  {(projects || []).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("kanban.estimated_minutes", "Estimativa (min)")}</Label>
              <Input type="number" min={0} value={estimatedMinutes} onChange={e => setEstimatedMinutes(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || create.isPending}>{t("common.create")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
