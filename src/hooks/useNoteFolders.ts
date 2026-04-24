import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface NoteFolder {
  id: string;
  user_id: string;
  name: string;
  password_hash: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export function useNoteFolders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["note_folders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("note_folders" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as any[]) as NoteFolder[];
    },
    enabled: !!user,
  });
}

export function useCreateNoteFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      name,
      password,
      color,
    }: {
      name: string;
      password?: string;
      color?: string;
    }) => {
      const { data, error } = await supabase.rpc("create_note_folder" as any, {
        _name: name,
        _password: password || null,
        _color: color || "#6366f1",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note_folders"] });
      toast({ title: t("notes.folder_created") });
    },
    onError: (error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateNoteFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name?: string; color?: string }) => {
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (color !== undefined) updateData.color = color;

      const { error } = await supabase
        .from("note_folders" as any)
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note_folders"] });
      toast({ title: t("notes.folder_updated") });
    },
    onError: (error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteNoteFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("note_folders" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note_folders"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast({ title: t("notes.folder_deleted") });
    },
    onError: (error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });
}

export function useVerifyFolderPassword() {
  return useMutation({
    mutationFn: async ({ folderId, password }: { folderId: string; password: string }) => {
      const { data, error } = await supabase.rpc("verify_folder_password" as any, {
        _folder_id: folderId,
        _password: password,
      });
      if (error) throw error;
      return data as boolean;
    },
  });
}

export function useUpdateFolderPassword() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      folderId,
      currentPassword,
      newPassword,
    }: {
      folderId: string;
      currentPassword: string;
      newPassword?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("update_folder_password" as any, {
        _folder_id: folderId,
        _current_password: currentPassword,
        _new_password: newPassword || null,
      });
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (ok) => {
      if (ok) {
        queryClient.invalidateQueries({ queryKey: ["note_folders"] });
        toast({ title: t("notes.folder_updated") });
      }
    },
    onError: (error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });
}
