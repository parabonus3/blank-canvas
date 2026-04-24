import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useChecklists, useCreateChecklist, useToggleChecklist, useSendToHistory, useDeleteChecklist, useReorderChecklist } from "@/hooks/useChecklists";
import { useProjects } from "@/hooks/useProjects";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { ChecklistItemCard } from "./ChecklistItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChecklistItem } from "@/hooks/useChecklists";

const RECURRENCE_FILTERS = ["all", "once", "daily", "specific_days"] as const;
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function ChecklistList() {
  const { t } = useTranslation();
  const [recurrenceFilter, setRecurrenceFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("none");
  const [recurrenceType, setRecurrenceType] = useState("once");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const { data: items = [], isLoading } = useChecklists(undefined, projectFilter, recurrenceFilter);
  const { data: projects } = useProjects();
  const createChecklist = useCreateChecklist();
  const toggleChecklist = useToggleChecklist();
  const sendToHistory = useSendToHistory();
  const deleteChecklist = useDeleteChecklist();
  const reorderChecklist = useReorderChecklist();
  const pagination = usePagination(items, 10);

  const handleCreate = async () => {
    if (!title.trim()) return;
    if (recurrenceType === "specific_days" && selectedDays.length === 0) return;

    await createChecklist.mutateAsync({
      title: title.trim(),
      project_id: projectId === "none" ? null : projectId,
      period_type: recurrenceType === "once" ? "once" : "daily",
      recurrence_type: recurrenceType,
      recurrence_days: recurrenceType === "specific_days" ? selectedDays : null,
    });
    setDialogOpen(false);
    setTitle("");
    setProjectId("none");
    setRecurrenceType("once");
    setSelectedDays([]);
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleMoveUp = (item: ChecklistItem) => {
    const idx = items.findIndex(i => i.id === item.id);
    if (idx <= 0) return;
    const prev = items[idx - 1];
    reorderChecklist.mutate({ id: item.id, newPosition: prev.position, swapId: prev.id, swapPosition: item.position });
  };

  const handleMoveDown = (item: ChecklistItem) => {
    const idx = items.findIndex(i => i.id === item.id);
    if (idx >= items.length - 1) return;
    const next = items[idx + 1];
    reorderChecklist.mutate({ id: item.id, newPosition: next.position, swapId: next.id, swapPosition: item.position });
  };

  const recurrenceLabels: Record<string, string> = {
    all: t("checklist.all"),
    once: t("checklist.once"),
    daily: t("checklist.daily_recurring"),
    specific_days: t("checklist.specific_days"),
  };

  return (
    <div className="space-y-4">
      {/* Filters + Create */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex gap-1 flex-wrap">
            {RECURRENCE_FILTERS.map((p) => (
              <Button
                key={p}
                variant={recurrenceFilter === p ? "default" : "outline"}
                size="sm"
                onClick={() => setRecurrenceFilter(p)}
              >
                {recurrenceLabels[p]}
              </Button>
            ))}
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {t("checklist.new_item")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("checklist.new_item")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t("checklist.item_title")}</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("checklist.title_placeholder")}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <div>
                  <Label>{t("goals.project")}</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("checklist.no_project")}</SelectItem>
                      {projects?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("checklist.recurrence")}</Label>
                  <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">{t("checklist.once")}</SelectItem>
                      <SelectItem value="daily">{t("checklist.daily_recurring")}</SelectItem>
                      <SelectItem value="specific_days">{t("checklist.specific_days")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {recurrenceType === "specific_days" && (
                  <div>
                    <Label>{t("checklist.select_days")}</Label>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {DAYS.map((day) => (
                        <Button
                          key={day}
                          type="button"
                          variant={selectedDays.includes(day) ? "default" : "outline"}
                          size="sm"
                          className="min-w-[3rem]"
                          onClick={() => toggleDay(day)}
                        >
                          {t(`checklist.${day}`)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <Button onClick={handleCreate} disabled={!title.trim() || (recurrenceType === "specific_days" && selectedDays.length === 0)} className="w-full">
                  {t("common.create")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Project filter */}
        <div className="flex items-center gap-2">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("checklist.all_projects")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("checklist.all_projects")}</SelectItem>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    {p.color && <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />}
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {pagination.paginatedItems.map((item, idx) => (
          <ChecklistItemCard
            key={item.id}
            item={item}
            isFirst={idx === 0 && pagination.currentPage === 1}
            isLast={idx === pagination.paginatedItems.length - 1 && pagination.currentPage === pagination.totalPages}
            onToggle={(i) => toggleChecklist.mutate({ id: i.id, is_completed: !i.is_completed })}
            onSendToHistory={(i) => sendToHistory.mutate(i)}
            onDelete={(id) => deleteChecklist.mutate(id)}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
          />
        ))}
        {items.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t("checklist.no_items")}</p>
          </div>
        )}
      </div>

      {items.length > 10 && (
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          setCurrentPage={pagination.setCurrentPage}
          setPageSize={pagination.setPageSize}
          pageSizeOptions={[10, 20, 50]}
        />
      )}
    </div>
  );
}
