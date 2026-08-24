import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface BoardColumn {
  id: string;
  board_id: string;
  user_id: string;
  title: string;
  color: string | null;
  position: number;
  wip_limit: number | null;
  created_at: string;
  updated_at: string;
}

export function useBoardColumns(boardId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["board_columns", boardId],
    queryFn: async () => {
      if (!boardId) return [];
      const { data, error } = await supabase
        .from("board_columns")
        .select("*")
        .eq("board_id", boardId)
        .order("position");
      if (error) throw error;
      return (data || []) as BoardColumn[];
    },
    enabled: !!boardId,
  });

  useEffect(() => {
    if (!boardId) return;
    const ch = supabase
      .channel(`board-columns-${boardId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "board_columns", filter: `board_id=eq.${boardId}` }, () => {
        qc.invalidateQueries({ queryKey: ["board_columns", boardId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [boardId, qc]);

  return query;
}

export function useCreateColumn() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { board_id: string; title: string; color?: string; position?: number }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("board_columns")
        .insert({ user_id: user.id, ...input })
        .select().single();
      if (error) throw error;
      return data as BoardColumn;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["board_columns", v.board_id] }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BoardColumn> & { id: string }) => {
      const { data, error } = await supabase.from("board_columns").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as BoardColumn;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["board_columns", data.board_id] }),
  });
}

export function useDeleteColumn() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const col = await supabase.from("board_columns").select("board_id").eq("id", id).maybeSingle();
      const { error } = await supabase.from("board_columns").delete().eq("id", id);
      if (error) throw error;
      return col.data?.board_id;
    },
    onSuccess: (boardId) => {
      qc.invalidateQueries({ queryKey: ["board_columns", boardId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Coluna excluída" });
    },
  });
}
