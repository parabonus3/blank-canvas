import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";

export interface RedeemResult {
  success: boolean;
  error?: string;
  plan_tier?: "pro" | "premium";
  granted_days?: number;
  access_ends_at?: string;
  partner_name?: string | null;
}

export interface PlanGrant {
  id: string;
  user_id: string;
  plan_tier: string;
  source: string;
  starts_at: string;
  expires_at: string;
  revoked_at: string | null;
}

/** Concessões de plano ativas da própria conta (acesso por código). */
export function useMyPlanGrants() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["planGrants", user?.id],
    queryFn: async () => {
      if (!user) return [] as PlanGrant[];
      const { data, error } = await (supabase as any)
        .from("plan_grants")
        .select("*")
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PlanGrant[];
    },
    enabled: !!user,
  });
}

export function useRedeemCode() {
  const queryClient = useQueryClient();
  const { refreshSubscription } = useSubscription();

  return useMutation<RedeemResult, Error, string>({
    mutationFn: async (code: string) => {
      const { data, error } = await (supabase as any).rpc("redeem_access_code", { _code: code });
      if (error) throw error;
      return (data || { success: false, error: "invalid_code" }) as RedeemResult;
    },
    onSuccess: async (result) => {
      if (!result.success) return;
      queryClient.invalidateQueries({ queryKey: ["planGrants"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      await refreshSubscription();
    },
  });
}
