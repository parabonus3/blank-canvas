import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Board {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  color: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export function useBoards(includeArchived = false) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["boards", user?.id, includeArchived],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase.from("boards").select("*").eq("user_id", user.id);
      if (!includeArchived) q = q.eq("is_archived", false);
      const { data, error } = await q.order("is_favorite", { ascending: false }).order("position");
      if (error) throw error;
      return (data || []) as Board[];
    },
    enabled: !!user,
  });
}

export function useBoard(id: string | undefined) {
  return useQuery({
    queryKey: ["board", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("boards").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Board | null;
    },
    enabled: !!id,
  });
}

export function useCreateBoard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: Partial<Board> & { title: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("boards")
        .insert({
          user_id: user.id,
          title: input.title,
          description: input.description ?? null,
          color: input.color ?? null,
          project_id: input.project_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      // Cria 3 colunas padrão
      const cols = [
        { title: "A fazer", position: 0, color: "#94a3b8" },
        { title: "Em andamento", position: 1, color: "#f59e0b" },
        { title: "Concluído", position: 2, color: "#22c55e" },
      ];
      await supabase.from("board_columns").insert(
        cols.map(c => ({ board_id: data.id, user_id: user.id, ...c }))
      );
      return data as Board;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boards"] });
      toast({ title: "Quadro criado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Board> & { id: string }) => {
      const { data, error } = await supabase.from("boards").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Board;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["boards"] });
      qc.invalidateQueries({ queryKey: ["board", v.id] });
    },
  });
}

export function useDeleteBoard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("boards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boards"] });
      toast({ title: "Quadro excluído" });
    },
  });
}
