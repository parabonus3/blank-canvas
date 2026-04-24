import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface Note {
  id: string;
  user_id: string;
  project_id: string;
  folder_id: string | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  project?: {
    id: string;
    name: string;
    color: string | null;
    category?: {
      id: string;
      name: string;
      color: string;
    } | null;
  } | null;
}

export function useNotes(projectId?: string, folderId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notes", user?.id, projectId, folderId],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("notes" as any)
        .select(`
          *,
          project:projects(id, name, color, category:categories(id, name, color))
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (projectId && projectId !== "all") {
        query = query.eq("project_id", projectId);
      }

      // Filter by folder
      if (folderId === "unfiled") {
        query = query.is("folder_id", null);
      } else if (folderId && folderId !== "all") {
        query = query.eq("folder_id", folderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) as Note[];
    },
    enabled: !!user,
  });
}

export function useCreateNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      project_id,
      title,
      content,
      folder_id,
    }: {
      project_id: string;
      title: string;
      content: string;
      folder_id?: string | null;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const insertData: Record<string, unknown> = {
        user_id: user.id,
        project_id,
        title,
        content,
      };
      if (folder_id) insertData.folder_id = folder_id;

      const { data, error } = await supabase
        .from("notes" as any)
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast({ title: t("notes.note_created") });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      content,
      project_id,
      folder_id,
    }: {
      id: string;
      title?: string;
      content?: string;
      project_id?: string;
      folder_id?: string | null;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (project_id !== undefined) updateData.project_id = project_id;
      if (folder_id !== undefined) updateData.folder_id = folder_id;

      const { data, error } = await supabase
        .from("notes" as any)
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast({ title: t("notes.note_updated") });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notes" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast({ title: t("notes.note_deleted") });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
