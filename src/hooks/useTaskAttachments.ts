import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface TaskAttachment {
  id: string;
  task_id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  /** Signed URL, resolved client-side (bucket is private). */
  url?: string | null;
}

const BUCKET = "task-attachments";

async function signUrls(rows: TaskAttachment[]): Promise<TaskAttachment[]> {
  if (!rows.length) return rows;
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(rows.map(r => r.storage_path), 60 * 60);
  const map = new Map((data || []).map((d: any) => [d.path, d.signedUrl as string]));
  return rows.map(r => ({ ...r, url: map.get(r.storage_path) ?? null }));
}

export function useTaskAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task_attachments", taskId],
    queryFn: async (): Promise<TaskAttachment[]> => {
      if (!taskId) return [];
      const { data, error } = await (supabase as any)
        .from("task_attachments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return signUrls((data || []) as TaskAttachment[]);
    },
    enabled: !!taskId,
    staleTime: 30_000,
  });
}

/** Attachment counts for every task of a board (for card badges). */
export function useBoardAttachmentCounts(taskIds: string[]) {
  const key = taskIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["board_attachment_counts", key],
    queryFn: async () => {
      const map = new Map<string, number>();
      if (!taskIds.length) return map;
      const { data, error } = await (supabase as any)
        .from("task_attachments")
        .select("task_id")
        .in("task_id", taskIds);
      if (error) throw error;
      (data || []).forEach((r: any) => map.set(r.task_id, (map.get(r.task_id) || 0) + 1));
      return map;
    },
    enabled: taskIds.length > 0,
    staleTime: 30_000,
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({ taskId, boardId, file }: { taskId: string; boardId: string; file: File }) => {
      if (!user) throw new Error("Not authenticated");
      const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
      const path = `${boardId}/${taskId}/${crypto.randomUUID()}-${safe}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { error } = await (supabase as any).from("task_attachments").insert({
        task_id: taskId,
        user_id: user.id,
        file_name: file.name,
        storage_path: path,
        file_type: file.type || null,
        file_size: file.size,
      });
      if (error) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw error;
      }
      return path;
    },
    onSuccess: (_p, v) => {
      qc.invalidateQueries({ queryKey: ["task_attachments", v.taskId] });
      qc.invalidateQueries({ queryKey: ["board_attachment_counts"] });
      toast({ title: t("kanban.attachment_uploaded", "Anexo enviado") });
    },
    onError: (e: any) =>
      toast({ title: t("common.error"), description: e?.message, variant: "destructive" }),
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({ attachment }: { attachment: TaskAttachment }) => {
      const { error } = await (supabase as any)
        .from("task_attachments").delete().eq("id", attachment.id);
      if (error) throw error;
      await supabase.storage.from(BUCKET).remove([attachment.storage_path]);
      return attachment.task_id;
    },
    onSuccess: (taskId) => {
      qc.invalidateQueries({ queryKey: ["task_attachments", taskId] });
      qc.invalidateQueries({ queryKey: ["board_attachment_counts"] });
    },
    onError: (e: any) =>
      toast({ title: t("common.error"), description: e?.message, variant: "destructive" }),
  });
}
