import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useIsSupportAgent() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["is-support-agent", user?.id],
    queryFn: async () => {
      if (!user) return { isAgent: false, isAdmin: false };
      const { data, error } = await supabase
        .from("support_agents" as any)
        .select("role, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (error || !data) return { isAgent: false, isAdmin: false };
      return { isAgent: true, isAdmin: (data as any).role === "admin" };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return { isAgent: data?.isAgent ?? false, isAdmin: data?.isAdmin ?? false, isLoading };
}

export function useSupportAgents() {
  return useQuery({
    queryKey: ["support-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_agents" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useInviteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password, role }: { email: string; password: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("sac-admin", {
        body: { action: "invite_agent", email, password, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-agents"] });
    },
  });
}

export function useToggleAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agent_user_id, activate }: { agent_user_id: string; activate: boolean }) => {
      const { data, error } = await supabase.functions.invoke("sac-admin", {
        body: { action: activate ? "activate_agent" : "deactivate_agent", agent_user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-agents"] });
    },
  });
}

export function useTicketUserInfo(userId: string | null) {
  return useQuery({
    queryKey: ["ticket-user-info", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.functions.invoke("sac-admin", {
        body: { action: "get_ticket_user_info", ticket_user_id: userId },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
