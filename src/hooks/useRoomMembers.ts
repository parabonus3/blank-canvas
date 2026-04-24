import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  role: string;
  total_seconds: number;
  is_online: boolean;
  is_timer_active: boolean;
  last_active_at: string | null;
  joined_at: string;
  display_name?: string;
  friend_code?: string;
  avatar_url?: string;
  is_muted?: boolean;
  notifications_enabled?: boolean;
  status_text?: string | null;
  timer_started_at?: string | null;
}

export function useRoomMembers(roomId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!roomId || !user) return;

    supabase
      .from("room_members")
      .update({ is_online: true, last_active_at: new Date().toISOString() } as any)
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .then();

    const handleOffline = () => {
      supabase
        .from("room_members")
        .update({ is_online: false })
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .then();
    };

    window.addEventListener("beforeunload", handleOffline);
    return () => {
      handleOffline();
      window.removeEventListener("beforeunload", handleOffline);
    };
  }, [roomId, user]);

  const query = useQuery({
    queryKey: ["roomMembers", roomId],
    queryFn: async () => {
      if (!roomId) return [];

      const { data: members, error } = await supabase
        .from("room_members")
        .select("*")
        .eq("room_id", roomId)
        .order("total_seconds", { ascending: false });
      if (error) throw error;

      const { data: profiles } = await supabase.rpc("get_room_member_profiles", {
        _room_id: roomId,
      });

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      return (members || []).map((m: any) => ({
        ...m,
        display_name: profileMap.get(m.user_id)?.display_name || "Usuário",
        friend_code: profileMap.get(m.user_id)?.friend_code || "",
        avatar_url: profileMap.get(m.user_id)?.avatar_url || null,
      })) as RoomMember[];
    },
    enabled: !!roomId && !!user,
  });

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-members-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` },
        (payload: any) => {
          queryClient.invalidateQueries({ queryKey: ["roomMembers", roomId] });
          
          // Auto-log study started/completed events
          const newRow = payload.new;
          const oldRow = payload.old;
          if (newRow && oldRow && user) {
            // Only log for other members (our own logs are handled locally)
            if (newRow.user_id !== user.id) {
              if (!oldRow.is_timer_active && newRow.is_timer_active) {
                // Someone started studying
                supabase.from("room_activity_log").insert({
                  room_id: roomId,
                  user_id: newRow.user_id,
                  action_type: "study_started",
                }).then();
              }
            }
            
            // Check for milestone achievements (1h, 5h, 10h, 50h, 100h)
            if (newRow.total_seconds !== oldRow.total_seconds) {
              const oldHours = Math.floor(oldRow.total_seconds / 3600);
              const newHours = Math.floor(newRow.total_seconds / 3600);
              const milestones = [1, 5, 10, 50, 100, 200, 500];
              for (const m of milestones) {
                if (oldHours < m && newHours >= m) {
                  supabase.from("room_activity_log").insert({
                    room_id: roomId,
                    user_id: newRow.user_id,
                    action_type: "milestone",
                    metadata: { hours: m },
                  }).then();
                  break;
                }
              }
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["roomMembers", roomId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["roomMembers", roomId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient, user]);

  return query;
}

export function useLeaveRoom() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("room_members")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["roomMembers"] });
    },
  });
}

export function useUpdateMemberSeconds() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, userId, seconds }: { roomId: string; userId: string; seconds: number }) => {
      const { data: current } = await supabase
        .from("room_members")
        .select("total_seconds")
        .eq("room_id", roomId)
        .eq("user_id", userId)
        .single();

      if (!current) return;

      const { error } = await supabase
        .from("room_members")
        .update({ total_seconds: (current.total_seconds || 0) + seconds })
        .eq("room_id", roomId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roomMembers", variables.roomId] });
    },
  });
}
