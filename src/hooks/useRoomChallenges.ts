import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface RoomChallengeMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_flair: string | null;
  avatar_flair_color: string | null;
  seconds_current: number;
  completed_current: boolean;
  last_completed_at: string | null;
  completed_periods_total: number;
  days_since_completed: number | null;
}

export interface RoomChallenge {
  challenge_id: string;
  title: string;
  description: string | null;
  emoji: string;
  period_type: "daily" | "weekly";
  target_minutes: number;
  duration_days: number | null;
  start_date: string;
  is_active: boolean;
  created_at: string;
  members: RoomChallengeMember[];
}

export function useRoomChallenges(roomId: string | undefined) {
  return useQuery({
    queryKey: ["roomChallenges", roomId],
    queryFn: async (): Promise<RoomChallenge[]> => {
      if (!roomId) return [];
      const { data, error } = await (supabase.rpc as any)("get_room_challenges_with_status", {
        _room_id: roomId,
      });
      if (error) throw error;
      return (data || []) as RoomChallenge[];
    },
    enabled: !!roomId,
    refetchInterval: 30000,
  });
}

export function useCreateChallenge() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      roomId: string;
      title: string;
      description?: string | null;
      emoji?: string;
      period_type: "daily" | "weekly";
      target_minutes: number;
      duration_days?: number | null;
    }) => {
      const { data, error } = await (supabase.rpc as any)("create_room_challenge", {
        _room_id: input.roomId,
        _title: input.title,
        _description: input.description ?? null,
        _emoji: input.emoji ?? "🎯",
        _period_type: input.period_type,
        _target_minutes: input.target_minutes,
        _duration_days: input.duration_days ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["roomChallenges", vars.roomId] });
      toast({ title: "OK" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateChallenge() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      roomId: string;
      title?: string;
      description?: string | null;
      emoji?: string;
      target_minutes?: number;
      duration_days?: number | null;
      is_active?: boolean;
    }) => {
      const { error } = await (supabase.rpc as any)("update_room_challenge", {
        _id: input.id,
        _title: input.title ?? null,
        _description: input.description ?? null,
        _emoji: input.emoji ?? null,
        _target_minutes: input.target_minutes ?? null,
        _duration_days: input.duration_days ?? null,
        _is_active: input.is_active ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["roomChallenges", vars.roomId] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteChallenge() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { id: string; roomId: string }) => {
      const { error } = await (supabase.rpc as any)("delete_room_challenge", { _id: input.id });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["roomChallenges", vars.roomId] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useMemberChallengeCalendar(
  challengeId: string | undefined,
  userId: string | undefined,
  from: string,
  to: string,
) {
  return useQuery({
    queryKey: ["challengeCalendar", challengeId, userId, from, to],
    queryFn: async () => {
      if (!challengeId || !userId) return [];
      const { data, error } = await (supabase.rpc as any)("get_member_challenge_calendar", {
        _challenge_id: challengeId,
        _user_id: userId,
        _from: from,
        _to: to,
      });
      if (error) throw error;
      return (data || []) as Array<{
        period_start: string;
        seconds_in_period: number;
        completed: boolean;
      }>;
    },
    enabled: !!challengeId && !!userId,
  });
}
