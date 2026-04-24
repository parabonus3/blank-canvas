import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRef } from "react";

export interface TimeEntry {
  id: string;
  project_id: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  notes: string | null;
  is_pomodoro: boolean;
  pomodoro_type: string | null;
  paused_at: string | null;
  paused_seconds: number;
  created_at: string;
  updated_at: string;
  project?: {
    id: string;
    name: string;
    category?: {
      id: string;
      name: string;
      color: string;
    } | null;
  };
}

export function useTimeEntries(filters?: {
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["timeEntries", user?.id, filters],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from("time_entries")
        .select(`
          *,
          project:projects(
            id,
            name,
            category:categories(id, name, color)
          )
        `)
        .eq("user_id", user.id)
        .order("start_time", { ascending: false });
      
      if (filters?.projectId) {
        query = query.eq("project_id", filters.projectId);
      }
      
      if (filters?.startDate) {
        query = query.gte("start_time", filters.startDate.toISOString());
      }
      
      if (filters?.endDate) {
        query = query.lte("start_time", filters.endDate.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as TimeEntry[];
    },
    enabled: !!user,
  });
}

export function useActiveTimeEntry() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["activeTimeEntry", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          *,
          project:projects(
            id,
            name,
            category:categories(id, name, color)
          )
        `)
        .eq("user_id", user.id)
        .is("end_time", null)
        // CRÍTICO: Filtrar apenas entradas NÃO-pomodoro para evitar contabilização dupla
        .or('is_pomodoro.is.null,is_pomodoro.eq.false')
        .maybeSingle();
      
      if (error) throw error;
      return data as TimeEntry | null;
    },
    enabled: !!user,
    refetchInterval: 1000, // Refetch every second for live timer
  });
}

export function useStartTimer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ projectId, roomId }: { projectId: string; roomId?: string }) => {
      if (!user) throw new Error("User not authenticated");
      
      // Check if there's already an active timer
      const { data: active } = await supabase
        .from("time_entries")
        .select("id")
        .eq("user_id", user.id)
        .is("end_time", null)
        .maybeSingle();
      
      if (active) {
        throw new Error("Já existe um cronômetro ativo. Pare-o primeiro.");
      }
      
      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          user_id: user.id,
          project_id: projectId,
          start_time: new Date().toISOString(),
        })
        .select(`
          *,
          project:projects(
            id,
            name,
            category:categories(id, name, color)
          )
        `)
        .single();
      
      if (error) throw error;

      // Set is_timer_active only in selected room (or all if none specified)
      if (user) {
        try {
          let query = supabase
            .from("room_members")
            .update({ is_timer_active: true, last_active_at: new Date().toISOString(), timer_started_at: new Date().toISOString() } as any)
            .eq("user_id", user.id);
          
          if (roomId) {
            query = query.eq("room_id", roomId);
          }
          
          await query;
        } catch (e) {
          console.error("Room timer active sync error:", e);
        }
      }

      return { ...data, _roomId: roomId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["activeTimeEntry"] });
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      toast({ 
        title: "Cronômetro iniciado!",
        description: `Projeto: ${data.project?.name}`,
      });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao iniciar cronômetro", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

export function useStopTimer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ entryId, pausedSeconds = 0, roomId }: { entryId: string; pausedSeconds?: number; roomId?: string }) => {
      const endTime = new Date();
      
      // Get the entry to calculate duration
      const { data: entryRaw } = await supabase
        .from("time_entries")
        .select("start_time, paused_at, paused_seconds")
        .eq("id", entryId)
        .single();
      const entry = entryRaw as any;
      
      if (!entry) throw new Error("Entrada não encontrada");
      
      const startTime = new Date(entry.start_time);
      // Fallback: if localStorage was cleared, use server-side paused tracking
      const serverPaused = (entry as any).paused_seconds || 0;
      const serverPausedAt = (entry as any).paused_at ? new Date((entry as any).paused_at).getTime() : null;
      const liveServerPause = serverPausedAt ? Math.max(0, Math.floor((endTime.getTime() - serverPausedAt) / 1000)) : 0;
      const effectivePaused = Math.max(pausedSeconds, serverPaused + liveServerPause);
      const durationSeconds = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000) - effectivePaused);
      
      const { data, error } = await supabase
        .from("time_entries")
        .update({
          end_time: endTime.toISOString(),
          duration: durationSeconds,
        })
        .eq("id", entryId)
        .select(`
          *,
          project:projects(
            id,
            name,
            category:categories(id, name, color)
          )
        `)
        .single();
      
      if (error) throw error;

      // Sync time to selected room only (or all if no room specified for backward compat)
      if (user) {
        try {
          if (roomId) {
            // Only update the selected room
            const { data: membership } = await supabase
              .from("room_members")
              .select("room_id, total_seconds")
              .eq("user_id", user.id)
              .eq("room_id", roomId)
              .maybeSingle();
            
            if (membership) {
              await supabase
                .from("room_members")
                .update({
                  total_seconds: (membership.total_seconds || 0) + (durationSeconds > 0 ? durationSeconds : 0),
                  is_timer_active: false,
                  timer_started_at: null,
                } as any)
                .eq("room_id", membership.room_id)
                .eq("user_id", user.id);

              if (durationSeconds >= 60) {
                await supabase.from("room_activity_log").insert({
                  room_id: membership.room_id,
                  user_id: user.id,
                  action_type: "session_completed",
                  metadata: { duration_seconds: durationSeconds },
                });
              }
            }
            // Also clear timer_active in other rooms without adding time
            await supabase
              .from("room_members")
              .update({ is_timer_active: false, timer_started_at: null } as any)
              .eq("user_id", user.id)
              .neq("room_id", roomId);
          } else {
            // No room selected — just clear timer active in all rooms, don't add time
            await supabase
              .from("room_members")
              .update({ is_timer_active: false, timer_started_at: null } as any)
              .eq("user_id", user.id);
          }
          queryClient.invalidateQueries({ queryKey: ["roomMembers"] });
        } catch (e) {
          console.error("Room sync error:", e);
        }
      }

      // Refresh last_known_streak snapshot for streak rescue system
      try {
        await (supabase as any).rpc("refresh_last_known_streak");
      } catch (e) {
        console.error("refresh_last_known_streak error:", e);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["activeTimeEntry"] });
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["personalStreak"] });
      queryClient.invalidateQueries({ queryKey: ["streakFreeze"] });
      
      const duration = data.duration || 0;
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const seconds = duration % 60;
      
      toast({ 
        title: "Cronômetro parado!",
        description: `Duração: ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao parar cronômetro", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      start_time, 
      end_time, 
      notes 
    }: { 
      id: string;
      start_time?: string;
      end_time?: string;
      notes?: string;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (start_time) updateData.start_time = start_time;
      if (end_time) updateData.end_time = end_time;
      if (notes !== undefined) updateData.notes = notes;
      
      // Recalculate duration if times changed
      if (start_time || end_time) {
        const { data: entry } = await supabase
          .from("time_entries")
          .select("start_time, end_time")
          .eq("id", id)
          .single();
        
        if (entry) {
          const startDate = new Date(start_time || entry.start_time);
          const endDate = new Date(end_time || entry.end_time);
          updateData.duration = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
        }
      }
      
      const { data, error } = await supabase
        .from("time_entries")
        .update(updateData as never)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      toast({ title: "Sessão atualizada!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao atualizar sessão", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["activeTimeEntry"] });
      toast({ title: "Sessão excluída!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao excluir sessão", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}
