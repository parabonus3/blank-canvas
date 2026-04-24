import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { MainLayout } from "@/components/layout/MainLayout";
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote, type Note } from "@/hooks/useNotes";
import {
  useNoteFolders,
  useCreateNoteFolder,
  useDeleteNoteFolder,
  useUpdateNoteFolder,
  useVerifyFolderPassword,
  useUpdateFolderPassword,
  type NoteFolder,
} from "@/hooks/useNoteFolders";
import { useProjects } from "@/hooks/useProjects";
import { useTimezone } from "@/hooks/useTimezone";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProjectPicker } from "@/components/ProjectPicker";
import {
  Plus,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  StickyNote,
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit3,
  Bold,
  Italic,
  Heading,
  List,
  FolderPlus,
  Folder,
  Lock,
  Unlock,
  Download,
  Upload,
  FolderOpen,
  AlertTriangle,
  FolderMinus,
  Settings,
} from "lucide-react";
import { startOfDay, startOfWeek, startOfMonth, isAfter, isBefore, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

export default function Notes() {
  const { t } = useTranslation();
  const { formatInTz, locale } = useTimezone();
  const { user } = useAuth();
  const { toast } = useToast();

  // Folder state
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [unlockedFolders, setUnlockedFolders] = useState<Set<string>>(new Set());
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [pendingFolderId, setPendingFolderId] = useState<string | null>(null);
  const [folderPassword, setFolderPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  // Create folder dialog
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#6366f1");
  const [newFolderPassword, setNewFolderPassword] = useState("");
  const [newFolderPasswordConfirm, setNewFolderPasswordConfirm] = useState("");

  // Edit folder dialog
  const [editFolderOpen, setEditFolderOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editFolderColor, setEditFolderColor] = useState("#6366f1");
  const [editFolderCurrentPassword, setEditFolderCurrentPassword] = useState("");
  const [editFolderNewPassword, setEditFolderNewPassword] = useState("");
  const [editFolderNewPasswordConfirm, setEditFolderNewPasswordConfirm] = useState("");
  const [editPasswordAction, setEditPasswordAction] = useState<"keep" | "remove" | "change">("keep");
  const [editPasswordError, setEditPasswordError] = useState(false);

  // Delete folder
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<NoteFolder | null>(null);
  const [deleteFolderPassword, setDeleteFolderPassword] = useState("");
  const [deleteFolderPasswordError, setDeleteFolderPasswordError] = useState(false);

  const { data: folders } = useNoteFolders();
  const createFolder = useCreateNoteFolder();
  const deleteFolder = useDeleteNoteFolder();
  const updateFolder = useUpdateNoteFolder();
  const verifyPassword = useVerifyFolderPassword();
  const updateFolderPassword = useUpdateFolderPassword();

  // Determine if current folder is locked
  const currentFolder = folders?.find((f) => f.id === selectedFolder);
  const isFolderLocked = currentFolder?.password_hash && !unlockedFolders.has(currentFolder.id);

  const { data: notes, isLoading } = useNotes(
    undefined,
    selectedFolder === "all" ? "all" : selectedFolder === "unfiled" ? "unfiled" : selectedFolder
  );
  const { data: projects } = useProjects();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formProjectId, setFormProjectId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formFolderId, setFormFolderId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit");

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  // Filters
  const [projectFilter, setProjectFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

  // Expanded notes
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Import ref
  const importRef = useRef<HTMLInputElement>(null);

  const activeProjects = useMemo(
    () => (projects || []).filter((p) => p.is_active),
    [projects]
  );

  // Build set of locked folder IDs (have password and not unlocked)
  const lockedFolderIds = useMemo(() => {
    return new Set(
      (folders || [])
        .filter((f) => f.password_hash && !unlockedFolders.has(f.id))
        .map((f) => f.id)
    );
  }, [folders, unlockedFolders]);

  const filteredNotes = useMemo(() => {
    if (!notes || isFolderLocked) return [];
    const today = new Date();

    return notes.filter((note) => {
      // SECURITY: Hide notes from locked folders when viewing "all"
      if (selectedFolder === "all" && note.folder_id && lockedFolderIds.has(note.folder_id)) {
        return false;
      }

      if (projectFilter !== "all" && note.project_id !== projectFilter) return false;
      const noteDate = new Date(note.created_at);
      if (dateFilter === "today" && noteDate < startOfDay(today)) return false;
      if (dateFilter === "week" && noteDate < startOfWeek(today, { weekStartsOn: 1 })) return false;
      if (dateFilter === "month" && noteDate < startOfMonth(today)) return false;
      if (dateFilter === "custom") {
        if (customFrom && isBefore(noteDate, startOfDay(customFrom))) return false;
        if (customTo && isAfter(noteDate, endOfDay(customTo))) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!note.title.toLowerCase().includes(q) && !note.content.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [notes, projectFilter, dateFilter, customFrom, customTo, searchQuery, isFolderLocked, selectedFolder, lockedFolderIds]);

  const pagination = usePagination(filteredNotes, 10);

  const handleSelectFolder = (folderId: string) => {
    if (folderId !== "all" && folderId !== "unfiled") {
      const folder = folders?.find((f) => f.id === folderId);
      if (folder?.password_hash && !unlockedFolders.has(folder.id)) {
        setPendingFolderId(folder.id);
        setFolderPassword("");
        setPasswordError(false);
        setPasswordDialogOpen(true);
        return;
      }
    }
    setSelectedFolder(folderId);
  };

  const handleUnlockFolder = async () => {
    if (!pendingFolderId) return;
    try {
      const ok = await verifyPassword.mutateAsync({ folderId: pendingFolderId, password: folderPassword });
      if (ok) {
        setUnlockedFolders((prev) => new Set(prev).add(pendingFolderId));
        setSelectedFolder(pendingFolderId);
        setPasswordDialogOpen(false);
      } else {
        setPasswordError(true);
      }
    } catch {
      setPasswordError(true);
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    if (newFolderPassword && newFolderPassword !== newFolderPasswordConfirm) {
      toast({ title: t("notes.passwords_dont_match"), variant: "destructive" });
      return;
    }
    createFolder.mutate(
      { name: newFolderName.trim(), password: newFolderPassword || undefined, color: newFolderColor },
      {
        onSuccess: () => {
          setCreateFolderOpen(false);
          setNewFolderName("");
          setNewFolderColor("#6366f1");
          setNewFolderPassword("");
          setNewFolderPasswordConfirm("");
        },
      }
    );
  };

  // Open edit folder dialog
  const openEditFolder = (folder: NoteFolder) => {
    // If folder has password and is not unlocked, require unlock first
    if (folder.password_hash && !unlockedFolders.has(folder.id)) {
      setPendingFolderId(folder.id);
      setFolderPassword("");
      setPasswordError(false);
      setPasswordDialogOpen(true);
      return;
    }
    setEditingFolder(folder);
    setEditFolderName(folder.name);
    setEditFolderColor(folder.color || "#6366f1");
    setEditFolderCurrentPassword("");
    setEditFolderNewPassword("");
    setEditFolderNewPasswordConfirm("");
    setEditPasswordAction("keep");
    setEditPasswordError(false);
    setEditFolderOpen(true);
  };

  const handleEditFolder = async () => {
    if (!editingFolder || !editFolderName.trim()) return;

    // Update name/color
    updateFolder.mutate({ id: editingFolder.id, name: editFolderName.trim(), color: editFolderColor });

    // Handle password changes
    if (editPasswordAction !== "keep" && editingFolder.password_hash) {
      if (!editFolderCurrentPassword) {
        setEditPasswordError(true);
        return;
      }
      if (editPasswordAction === "change") {
        if (!editFolderNewPassword || editFolderNewPassword !== editFolderNewPasswordConfirm) {
          toast({ title: t("notes.passwords_dont_match"), variant: "destructive" });
          return;
        }
        const ok = await updateFolderPassword.mutateAsync({
          folderId: editingFolder.id,
          currentPassword: editFolderCurrentPassword,
          newPassword: editFolderNewPassword,
        });
        if (!ok) {
          setEditPasswordError(true);
          return;
        }
      } else if (editPasswordAction === "remove") {
        const ok = await updateFolderPassword.mutateAsync({
          folderId: editingFolder.id,
          currentPassword: editFolderCurrentPassword,
          newPassword: null,
        });
        if (!ok) {
          setEditPasswordError(true);
          return;
        }
        // Remove from unlocked set since no longer needed
        setUnlockedFolders((prev) => {
          const next = new Set(prev);
          next.delete(editingFolder.id);
          return next;
        });
      }
    } else if (editPasswordAction === "change" && !editingFolder.password_hash) {
      // Adding password to folder that didn't have one
      if (!editFolderNewPassword || editFolderNewPassword !== editFolderNewPasswordConfirm) {
        toast({ title: t("notes.passwords_dont_match"), variant: "destructive" });
        return;
      }
      const ok = await updateFolderPassword.mutateAsync({
        folderId: editingFolder.id,
        currentPassword: "",
        newPassword: editFolderNewPassword,
      });
      if (!ok) {
        toast({ title: t("common.error"), variant: "destructive" });
        return;
      }
    }

    setEditFolderOpen(false);
  };

  // Delete folder - require password for locked folders
  const handleRequestDeleteFolder = (folder: NoteFolder) => {
    setFolderToDelete(folder);
    setDeleteFolderPassword("");
    setDeleteFolderPasswordError(false);
    setDeleteFolderDialogOpen(true);
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;

    // If folder has password, verify it first
    if (folderToDelete.password_hash) {
      if (!deleteFolderPassword) {
        setDeleteFolderPasswordError(true);
        return;
      }
      try {
        const ok = await verifyPassword.mutateAsync({
          folderId: folderToDelete.id,
          password: deleteFolderPassword,
        });
        if (!ok) {
          setDeleteFolderPasswordError(true);
          return;
        }
      } catch {
        setDeleteFolderPasswordError(true);
        return;
      }
    }

    deleteFolder.mutate(folderToDelete.id);
    if (selectedFolder === folderToDelete.id) setSelectedFolder("all");
    setDeleteFolderDialogOpen(false);
    setFolderToDelete(null);
  };

  const openCreateDialog = () => {
    setEditingNote(null);
    setFormProjectId("");
    setFormTitle("");
    setFormContent("");
    setFormFolderId(selectedFolder !== "all" && selectedFolder !== "unfiled" ? selectedFolder : null);
    setEditorMode("edit");
    setDialogOpen(true);
  };

  useKeyboardShortcuts({ onNewNote: openCreateDialog });

  const openEditDialog = (note: Note) => {
    setEditingNote(note);
    setFormProjectId(note.project_id);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormFolderId(note.folder_id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formProjectId || !formTitle.trim()) return;

    if (editingNote) {
      updateNote.mutate(
        { id: editingNote.id, title: formTitle.trim(), content: formContent, project_id: formProjectId, folder_id: formFolderId },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createNote.mutate(
        { project_id: formProjectId, title: formTitle.trim(), content: formContent, folder_id: formFolderId },
        { onSuccess: () => setDialogOpen(false) }
      );
    }
  };

  const confirmDelete = (id: string) => {
    setNoteToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (noteToDelete) {
      deleteNote.mutate(noteToDelete);
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // === Backup Export ===
  const handleExport = async () => {
    if (!user) return;
    try {
      const { data: allNotes } = await supabase
        .from("notes" as any)
        .select("*, project:projects(name)")
        .eq("user_id", user.id);

      const { data: allFolders } = await supabase
        .from("note_folders" as any)
        .select("*")
        .eq("user_id", user.id);

      const foldersArr = (allFolders || []) as any[];
      const notesArr = (allNotes || []) as any[];

      const backup = {
        version: 1,
        exported_at: new Date().toISOString(),
        app: "timezoni",
        folders: foldersArr.map((f) => ({
          name: f.name,
          color: f.color,
          password_hash: f.password_hash,
          notes: notesArr
            .filter((n: any) => n.folder_id === f.id)
            .map((n: any) => ({
              title: n.title,
              content: n.content,
              project_name: n.project?.name || null,
              created_at: n.created_at,
            })),
        })),
        unfiled_notes: notesArr
          .filter((n: any) => !n.folder_id)
          .map((n: any) => ({
            title: n.title,
            content: n.content,
            project_name: n.project?.name || null,
            created_at: n.created_at,
          })),
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `timezoni-notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t("notes.backup_exported") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
  };

  // === Backup Import ===
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (backup.version !== 1 || backup.app !== "timezoni") {
        toast({ title: t("notes.invalid_backup"), variant: "destructive" });
        return;
      }

      const { data: existingProjects } = await supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", user.id);
      const projMap = new Map((existingProjects || []).map((p) => [p.name.toLowerCase(), p.id]));

      let importedFolders = 0;
      let importedNotes = 0;

      for (const folder of backup.folders || []) {
        const { data: newFolder, error: fErr } = await supabase
          .from("note_folders" as any)
          .insert({
            user_id: user.id,
            name: folder.name,
            color: folder.color || "#6366f1",
            password_hash: folder.password_hash || null,
          })
          .select("id")
          .single();

        if (fErr || !newFolder) continue;
        importedFolders++;
        const folderId = (newFolder as any).id;

        for (const note of folder.notes || []) {
          const projectId = note.project_name ? projMap.get(note.project_name.toLowerCase()) : null;
          if (!projectId) continue;

          await supabase.from("notes" as any).insert({
            user_id: user.id,
            project_id: projectId,
            folder_id: folderId,
            title: note.title,
            content: note.content || "",
          });
          importedNotes++;
        }
      }

      for (const note of backup.unfiled_notes || []) {
        const projectId = note.project_name ? projMap.get(note.project_name.toLowerCase()) : null;
        if (!projectId) continue;

        await supabase.from("notes" as any).insert({
          user_id: user.id,
          project_id: projectId,
          title: note.title,
          content: note.content || "",
        });
        importedNotes++;
      }

      toast({
        title: t("notes.backup_imported"),
        description: `${importedFolders} ${t("notes.folders_label")}, ${importedNotes} ${t("notes.title").toLowerCase()}`,
      });

      window.location.reload();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }

    if (importRef.current) importRef.current.value = "";
  };

  const folderColors = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <StickyNote className="h-8 w-8 text-primary" />
              {t("notes.title")}
            </h1>
            <p className="text-muted-foreground">{t("notes.subtitle")}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setCreateFolderOpen(true)}>
              <FolderPlus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{t("notes.new_folder")}</span>
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{t("notes.new_note")}</span>
            </Button>
          </div>
        </div>

        {/* Folders Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* All Notes */}
          <button
            onClick={() => setSelectedFolder("all")}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer",
              selectedFolder === "all"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <FolderOpen className={cn("h-7 w-7", selectedFolder === "all" && "text-primary")} />
            <span className={cn("text-xs font-medium text-center truncate w-full", selectedFolder === "all" && "text-primary")}>
              {t("notes.all_notes")}
            </span>
          </button>

          {/* Unfiled */}
          <button
            onClick={() => setSelectedFolder("unfiled")}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer",
              selectedFolder === "unfiled"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <FolderMinus className={cn("h-7 w-7", selectedFolder === "unfiled" && "text-primary")} />
            <span className={cn("text-xs font-medium text-center truncate w-full", selectedFolder === "unfiled" && "text-primary")}>
              {t("notes.unfiled")}
            </span>
          </button>

          {/* User folders */}
          {(folders || []).map((folder) => {
            const isSelected = selectedFolder === folder.id;
            const isLocked = folder.password_hash && !unlockedFolders.has(folder.id);

            return (
              <div key={folder.id} className="group relative">
                <button
                  onClick={() => handleSelectFolder(folder.id)}
                  className={cn(
                    "w-full flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer",
                    isSelected
                      ? "shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                  style={
                    isSelected
                      ? { borderColor: folder.color, backgroundColor: `${folder.color}15`, color: folder.color }
                      : undefined
                  }
                >
                  {isLocked ? (
                    <Lock className="h-7 w-7" style={isSelected ? { color: folder.color } : undefined} />
                  ) : folder.password_hash ? (
                    <Unlock className="h-7 w-7" style={isSelected ? { color: folder.color } : undefined} />
                  ) : (
                    <Folder className="h-7 w-7" style={isSelected ? { color: folder.color } : undefined} />
                  )}
                  <span className="text-xs font-medium text-center truncate w-full">{folder.name}</span>
                  <span className="w-3 h-3 rounded-full shrink-0 absolute top-2 left-2" style={{ backgroundColor: folder.color }} />
                </button>

                {/* Action buttons on hover */}
                <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditFolder(folder); }}
                    className="h-6 w-6 flex items-center justify-center rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Settings className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRequestDeleteFolder(folder); }}
                    className="h-6 w-6 flex items-center justify-center rounded-full bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Password unlock screen */}
        {isFolderLocked && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center space-y-4">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">{t("notes.folder_locked")}</p>
              <div className="max-w-xs mx-auto space-y-2">
                <Input
                  type="password"
                  placeholder={t("notes.enter_password")}
                  value={folderPassword}
                  onChange={(e) => { setFolderPassword(e.target.value); setPasswordError(false); }}
                  onKeyDown={(e) => e.key === "Enter" && handleUnlockFolder()}
                />
                {passwordError && <p className="text-destructive text-sm">{t("notes.wrong_password")}</p>}
                <Button onClick={() => { setPendingFolderId(selectedFolder); handleUnlockFolder(); }} disabled={verifyPassword.isPending}>
                  <Unlock className="h-4 w-4 mr-2" />
                  {t("notes.unlock")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters — only show when not locked */}
        {!isFolderLocked && (
          <>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("notes.search_placeholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-56"
                />
              </div>

              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t("notes.all_projects")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("notes.all_projects")}</SelectItem>
                  {activeProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color || "#6366f1" }} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("history.all_period")}</SelectItem>
                  <SelectItem value="today">{t("history.today")}</SelectItem>
                  <SelectItem value="week">{t("history.this_week")}</SelectItem>
                  <SelectItem value="month">{t("history.this_month")}</SelectItem>
                  <SelectItem value="custom">{t("notes.custom_date")}</SelectItem>
                </SelectContent>
              </Select>

              {dateFilter === "custom" && (
                <div className="flex gap-2 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn(!customFrom && "text-muted-foreground")}>
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {customFrom ? formatInTz(customFrom, "dd/MM/yyyy") : t("notes.from")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} locale={locale} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground text-sm">—</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn(!customTo && "text-muted-foreground")}>
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {customTo ? formatInTz(customTo, "dd/MM/yyyy") : t("notes.to")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customTo} onSelect={setCustomTo} locale={locale} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Notes list */}
            <div className="grid gap-4">
              {pagination.paginatedItems.map((note) => {
                const isExpanded = expandedNotes.has(note.id);
                const isLong = note.content.length > 200;
                const projectColor = note.project?.color || note.project?.category?.color || "#6366f1";
                const noteFolder = folders?.find((f) => f.id === note.folder_id);

                return (
                  <Card
                    key={note.id}
                    className="overflow-hidden transition-shadow hover:shadow-md"
                    style={{ borderLeftWidth: 4, borderLeftColor: projectColor }}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs font-normal">
                              <span className="w-2 h-2 rounded-full mr-1.5 shrink-0" style={{ backgroundColor: projectColor }} />
                              {note.project?.name || "—"}
                            </Badge>
                            {noteFolder && (
                              <Badge variant="outline" className="text-xs font-normal gap-1">
                                <Folder className="h-3 w-3" />
                                {noteFolder.name}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatInTz(new Date(note.created_at), "PPp")}
                            </span>
                          </div>

                          <h3 className="font-semibold text-base leading-snug">{note.title}</h3>

                          <div
                            className={cn(
                              "text-sm text-muted-foreground break-words prose prose-sm dark:prose-invert max-w-none",
                              !isExpanded && isLong && "line-clamp-3"
                            )}
                          >
                            <ReactMarkdown>{note.content}</ReactMarkdown>
                          </div>

                          {isLong && (
                            <button
                              onClick={() => toggleExpand(note.id)}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              {isExpanded ? (
                                <><ChevronUp className="h-3 w-3" />{t("common.close")}</>
                              ) : (
                                <><ChevronDown className="h-3 w-3" />{t("notes.show_more")}</>
                              )}
                            </button>
                          )}

                          {note.updated_at !== note.created_at && (
                            <p className="text-[11px] text-muted-foreground/60 italic">
                              {t("notes.updated_at")}: {formatInTz(new Date(note.updated_at), "PPp")}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(note)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => confirmDelete(note.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {!isLoading && filteredNotes.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <StickyNote className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                    <p className="text-muted-foreground">{t("notes.no_notes")}</p>
                    <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("notes.new_note")}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {filteredNotes.length > 0 && (
              <PaginationControls
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                setCurrentPage={pagination.setCurrentPage}
                setPageSize={pagination.setPageSize}
              />
            )}

            {/* Backup buttons */}
            <div className="flex gap-2 flex-wrap pt-2 border-t">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                {t("notes.export_backup")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" />
                {t("notes.import_backup")}
              </Button>
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Note Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNote ? t("notes.edit_note") : t("notes.new_note")}</DialogTitle>
            <DialogDescription>{editingNote ? t("notes.edit_note_desc") : t("notes.new_note_desc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("history.project")}</Label>
              <ProjectPicker value={formProjectId} onValueChange={setFormProjectId} projects={activeProjects} />
            </div>

            {(folders || []).length > 0 && (
              <div className="space-y-2">
                <Label>{t("notes.folder")}</Label>
                <Select value={formFolderId || "none"} onValueChange={(v) => setFormFolderId(v === "none" ? null : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("notes.no_folder")}</SelectItem>
                    {(folders || []).map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                          {f.password_hash ? <Lock className="h-3 w-3" /> : null}
                          {f.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("notes.note_title")}</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder={t("notes.title_placeholder")} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("notes.note_content")}</Label>
                <div className="flex items-center gap-1">
                  <Button variant={editorMode === "edit" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs gap-1" onClick={() => setEditorMode("edit")}>
                    <Edit3 className="h-3 w-3" />{t("notes.edit_mode")}
                  </Button>
                  <Button variant={editorMode === "preview" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs gap-1" onClick={() => setEditorMode("preview")}>
                    <Eye className="h-3 w-3" />{t("notes.preview_mode")}
                  </Button>
                </div>
              </div>
              {editorMode === "edit" ? (
                <>
                  <div className="flex gap-1 border-b pb-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title={t("notes.bold")} onClick={() => setFormContent((c) => c + "**text**")}><Bold className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title={t("notes.italic")} onClick={() => setFormContent((c) => c + "*text*")}><Italic className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title={t("notes.heading")} onClick={() => setFormContent((c) => c + "\n## ")}><Heading className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title={t("notes.list")} onClick={() => setFormContent((c) => c + "\n- ")}><List className="h-3.5 w-3.5" /></Button>
                    <span className="ml-auto text-[10px] text-muted-foreground self-center">{t("notes.markdown_supported")}</span>
                  </div>
                  <Textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} placeholder={t("notes.content_placeholder")} className="min-h-[160px] resize-y font-mono text-sm" />
                </>
              ) : (
                <div className="min-h-[160px] rounded-md border p-3 prose prose-sm dark:prose-invert max-w-none overflow-auto">
                  {formContent ? <ReactMarkdown>{formContent}</ReactMarkdown> : <p className="text-muted-foreground italic">{t("notes.content_placeholder")}</p>}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={!formProjectId || !formTitle.trim() || createNote.isPending || updateNote.isPending}>
              {editingNote ? t("notes.update_note") : t("notes.save_note")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Note Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("notes.delete_note")}</AlertDialogTitle>
            <AlertDialogDescription>{t("notes.confirm_delete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("notes.new_folder")}</DialogTitle>
            <DialogDescription>{t("notes.new_folder_desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("notes.folder_name")}</Label>
              <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder={t("notes.folder_name_placeholder")} />
            </div>

            <div className="space-y-2">
              <Label>{t("notes.folder_color")}</Label>
              <div className="flex gap-2 flex-wrap">
                {folderColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewFolderColor(c)}
                    className={cn("w-7 h-7 rounded-full border-2 transition-transform", newFolderColor === c ? "border-foreground scale-110" : "border-transparent")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("notes.folder_password_optional")}</Label>
              <Input type="password" value={newFolderPassword} onChange={(e) => setNewFolderPassword(e.target.value)} placeholder={t("notes.password_placeholder")} />
            </div>

            {newFolderPassword && (
              <>
                <div className="space-y-2">
                  <Label>{t("notes.confirm_password")}</Label>
                  <Input type="password" value={newFolderPasswordConfirm} onChange={(e) => setNewFolderPasswordConfirm(e.target.value)} placeholder={t("notes.confirm_password_placeholder")} />
                </div>
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive font-medium">{t("notes.password_warning")}</p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || createFolder.isPending}>
              <FolderPlus className="h-4 w-4 mr-1" />
              {t("notes.create_folder")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog open={editFolderOpen} onOpenChange={setEditFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("notes.edit_folder")}</DialogTitle>
            <DialogDescription>{t("notes.edit_folder_desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("notes.folder_name")}</Label>
              <Input value={editFolderName} onChange={(e) => setEditFolderName(e.target.value)} placeholder={t("notes.folder_name_placeholder")} />
            </div>

            <div className="space-y-2">
              <Label>{t("notes.folder_color")}</Label>
              <div className="flex gap-2 flex-wrap">
                {folderColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditFolderColor(c)}
                    className={cn("w-7 h-7 rounded-full border-2 transition-transform", editFolderColor === c ? "border-foreground scale-110" : "border-transparent")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Password management */}
            {editingFolder?.password_hash ? (
              <div className="space-y-3">
                <Label>{t("notes.password_management")}</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={editPasswordAction === "keep" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditPasswordAction("keep")}
                  >
                    {t("notes.keep_password")}
                  </Button>
                  <Button
                    variant={editPasswordAction === "change" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditPasswordAction("change")}
                  >
                    {t("notes.change_password")}
                  </Button>
                  <Button
                    variant={editPasswordAction === "remove" ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setEditPasswordAction("remove")}
                  >
                    {t("notes.remove_password")}
                  </Button>
                </div>

                {editPasswordAction !== "keep" && (
                  <div className="space-y-2">
                    <Label>{t("notes.current_password")}</Label>
                    <Input
                      type="password"
                      value={editFolderCurrentPassword}
                      onChange={(e) => { setEditFolderCurrentPassword(e.target.value); setEditPasswordError(false); }}
                      placeholder={t("notes.enter_password")}
                    />
                    {editPasswordError && <p className="text-destructive text-sm">{t("notes.wrong_password")}</p>}
                  </div>
                )}

                {editPasswordAction === "change" && (
                  <>
                    <div className="space-y-2">
                      <Label>{t("notes.new_password")}</Label>
                      <Input type="password" value={editFolderNewPassword} onChange={(e) => setEditFolderNewPassword(e.target.value)} placeholder={t("notes.password_placeholder")} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("notes.confirm_password")}</Label>
                      <Input type="password" value={editFolderNewPasswordConfirm} onChange={(e) => setEditFolderNewPasswordConfirm(e.target.value)} placeholder={t("notes.confirm_password_placeholder")} />
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive font-medium">{t("notes.password_warning")}</p>
                    </div>
                  </>
                )}

                {editPasswordAction === "remove" && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">{t("notes.remove_password_warning")}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Label>{t("notes.add_password_optional")}</Label>
                <div className="flex gap-2">
                  <Button
                    variant={editPasswordAction === "keep" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditPasswordAction("keep")}
                  >
                    {t("notes.no_password")}
                  </Button>
                  <Button
                    variant={editPasswordAction === "change" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditPasswordAction("change")}
                  >
                    {t("notes.add_password")}
                  </Button>
                </div>

                {editPasswordAction === "change" && (
                  <>
                    <div className="space-y-2">
                      <Label>{t("notes.new_password")}</Label>
                      <Input type="password" value={editFolderNewPassword} onChange={(e) => setEditFolderNewPassword(e.target.value)} placeholder={t("notes.password_placeholder")} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("notes.confirm_password")}</Label>
                      <Input type="password" value={editFolderNewPasswordConfirm} onChange={(e) => setEditFolderNewPasswordConfirm(e.target.value)} placeholder={t("notes.confirm_password_placeholder")} />
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive font-medium">{t("notes.password_warning")}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFolderOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleEditFolder} disabled={!editFolderName.trim() || updateFolder.isPending || updateFolderPassword.isPending}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation */}
      <Dialog open={deleteFolderDialogOpen} onOpenChange={setDeleteFolderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t("notes.delete_folder")}
            </DialogTitle>
            <DialogDescription>{t("notes.delete_folder_cascade_desc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive font-medium">{t("notes.delete_folder_warning")}</p>
            </div>

            {folderToDelete?.password_hash && (
              <div className="space-y-2">
                <Label>{t("notes.enter_password_to_delete")}</Label>
                <Input
                  type="password"
                  value={deleteFolderPassword}
                  onChange={(e) => { setDeleteFolderPassword(e.target.value); setDeleteFolderPasswordError(false); }}
                  placeholder={t("notes.enter_password")}
                  onKeyDown={(e) => e.key === "Enter" && handleDeleteFolder()}
                />
                {deleteFolderPasswordError && <p className="text-destructive text-sm">{t("notes.wrong_password")}</p>}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFolderDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFolder}
              disabled={!!(folderToDelete?.password_hash && !deleteFolderPassword) || deleteFolder.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Unlock Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />{t("notes.unlock_folder")}</DialogTitle>
            <DialogDescription>{t("notes.enter_folder_password")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              type="password"
              value={folderPassword}
              onChange={(e) => { setFolderPassword(e.target.value); setPasswordError(false); }}
              placeholder={t("notes.enter_password")}
              onKeyDown={(e) => e.key === "Enter" && handleUnlockFolder()}
              autoFocus
            />
            {passwordError && <p className="text-destructive text-sm">{t("notes.wrong_password")}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleUnlockFolder} disabled={!folderPassword || verifyPassword.isPending}>
              <Unlock className="h-4 w-4 mr-1" />{t("notes.unlock")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
