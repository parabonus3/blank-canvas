import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef } from "react";
import { playMessageReceived } from "@/lib/soundEffects";

export interface RoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name?: string;
}

interface UseRoomMessagesOptions {
  notificationsEnabled?: boolean;
  joinedAt?: string;
}

export function useRoomMessages(roomId: string | undefined, options?: UseRoomMessagesOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const notificationsEnabled = options?.notificationsEnabled ?? true;
  const joinedAt = options?.joinedAt;
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const query = useQuery({
    queryKey: ["roomMessages", roomId],
    queryFn: async () => {
      if (!roomId) return [];

      let query = supabase
        .from("room_messages")
        .select("*")
        .eq("room_id", roomId);
      
      if (joinedAt) {
        query = query.gte("created_at", joinedAt);
      }

      const { data, error } = await query
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;

      // Get profiles for display names
      const { data: profiles } = await supabase.rpc("get_room_member_profiles", {
        _room_id: roomId,
      });
      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      return (data || []).map((m: any) => ({
        ...m,
        display_name: profileMap.get(m.user_id)?.display_name || "Usuário",
      })) as RoomMessage[];
    },
    enabled: !!roomId && !!user,
  });

  // Realtime for new messages
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-messages-${roomId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["roomMessages", roomId] });

          // Play sound if message is from someone else and notifications are on
          const newMsg = payload.new as any;
          if (newMsg?.user_id !== userIdRef.current && notificationsEnabled) {
            playMessageReceived();

            // Browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('💬 Nova mensagem', {
                body: newMsg.content?.slice(0, 100),
                icon: '/favicon.ico',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient, notificationsEnabled]);

  return query;
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, content }: { roomId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("room_messages").insert({
        room_id: roomId,
        user_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roomMessages", variables.roomId] });
    },
  });
}
