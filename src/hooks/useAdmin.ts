import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  trial_ends_at: string | null;
  roles: string[];
  subscription: {
    status: string;
    product_id: string;
    price_id: string;
    current_period_end: string;
    subscription_id: string;
  } | null;
  status: "free" | "trial" | "active" | "expired";
}

async function callAdmin(action: string, payload?: any) {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useAdminUsers() {
  return useQuery<{ users: AdminUser[]; total: number }>({
    queryKey: ["admin-users"],
    queryFn: () => callAdmin("list_users"),
    staleTime: 30_000,
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
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: { user_id: string; display_name?: string; trial_ends_at?: string }) =>
      callAdmin("update_profile", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Perfil atualizado!" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useAdminAssignPlan() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: { user_id: string; price_id: string | null }) =>
      callAdmin("assign_plan", payload),
    onSuccess: () => {
      toast({ title: "Plano atribuído com sucesso!" });
      // Delay para dar tempo ao Stripe de propagar a assinatura
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["admin-users"] });
      }, 2000);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useAdminCancelSubscription() {
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
