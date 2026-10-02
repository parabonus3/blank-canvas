import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type RoomSession = {
  id: string;
  room_id: string;
  created_by: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  is_cancelled: boolean;
  created_at: string;
  updated_at: string;
};

export type RoomSessionAttendee = {
  id: string;
  session_id: string;
  user_id: string;
  confirmed: boolean;
};

export function useRoomSessions(roomId?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["roomSessions", roomId],
    queryFn: async () => {
      if (!roomId) return { sessions: [] as RoomSession[], attendees: [] as RoomSessionAttendee[] };
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: sessions, error } = await supabase
        .from("room_sessions")
        .select("id,room_id,created_by,title,description,start_at,end_at,is_cancelled,created_at,updated_at")
        .eq("room_id", roomId)
        .gte("end_at", from)
        .order("start_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      const ids = (sessions || []).map((session) => session.id);
      if (ids.length === 0) return { sessions: [] as RoomSession[], attendees: [] as RoomSessionAttendee[] };
      const { data: attendees, error: attendeeError } = await supabase
        .from("room_session_attendees")
        .select("id,session_id,user_id,confirmed")
        .in("session_id", ids)
        .eq("confirmed", true)
        .limit(1000);
      if (attendeeError) throw attendeeError;
      return { sessions: sessions as RoomSession[], attendees: (attendees || []) as RoomSessionAttendee[] };
    },
    enabled: !!roomId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!roomId) return;
    const suffix = Math.random().toString(36).slice(2);
    const sessionsChannel = supabase
      .channel(`room-sessions-${roomId}-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_sessions", filter: `room_id=eq.${roomId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["roomSessions", roomId] });
      })
      .subscribe();
    const attendeesChannel = supabase
      .channel(`room-session-attendees-${roomId}-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_session_attendees" }, () => {
        queryClient.invalidateQueries({ queryKey: ["roomSessions", roomId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(attendeesChannel);
    };
  }, [queryClient, roomId]);

  return query;
}

export function useCreateRoomSession() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roomId: string; title: string; description?: string; startAt: string; endAt: string }) => {
      if (!user) throw new Error("not_authenticated");
      const { error } = await supabase.from("room_sessions").insert({
        room_id: input.roomId,
        created_by: user.id,
        title: input.title,
        description: input.description?.trim() || null,
        start_at: input.startAt,
        end_at: input.endAt,
      });
      if (error) throw error;
    },
    onSuccess: (_, input) => queryClient.invalidateQueries({ queryKey: ["roomSessions", input.roomId] }),
  });
}

export function useCancelRoomSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, roomId }: { id: string; roomId: string }) => {
      const { error } = await supabase.from("room_sessions").update({ is_cancelled: true }).eq("id", id).eq("room_id", roomId);
      if (error) throw error;
    },
    onSuccess: (_, input) => queryClient.invalidateQueries({ queryKey: ["roomSessions", input.roomId] }),
  });
}

export function useSetRoomSessionAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, roomId, confirmed }: { sessionId: string; roomId: string; confirmed: boolean }) => {
      const { error } = await supabase.rpc("set_room_session_attendance", { _session_id: sessionId, _confirmed: confirmed });
      if (error) throw error;
    },
    onSuccess: (_, input) => queryClient.invalidateQueries({ queryKey: ["roomSessions", input.roomId] }),
  });
}