import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface StudyRoom {
  id: string;
  name: string;
  description: string | null;
  room_type: string;
  invite_code: string;
  owner_id: string;
  max_members: number;
  is_active: boolean;
  created_at: string;
  member_count?: number;
  goal_hours?: number | null;
  goal_label?: string | null;
  pinned_message?: string | null;
  focus_session_end_at?: string | null;
  focus_session_duration?: number | null;
  focus_session_started_by?: string | null;
  is_public?: boolean;
  slug?: string | null;
  password_hash?: string | null;
  rules?: string | null;
  chat_mode?: string;
  country?: string | null;
}

export function useRooms() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["rooms", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // First get room IDs where user is a member
      const { data: memberRows, error: memberError } = await supabase
        .from("room_members")
        .select("room_id")
        .eq("user_id", user.id);
      if (memberError) throw memberError;
      const myRoomIds = (memberRows || []).map((r) => r.room_id);
      if (myRoomIds.length === 0) return [];

      const { data, error } = await supabase
        .from("study_rooms")
        .select("*, room_members(count)")
        .in("id", myRoomIds)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        member_count: r.room_members?.[0]?.count || 0,
      })) as StudyRoom[];
    },
    enabled: !!user,
  });
}

export function useCreateRoom() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string; room_type: string; is_public?: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: room, error } = await supabase
        .from("study_rooms")
        .insert({
          name: input.name,
          description: input.description || null,
          room_type: input.room_type,
          owner_id: user.id,
          is_public: input.is_public || false,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: memberError } = await supabase
        .from("room_members")
        .insert({
          room_id: room.id,
          user_id: user.id,
          role: "owner",
        });
      if (memberError) throw memberError;

      await supabase.from("room_activity_log").insert({
        room_id: room.id,
        user_id: user.id,
        action_type: "room_created",
      });

      return room;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: "Sala criada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar sala", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase.from("study_rooms").delete().eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: "Sala excluída!" });
    },
  });
}

export function useJoinPublicRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, password }: { roomId: string; password?: string }) => {
      const { data, error } = await supabase.rpc("join_public_room", {
        _room_id: roomId,
        _password: password || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["roomMembers"] });
    },
  });
}
