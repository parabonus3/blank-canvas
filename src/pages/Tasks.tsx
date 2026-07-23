import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { SEO } from "@/components/SEO";
import { useBoards, useCreateBoard, useDeleteBoard, useUpdateBoard, type Board } from "@/hooks/useBoards";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, KanbanSquare, Star, Trash2, Archive, ArchiveRestore, MoreVertical, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { BoardInvitationsBanner } from "@/components/kanban/BoardInvitationsBanner";
import { useBoardMembers } from "@/hooks/useBoardCollab";
import { MemberAvatars } from "@/components/kanban/MemberAvatars";
import { useAuth } from "@/contexts/AuthContext";

const BOARD_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f97316",
  "#22c55e", "#06b6d4", "#eab308", "#ef4444",
  "#14b8a6", "#a855f7", "#f43f5e", "#84cc16",
  "#6366f1", "#0ea5e9", "#d946ef", "#78716c",
];

export default function Tasks() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showArchived, setShowArchived] = useState(false);
  const { data: boards, isLoading } = useBoards(showArchived);
  const { data: projects } = useProjects();
  const createBoard = useCreateBoard();
  const updateBoard = useUpdateBoard();
  const deleteBoard = useDeleteBoard();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(BOARD_COLORS[0]);
  const [projectId, setProjectId] = useState<string>("none");
  const [confirmDelete, setConfirmDelete] = useState<Board | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createBoard.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      color,
      project_id: projectId !== "none" ? projectId : null,
    });
    setTitle(""); setDescription(""); setColor(BOARD_COLORS[0]); setProjectId("none");
    setOpen(false);
  };

  return (
    <MainLayout>
      <SEO title={t("kanban.page_title", "Tarefas — Timezoni")} />
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <KanbanSquare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("kanban.title", "Tarefas")}</h1>
              <p className="text-sm text-muted-foreground">{t("kanban.subtitle", "Organize seu trabalho com quadros Kanban")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowArchived(v => !v)}>
              {showArchived ? <ArchiveRestore className="h-4 w-4 me-1" /> : <Archive className="h-4 w-4 me-1" />}
              {showArchived ? t("kanban.showing_archived", "Arquivados") : t("kanban.show_archived", "Arquivados")}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 me-1" />{t("kanban.new_board", "Novo quadro")}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("kanban.new_board", "Novo quadro")}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("kanban.board_title", "Título")}</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("kanban.board_title_ph", "Meu projeto") as string} autoFocus />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("kanban.board_description", "Descrição")}</Label>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("kanban.linked_project", "Projeto vinculado")}</Label>
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
                    <Label>{t("kanban.board_color", "Cor")}</Label>
                    <div className="flex gap-2 flex-wrap">
                      {BOARD_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setColor(c)}
                          className={cn("w-8 h-8 rounded-full border-2", color === c ? "border-foreground scale-110" : "border-transparent")}
                          style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                  <Button onClick={handleCreate} disabled={!title.trim() || createBoard.isPending}>{t("common.create")}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-16">{t("common.loading")}</div>
        ) : !boards?.length ? (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <KanbanSquare className="h-12 w-12 text-muted-foreground mx-auto" />
              <div className="text-muted-foreground">{t("kanban.empty_boards", "Nenhum quadro ainda. Crie o primeiro!")}</div>
              <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 me-1" />{t("kanban.new_board", "Novo quadro")}</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {boards.map(b => (
              <Card key={b.id} className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg overflow-hidden"
                onClick={() => navigate(`/tasks/board/${b.id}`)}>
                <div className="h-2" style={{ background: b.color || "hsl(var(--primary))" }} />
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {b.is_favorite && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />}
                        <h3 className="font-semibold truncate">{b.title}</h3>
                      </div>
                      {b.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</p>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => updateBoard.mutate({ id: b.id, is_favorite: !b.is_favorite })}>
                          <Star className={cn("h-4 w-4 me-2", b.is_favorite && "fill-yellow-400 text-yellow-400")} />
                          {b.is_favorite ? t("kanban.unfavorite", "Desfavoritar") : t("kanban.favorite", "Favoritar")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateBoard.mutate({ id: b.id, is_archived: !b.is_archived })}>
                          {b.is_archived ? <ArchiveRestore className="h-4 w-4 me-2" /> : <Archive className="h-4 w-4 me-2" />}
                          {b.is_archived ? t("kanban.unarchive", "Desarquivar") : t("kanban.archive", "Arquivar")}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(b)}>
                          <Trash2 className="h-4 w-4 me-2" />{t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("kanban.delete_board_title", "Excluir quadro?")}</AlertDialogTitle>
              <AlertDialogDescription>{t("kanban.delete_board_desc", "Todas as tarefas e colunas serão perdidas.")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (confirmDelete) { deleteBoard.mutate(confirmDelete.id); setConfirmDelete(null); }}}>
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
