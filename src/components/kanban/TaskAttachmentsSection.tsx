import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Paperclip, Upload, Trash2, FileText, Image as ImageIcon, Star } from "lucide-react";
import {
  useTaskAttachments,
  useUploadAttachment,
  useDeleteAttachment,
  type TaskAttachment,
} from "@/hooks/useTaskAttachments";
import { useUpdateTask, type Task } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

function fmtSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const COVER_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#22c55e", "#06b6d4", "#eab308", "#ef4444"];

export function TaskAttachmentsSection({ task, boardId, canEdit }: { task: Task; boardId: string; canEdit: boolean }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { data: attachments = [] } = useTaskAttachments(task.id);
  const upload = useUploadAttachment();
  const remove = useDeleteAttachment();
  const updateTask = useUpdateTask();

  const isImage = (a: TaskAttachment) => (a.file_type || "").startsWith("image/");

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await upload.mutateAsync({ taskId: task.id, boardId, file });
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const setCoverImage = (a: TaskAttachment) =>
    updateTask.mutate({ id: task.id, cover_url: a.storage_path, cover_color: null } as any);
  const setCoverColor = (c: string | null) =>
    updateTask.mutate({ id: task.id, cover_color: c, cover_url: null } as any);

  return (
    <div className="space-y-4">
      {canEdit && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button className="w-full" disabled={uploading} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4 me-2" />
            {uploading ? t("kanban.uploading", "Enviando...") : t("kanban.add_attachment", "Adicionar anexo")}
          </Button>
        </>
      )}

      {attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Paperclip className="h-6 w-6 mx-auto text-muted-foreground/60 mb-1.5" />
          <p className="text-xs text-muted-foreground">{t("kanban.no_attachments", "Nenhum anexo ainda")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {attachments.map((a) => (
            <div key={a.id} className="rounded-lg border bg-card overflow-hidden">
              <a href={a.url || "#"} target="_blank" rel="noreferrer" className="block">
                {isImage(a) && a.url ? (
                  <img src={a.url} alt={a.file_name} className="h-24 w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-24 w-full flex items-center justify-center bg-muted/50">
                    <FileText className="h-7 w-7 text-muted-foreground" />
                  </div>
                )}
              </a>
              <div className="p-2 space-y-1">
                <div className="text-[11px] font-medium truncate" title={a.file_name}>{a.file_name}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{fmtSize(a.file_size)}</span>
                  {canEdit && (
                    <div className="flex items-center gap-0.5">
                      {isImage(a) && (
                        <Button
                          size="icon" variant="ghost" className="h-6 w-6"
                          title={t("kanban.set_as_cover", "Definir como capa") as string}
                          onClick={() => setCoverImage(a)}
                        >
                          <ImageIcon className={cn("h-3 w-3", task.cover_url === a.storage_path && "text-primary")} />
                        </Button>
                      )}
                      <Button
                        size="icon" variant="ghost" className="h-6 w-6"
                        onClick={() => remove.mutate({ attachment: a })}
                        aria-label={t("common.delete", "Excluir") as string}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <div className="space-y-2 pt-3 border-t">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Star className="h-3.5 w-3.5" />
            {t("kanban.cover", "Capa do card")}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {COVER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCoverColor(c)}
                aria-label={c}
                className={cn(
                  "h-7 w-7 rounded-md border-2 transition-transform hover:scale-110",
                  task.cover_color === c ? "border-foreground" : "border-transparent"
                )}
                style={{ background: c }}
              />
            ))}
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCoverColor(null)}>
              {t("kanban.remove_cover", "Remover capa")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
