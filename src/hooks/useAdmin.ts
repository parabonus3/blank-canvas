import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  friend_code: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  trial_ends_at: string | null;
  plan_tier: string;
  roles: string[];
  is_admin: boolean;
  is_support_agent: boolean;
  support_agent_role: string | null;
  is_banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  subscription: {
    status: string;
    product_id: string;
    price_id: string;
    current_period_end: string;
    subscription_id: string;
  } | null;
  status: "free" | "trial" | "active" | "expired" | "banned";
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
  stats: {
    total_users: number;
    active: number;
    trial: number;
    expired: number;
    banned: number;
    new_today: number;
  };
}

export interface AdminListParams {
  page?: number;
  perPage?: number;
  search?: string;
  filters?: {
    status?: string;
    role?: string;
    plan?: string;
    signup_period?: string;
    trial_expiring?: string;
    activity?: string;
  };
  sort?: string;
}

async function callAdmin(action: string, payload?: any) {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useAdminUsers(params: AdminListParams = {}) {
  return useQuery<AdminUsersResponse>({
    queryKey: ["admin-users", params],
    queryFn: () => callAdmin("list_users", params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminUserDetails(userId: string | null) {
  return useQuery({
    queryKey: ["admin-user-details", userId],
    queryFn: () => callAdmin("get_user_details", { user_id: userId }),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

function useInvalidatingMutation<T = any>(action: string, successMessage?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation<any, Error, T>({
    mutationFn: (payload: T) => callAdmin(action, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-user-details"] });
      if (successMessage) toast({ title: successMessage });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useAdminResetPassword() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (user_id: string) => callAdmin("reset_password", { user_id }),
    onSuccess: () => toast({ title: "E-mail de reset enviado!" }),
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useAdminUpdateProfile() {
  return useInvalidatingMutation<{ user_id: string; display_name?: string; trial_ends_at?: string }>(
    "update_profile",
    "Perfil atualizado!"
  );
}

export function useAdminAssignPlan() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: { user_id: string; price_id: string | null }) =>
      callAdmin("assign_plan", payload),
    onSuccess: () => {
      toast({ title: "Plano atribuído com sucesso!" });
      setTimeout(() => qc.invalidateQueries({ queryKey: ["admin-users"] }), 2000);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useAdminCancelSubscription() {
  return useInvalidatingMutation<string>("cancel_subscription", "Assinatura cancelada!");
}

// wrapper because cancel takes string id, not payload
export function useAdminCancelSub() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (subscription_id: string) => callAdmin("cancel_subscription", { subscription_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Assinatura cancelada!" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useAdminDeleteUser() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (user_id: string) => callAdmin("delete_user", { user_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Usuário deletado!" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useAdminBanUser() {
  return useInvalidatingMutation<{ user_id: string; reason?: string }>("ban_user", "Usuário banido");
}
export function useAdminUnbanUser() {
  return useInvalidatingMutation<{ user_id: string }>("unban_user", "Usuário reativado");
}
export function useAdminGrantRole() {
  return useInvalidatingMutation<{ user_id: string; role: string }>("grant_role", "Papel concedido");
}
export function useAdminRevokeRole() {
  return useInvalidatingMutation<{ user_id: string; role: string }>("revoke_role", "Papel removido");
}
export function useAdminGrantSupportAgent() {
  return useInvalidatingMutation<{ user_id: string; role?: string }>("grant_support_agent", "Acesso ao suporte concedido");
}
export function useAdminRevokeSupportAgent() {
  return useInvalidatingMutation<{ user_id: string }>("revoke_support_agent", "Acesso ao suporte removido");
}
export function useAdminGrantStreakFreezes() {
  return useInvalidatingMutation<{ user_id: string; amount: number; reason?: string }>(
    "grant_streak_freezes",
    "Defensivas concedidas!"
  );
}
