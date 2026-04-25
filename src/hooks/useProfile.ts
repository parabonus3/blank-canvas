import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  friend_code: string | null;
  avatar_url: string | null;
  is_stats_public: boolean;
  theme: "light" | "dark";
  reminder_interval: number;
  reminder_sound: boolean;
  reminder_notification: boolean;
  ambient_sound: string | null;
  ambient_volume: number;
  autoplay_on_timer: boolean;
  // Pomodoro settings
  pomodoro_work_duration: number;
  pomodoro_short_break: number;
  pomodoro_long_break: number;
  pomodoro_cycles_before_long: number;
  pomodoro_auto_start_breaks: boolean;
  pomodoro_auto_start_work: boolean;
  timezone: string;
  onboarding_completed: boolean;
  avatar_flair: string;
  avatar_flair_color: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (updates: Partial<Omit<Profile, "id" | "user_id" | "created_at" | "updated_at">>) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Configurações salvas!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao salvar configurações", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}
