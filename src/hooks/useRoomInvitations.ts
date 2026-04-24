import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface RoomInvitation {
  id: string;
  room_id: string;
  inviter_id: string;
  invitee_id: string;
  status: string;
  created_at: string;
  room_name?: string;
  inviter_name?: string;
}

export function usePendingInvitations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["pendingInvitations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("room_invitations")
        .select("*")
        .eq("invitee_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Enrich with room names
      const roomIds = [...new Set((data || []).map((d) => d.room_id))];
      const rooms: Record<string, string> = {};
      for (const rid of roomIds) {
        const { data: room } = await supabase
          .from("study_rooms")
          .select("name")
          .eq("id", rid)
          .maybeSingle();
        // This may fail due to RLS if user isn't a member yet, use function
        if (room) rooms[rid] = room.name;
      }

      return (data || []).map((inv) => ({
        ...inv,
        room_name: rooms[inv.room_id] || "Sala",
      })) as RoomInvitation[];
    },
    enabled: !!user,
  });

  // Realtime subscription is centralized in `useRoomInvitationsRealtime`
  // (mounted once in App.tsx) to avoid duplicate channel names across consumers.

  return query;
}

export function useInviteMember() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ roomId, friendCode }: { roomId: string; friendCode: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Find user by friend_code
      const { data: found, error: findError } = await supabase.rpc("find_user_by_friend_code", {
        _code: friendCode,
      });
      if (findError) throw findError;
      if (!found || found.length === 0) throw new Error("Usuário não encontrado com esse código");

      const inviteeId = found[0].user_id;
      if (inviteeId === user.id) throw new Error("Você não pode convidar a si mesmo");

      // Check if already a member
      const { data: existing } = await supabase
        .from("room_members")
        .select("id")
        .eq("room_id", roomId)
        .eq("user_id", inviteeId)
        .maybeSingle();
      if (existing) throw new Error("Este usuário já é membro da sala");

      // Check if invitation already exists
      const { data: existingInv } = await supabase
        .from("room_invitations")
        .select("id")
        .eq("room_id", roomId)
        .eq("invitee_id", inviteeId)
        .eq("status", "pending")
        .maybeSingle();
      if (existingInv) throw new Error("Convite já enviado para este usuário");

      const { error } = await supabase.from("room_invitations").insert({
        room_id: roomId,
        inviter_id: user.id,
        invitee_id: inviteeId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
      toast({ title: "Convite enviado!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao convidar", description: error.message, variant: "destructive" });
    },
  });
}

export function useRespondInvitation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ invitationId, roomId, accept }: { invitationId: string; roomId: string; accept: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      const status = accept ? "accepted" : "declined";
      const { error } = await supabase
        .from("room_invitations")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", invitationId);
      if (error) throw error;

      if (accept) {
        // Add as member
        const { error: memberError } = await supabase.from("room_members").insert({
          room_id: roomId,
          user_id: user.id,
          role: "member",
        });
        if (memberError) throw memberError;

        // Log activity
        await supabase.from("room_activity_log").insert({
          room_id: roomId,
          user_id: user.id,
          action_type: "member_joined",
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["roomMembers"] });
      toast({ title: variables.accept ? "Você entrou na sala!" : "Convite recusado" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useJoinByInviteCode() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ code, password }: { code: string; password?: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("join_room_by_invite_code", {
        _code: code.toUpperCase(),
        _password: password || null,
      });
      if (error) {
        if (error.message.includes("Already a member")) throw new Error("Você já é membro desta sala");
        if (error.message.includes("Invalid invite code")) throw new Error("Código de convite inválido");
        if (error.message.includes("Invalid password")) throw new Error("Invalid password");
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: "Você entrou na sala!" });
    },
    onError: (error) => {
      if (error.message === "Invalid password") return; // handled by dialog
      toast({ title: "Erro ao entrar na sala", description: error.message, variant: "destructive" });
    },
  });
}
