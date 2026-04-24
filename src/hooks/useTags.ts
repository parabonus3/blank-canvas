import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export function useTags() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tags", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("tags" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      if (error) throw error;
      return (data as any[]) as Tag[];
    },
    enabled: !!user,
  });
}

export function useCreateTag() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("tags" as any)
        .insert({ user_id: user.id, name, color })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tags" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useTimeEntryTags(timeEntryId?: string) {
  return useQuery({
    queryKey: ["timeEntryTags", timeEntryId],
    queryFn: async () => {
      if (!timeEntryId) return [];
      const { data, error } = await supabase
        .from("time_entry_tags" as any)
        .select("*, tag:tags(*)")
        .eq("time_entry_id", timeEntryId);
      if (error) throw error;
      return (data as any[]).map((d: any) => d.tag as Tag);
    },
    enabled: !!timeEntryId,
  });
}

export function useSaveTimeEntryTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ timeEntryId, tagIds }: { timeEntryId: string; tagIds: string[] }) => {
      // Delete existing
      await supabase.from("time_entry_tags" as any).delete().eq("time_entry_id", timeEntryId);
      // Insert new
      if (tagIds.length > 0) {
        const rows = tagIds.map((tag_id) => ({ time_entry_id: timeEntryId, tag_id }));
        const { error } = await supabase.from("time_entry_tags" as any).insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntryTags"] });
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    },
  });
}
