import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { SEO } from "@/components/SEO";
import { useBoard, useUpdateBoard } from "@/hooks/useBoards";
import { useBoardColumns, useCreateColumn, useUpdateColumn, useDeleteColumn, type BoardColumn } from "@/hooks/useBoardColumns";
import { useBoardAttachmentCounts } from "@/hooks/useTaskAttachments";
import { useTasks, useUpdateTask, useReorderTask, useCreateTask, type Task } from "@/hooks/useTasks";
import { useActiveTimeEntry, useStartTimer } from "@/hooks/useTimeEntries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, Plus, MoreVertical, Trash2, KanbanSquare, CalendarDays, BarChart3, Edit2, Check, X, Users, Palette, Pencil } from "lucide-react";
import { TaskCard } from "@/components/kanban/TaskCard";
import { TaskFormDialog } from "@/components/kanban/TaskFormDialog";
import { TaskDetailDrawer } from "@/components/kanban/TaskDetailDrawer";
import { KanbanCalendar } from "@/components/kanban/KanbanCalendar";
import { KanbanReports } from "@/components/kanban/KanbanReports";
import { BoardInviteDialog } from "@/components/kanban/BoardInviteDialog";
import { EditBoardDialog } from "@/components/kanban/EditBoardDialog";
import { ColorPalettePicker } from "@/components/kanban/ColorPalettePicker";
import { MemberAvatars } from "@/components/kanban/MemberAvatars";
import { useBoardMembers, useBoardTaskMembers, useActiveTaskWorkers } from "@/hooks/useBoardCollab";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ColumnContainerProps {
  column: BoardColumn;
  tasks: Task[];
  onAddTask: (columnId: string) => void;
  onOpenTask: (task: Task, section?: "checklist") => void;
  onToggleComplete: (task: Task) => void;
  onStartTimer: (task: Task) => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  onChangeColor: (color: string) => void;
  hasActiveTimer: boolean;
  isMobile: boolean;
  taskMembersMap: Map<string, any[]>;
  attachmentCounts?: Map<string, number>;
  activeWorkers: { byTask: Map<string, string[]>; profiles: Map<string, any> };
}

function ColumnContainer({ column, tasks, onAddTask, onOpenTask, onToggleComplete, onStartTimer, onDelete, onRename, onChangeColor, hasActiveTimer, isMobile, taskMembersMap, activeWorkers, attachmentCounts }: ColumnContainerProps) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useSortable({ id: `col:${column.id}`, data: { type: "column", columnId: column.id } });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(column.title);

  const header = (
    <div className="flex items-center gap-2 min-w-0">
      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: column.color || "hsl(var(--muted-foreground))" }} />
      {editing ? (
        <div className="flex items-center gap-1 flex-1">
          <Input value={title} onChange={e => setTitle(e.target.value)} className="h-7 text-sm" autoFocus onKeyDown={e => e.key === "Enter" && (onRename(title), setEditing(false))} />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { onRename(title); setEditing(false); }}><Check className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setTitle(column.title); setEditing(false); }}><X className="h-3 w-3" /></Button>
        </div>
      ) : (
        <>
          <span className="font-semibold text-sm truncate">{column.title}</span>
          <span className="text-xs text-muted-foreground shrink-0">{tasks.length}</span>
        </>
      )}
    </div>
  );

  const colorMenu = (
    <div className="p-2">
      <ColorPalettePicker value={column.color} onChange={(c) => onChangeColor(c || "")} size="sm" />
    </div>
  );

  const content = (
    <div ref={setNodeRef} className={cn("space-y-2 min-h-[80px] rounded-lg transition-colors", isOver && "bg-primary/5 outline-2 outline-dashed outline-primary/30")}>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onClick={onOpenTask} onToggleComplete={onToggleComplete} onStartTimer={onStartTimer}
            hasActiveTimer={hasActiveTimer}
            members={taskMembersMap.get(task.id) || []}
            attachmentCount={attachmentCounts?.get(task.id) || 0}
            activeUserIds={activeWorkers.byTask.get(task.id) || []}
            activeProfiles={activeWorkers.profiles} />

        ))}
      </SortableContext>
      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={() => onAddTask(column.id)}>
        <Plus className="h-4 w-4 me-1" />{t("kanban.add_task", "Adicionar tarefa")}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <AccordionItem value={column.id} className="border rounded-lg bg-card/40 px-3">
        <div className="flex items-center justify-between gap-2">
          <AccordionTrigger className="flex-1 py-3 hover:no-underline">{header}</AccordionTrigger>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setEditing(true)}><Edit2 className="h-4 w-4 me-2" />{t("common.edit")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-[10px] font-medium uppercase text-muted-foreground flex items-center gap-1"><Palette className="h-3 w-3" />{t("kanban.column_color", "Cor")}</div>
              {colorMenu}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4 me-2" />{t("common.delete")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <AccordionContent className="pt-1 pb-3">{content}</AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <div
      className="w-72 shrink-0 flex flex-col rounded-lg bg-muted/30 border p-3 gap-2 max-h-[calc(100vh-220px)] border-t-[3px]"
      style={{ borderTopColor: column.color || undefined }}
    >
      <div className="flex items-center justify-between gap-2">
        {header}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-3.5 w-3.5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setEditing(true)}><Edit2 className="h-4 w-4 me-2" />{t("common.edit")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-[10px] font-medium uppercase text-muted-foreground flex items-center gap-1"><Palette className="h-3 w-3" />{t("kanban.column_color", "Cor")}</div>
            {colorMenu}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4 me-2" />{t("common.delete")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-y-auto scrollbar-thin -mx-1 px-1 flex-1">{content}</div>
    </div>
  );
}

export default function BoardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const { data: board } = useBoard(id);
  const { data: columns } = useBoardColumns(id);
  const { data: tasks } = useTasks(id);
  const updateBoard = useUpdateBoard();
  const createColumn = useCreateColumn();
  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const reorderTask = useReorderTask();
  const { data: activeEntry } = useActiveTimeEntry();
  const startTimer = useStartTimer();
  const { data: taskMembersMap = new Map() } = useBoardTaskMembers(id);
  const { data: attachmentCounts = new Map<string, number>() } = useBoardAttachmentCounts((tasks || []).map(t => t.id));
  const { data: activeWorkers = { byTask: new Map<string, string[]>(), profiles: new Map<string, any>() } } = useActiveTaskWorkers(id);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskDialogColumnId, setTaskDialogColumnId] = useState<string | null>(null);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [openTaskSection, setOpenTaskSection] = useState<"checklist" | null>(null);
  const openTaskAt = useCallback((task: Task, section?: "checklist") => {
    setOpenTask(task);
    setOpenTaskSection(section ?? null);
  }, []);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [membersOpen, setMembersOpen] = useState(false);
  const [editBoardOpen, setEditBoardOpen] = useState(false);
  const { user } = useAuth();
  const { data: boardMembers = [] } = useBoardMembers(id);
  const isOwner = !!user && !!board && board.user_id === user.id;

  const tasksByColumn = useMemo(() => {
    const map = new Map<string | null, Task[]>();
    (tasks || []).forEach(task => {
      const key = task.column_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });
    return map;
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const findTask = (id: string) => tasks?.find(t => t.id === id);
  const activeTask = activeDragId ? findTask(activeDragId) : null;

  const handleDragStart = (e: DragStartEvent) => setActiveDragId(String(e.active.id));

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over || !tasks) return;
    const activeTask = findTask(String(active.id));
    if (!activeTask) return;

    let targetColumnId: string | null = null;
    let targetIndex = 0;

    const overData = over.data.current as any;
    if (overData?.type === "column") {
      targetColumnId = overData.columnId;
      targetIndex = (tasksByColumn.get(targetColumnId) || []).length;
    } else {
      const overTask = findTask(String(over.id));
      if (!overTask) return;
      targetColumnId = overTask.column_id;
      const list = tasksByColumn.get(targetColumnId) || [];
      targetIndex = list.findIndex(t => t.id === overTask.id);
      if (targetIndex < 0) targetIndex = list.length;
    }

    if (activeTask.column_id === targetColumnId && activeTask.position === targetIndex) return;
    try {
      await reorderTask.mutateAsync({ taskId: activeTask.id, newColumnId: targetColumnId, newPosition: targetIndex });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleToggleComplete = (task: Task) => updateTask.mutate({ id: task.id, is_completed: !task.is_completed });

  const handleStartTimer = async (task: Task) => {
    if (!task.project_id) {
      toast({ title: t("kanban.no_project_for_timer", "Vincule um projeto para iniciar o timer"), variant: "destructive" });
      return;
    }
    if (activeEntry) {
      toast({ title: t("kanban.timer_already_running", "Já existe um timer ativo"), variant: "destructive" });
      return;
    }
    await startTimer.mutateAsync({ projectId: task.project_id, taskId: task.id });
    navigate("/timer");
  };

  const handleAddColumn = async () => {
    if (!newColumnTitle.trim() || !id) return;
    await createColumn.mutateAsync({ board_id: id, title: newColumnTitle.trim(), position: (columns?.length || 0) });
    setNewColumnTitle(""); setAddingColumn(false);
  };

  if (!board) return <MainLayout><div className="text-center text-muted-foreground py-16">{t("common.loading")}</div></MainLayout>;

  return (
    <MainLayout>
      <SEO title={`${board.title} — Timezoni`} />
      <div className="space-y-4 max-w-full">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tasks")}><ChevronLeft className="h-5 w-5" /></Button>
          <div className="h-8 w-1 rounded-full" style={{ background: board.color || "hsl(var(--primary))" }} />
          <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate flex-1 min-w-0">{board.title}</h1>
          {!isOwner && (
            <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
              {t("kanban.shared")}
            </span>
          )}
          {isOwner && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setEditBoardOpen(true)} title={t("kanban.edit_board", "Editar quadro") as string}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMembersOpen(true)}
            className="shrink-0 gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
          >
            {boardMembers.length > 1 ? (
              <MemberAvatars members={boardMembers} size="xs" max={3} />
            ) : (
              <Users className="h-4 w-4" />
            )}
            <span className="text-xs font-semibold">
              {boardMembers.length > 1
                ? t("kanban.members_count", "{{n}} membros", { n: boardMembers.length })
                : t("kanban.invite_cta", "Convidar")}
            </span>
          </Button>
        </div>

        {/* Description */}
        {board.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap px-2 border-l-2 border-primary/40 ms-1">
            {board.description}
          </p>
        )}


        {/* Empty team hint */}
        {isOwner && boardMembers.length <= 1 && (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5">
            <Users className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs sm:text-sm text-foreground/90 flex-1 min-w-0">
              {t("kanban.empty_team_hint", "Trabalhe em equipe: convide alguém para colaborar neste quadro.")}
            </p>
            <Button size="sm" variant="default" className="shrink-0" onClick={() => setMembersOpen(true)}>
              {t("kanban.invite_cta", "Convidar")}
            </Button>
          </div>
        )}


        <Tabs defaultValue="board" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="board"><KanbanSquare className="h-4 w-4 me-1.5" />{t("kanban.tab_board", "Quadro")}</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarDays className="h-4 w-4 me-1.5" />{t("kanban.tab_calendar", "Calendário")}</TabsTrigger>
            <TabsTrigger value="reports"><BarChart3 className="h-4 w-4 me-1.5" />{t("kanban.tab_reports", "Relatórios")}</TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="mt-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              {isMobile ? (
                <>
                  <Accordion type="multiple" defaultValue={(columns || []).slice(0, 2).map(c => c.id)} className="space-y-2">
                    {(columns || []).map(col => (
                      <ColumnContainer key={col.id} column={col} tasks={tasksByColumn.get(col.id) || []}
                        onAddTask={(cid) => { setTaskDialogColumnId(cid); setTaskDialogOpen(true); }}
                        onOpenTask={openTaskAt} onToggleComplete={handleToggleComplete} onStartTimer={handleStartTimer}
                        onDelete={() => deleteColumn.mutate(col.id)}
                        onRename={(title) => updateColumn.mutate({ id: col.id, title })}
                        hasActiveTimer={!!activeEntry} isMobile onChangeColor={(color) => updateColumn.mutate({ id: col.id, color })} taskMembersMap={taskMembersMap} activeWorkers={activeWorkers} attachmentCounts={attachmentCounts} />
                    ))}
                  </Accordion>
                  <div className="mt-3">
                    {addingColumn ? (
                      <div className="flex gap-1">
                        <Input value={newColumnTitle} onChange={e => setNewColumnTitle(e.target.value)} placeholder={t("kanban.new_column_ph", "Nome da coluna") as string} autoFocus
                          onKeyDown={e => e.key === "Enter" && handleAddColumn()} />
                        <Button size="sm" onClick={handleAddColumn}><Check className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setAddingColumn(false)}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full" onClick={() => setAddingColumn(true)}><Plus className="h-4 w-4 me-1" />{t("kanban.add_column", "Nova coluna")}</Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {(columns || []).map(col => (
                    <ColumnContainer key={col.id} column={col} tasks={tasksByColumn.get(col.id) || []}
                      onAddTask={(cid) => { setTaskDialogColumnId(cid); setTaskDialogOpen(true); }}
                      onOpenTask={openTaskAt} onToggleComplete={handleToggleComplete} onStartTimer={handleStartTimer}
                      onDelete={() => deleteColumn.mutate(col.id)}
                      onRename={(title) => updateColumn.mutate({ id: col.id, title })}
                      hasActiveTimer={!!activeEntry} isMobile={false} onChangeColor={(color) => updateColumn.mutate({ id: col.id, color })} taskMembersMap={taskMembersMap} activeWorkers={activeWorkers} attachmentCounts={attachmentCounts} />
                  ))}
                  <div className="w-72 shrink-0">
                    {addingColumn ? (
                      <Card className="p-3 space-y-2">
                        <Input value={newColumnTitle} onChange={e => setNewColumnTitle(e.target.value)} placeholder={t("kanban.new_column_ph", "Nome da coluna") as string} autoFocus onKeyDown={e => e.key === "Enter" && handleAddColumn()} />
                        <div className="flex gap-1">
                          <Button size="sm" onClick={handleAddColumn} className="flex-1">{t("common.create")}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setAddingColumn(false)}>{t("common.cancel")}</Button>
                        </div>
                      </Card>
                    ) : (
                      <Button variant="outline" className="w-full" onClick={() => setAddingColumn(true)}><Plus className="h-4 w-4 me-1" />{t("kanban.add_column", "Nova coluna")}</Button>
                    )}
                  </div>
                </div>
              )}

              <DragOverlay>
                {activeTask ? (
                  <div className="rotate-2">
                    <TaskCard task={activeTask} onClick={() => {}} onToggleComplete={() => {}} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </TabsContent>

          <TabsContent value="calendar" className="mt-3">
            <KanbanCalendar tasks={tasks || []} onOpenTask={openTaskAt} />
          </TabsContent>

          <TabsContent value="reports" className="mt-3">
            <KanbanReports tasks={tasks || []} columns={columns || []} />
          </TabsContent>
        </Tabs>

        <TaskFormDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}
          boardId={id!} columnId={taskDialogColumnId} defaultProjectId={board.project_id} />

        <TaskDetailDrawer task={openTask} initialSection={openTaskSection} onClose={() => { setOpenTask(null); setOpenTaskSection(null); }} onStartTimer={handleStartTimer} hasActiveTimer={!!activeEntry} boardId={id} />

        <BoardInviteDialog open={membersOpen} onOpenChange={setMembersOpen} boardId={id!} isOwner={isOwner} />

        {isOwner && <EditBoardDialog open={editBoardOpen} onOpenChange={setEditBoardOpen} board={board} />}
      </div>
    </MainLayout>
  );
}
