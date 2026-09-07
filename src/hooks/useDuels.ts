import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type DuelStatus = "pending" | "active" | "finished" | "declined" | "cancelled";

export interface Duel {
  id: string;
  challenger_id: string;
  opponent_id: string;
  title: string | null;
  target_minutes: number;
  start_date: string;
  end_date: string;
  status: string;
  winner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DuelScore {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  seconds: number;
}

export function useDuels() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["duels", user?.id],
    queryFn: async () => {
      if (!user) return [] as Duel[];
      const { data, error } = await (supabase as any)
        .from("duels")
        .select("*")
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as Duel[];
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });
}

export function useDuelScoreboard(duelId: string | null) {
  return useQuery({
    queryKey: ["duelScoreboard", duelId],
    queryFn: async () => {
      if (!duelId) return [] as DuelScore[];
      const { data, error } = await (supabase as any).rpc("get_duel_scoreboard", { _duel_id: duelId });
      if (error) throw error;
      return (data || []) as DuelScore[];
    },
    enabled: !!duelId,
    refetchInterval: 60_000,
  });
}

export function useCreateDuel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      opponentId,
      title,
      targetMinutes,
      startDate,
      endDate,
    }: {
      opponentId: string;
      title?: string | null;
      targetMinutes: number;
      startDate: string;
      endDate: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("duels")
        .insert({
          challenger_id: user.id,
          opponent_id: opponentId,
          title: title || null,
          target_minutes: targetMinutes,
          start_date: startDate,
          end_date: endDate,
          status: "pending",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Duel;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["duels"] }),
  });
}

export function useRespondDuel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ duelId, accept }: { duelId: string; accept: boolean }) => {
      const { error } = await (supabase as any)
        .from("duels")
        .update({ status: accept ? "active" : "declined", updated_at: new Date().toISOString() })
        .eq("id", duelId);
      if (error) throw error;
      return duelId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["duels"] });
    },
  });
}

export function useCancelDuel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (duelId: string) => {
      const { error } = await (supabase as any).from("duels").delete().eq("id", duelId);
      if (error) throw error;
      return duelId;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["duels"] }),
  });
}

/** Encerra o duelo registrando o vencedor (ou empate com winner_id nulo). */
export function useFinishDuel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ duelId, winnerId }: { duelId: string; winnerId: string | null }) => {
      const { error } = await (supabase as any)
        .from("duels")
        .update({ status: "finished", winner_id: winnerId, updated_at: new Date().toISOString() })
        .eq("id", duelId)
        .eq("status", "active");
      if (error) throw error;
      return duelId;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["duels"] }),
  });
}

export function isDuelOver(duel: Duel): boolean {
  const today = new Date();
  const end = new Date(`${duel.end_date}T23:59:59`);
  return end.getTime() < today.getTime();
}

export function duelDaysLeft(duel: Duel): number {
  const end = new Date(`${duel.end_date}T23:59:59`);
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
}
