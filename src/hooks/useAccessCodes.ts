import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface AccessCode {
  id: string;
  code: string;
  plan_tier: "pro" | "premium";
  duration_days: number;
  code_type: "shared" | "single";
  max_redemptions: number | null;
  redemption_count: number;
  expires_at: string | null;
  partner_name: string | null;
  campaign: string | null;
  notes: string | null;
  batch_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AccessCodeRedemption {
  id: string;
  access_code_id: string;
  user_id: string;
  plan_tier: string;
  granted_days: number;
  access_starts_at: string;
  access_ends_at: string;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export interface AccessCodesResponse {
  codes: AccessCode[];
  partners: string[];
  stats: {
    active_codes: number;
    total_redemptions: number;
    week_redemptions: number;
    total_codes: number;
  };
}

export interface AccessCodeFilters {
  search?: string;
  status?: string;
  plan?: string;
  partner?: string;
}

async function callAccessCodes(action: string, payload?: unknown) {
  const { data, error } = await supabase.functions.invoke("access-codes", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useAccessCodes(filters: AccessCodeFilters = {}) {
  return useQuery<AccessCodesResponse>({
    queryKey: ["access-codes", filters],
    queryFn: () => callAccessCodes("list_codes", filters),
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });
}

export function useAccessCodeRedemptions(codeId: string | null) {
  return useQuery<{ redemptions: AccessCodeRedemption[] }>({
    queryKey: ["access-code-redemptions", codeId],
    queryFn: () => callAccessCodes("list_redemptions", { code_id: codeId }),
    enabled: !!codeId,
  });
}

export interface CreateCodeInput {
  code?: string;
  prefix?: string;
  plan_tier: "pro" | "premium";
  duration_days: number;
  code_type: "shared" | "single";
  max_redemptions?: number | null;
  expires_at?: string | null;
  partner_name?: string | null;
  campaign?: string | null;
  notes?: string | null;
}

function useCodesMutation<TInput>(action: string, successKey: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  return useMutation<any, Error, TInput>({
    mutationFn: (payload: TInput) => callAccessCodes(action, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["access-codes"] });
      qc.invalidateQueries({ queryKey: ["access-code-redemptions"] });
      toast({ title: t(successKey) });
    },
    onError: (e) =>
      toast({
        title: t("access_codes.admin_error"),
        description: e.message === "duplicate_code" ? t("access_codes.admin_duplicate") : e.message,
        variant: "destructive",
      }),
  });
}

export function useCreateAccessCode() {
  return useCodesMutation<CreateCodeInput>("create_code", "access_codes.admin_created");
}

export function useCreateAccessCodeBatch() {
  return useCodesMutation<CreateCodeInput & { quantity: number }>("create_batch", "access_codes.admin_batch_created");
}

export function useUpdateAccessCode() {
  return useCodesMutation<{
    code_id: string;
    is_active?: boolean;
    expires_at?: string | null;
    max_redemptions?: number | null;
    partner_name?: string | null;
    campaign?: string | null;
    notes?: string | null;
  }>("update_code", "access_codes.admin_updated");
}

export function accessCodeStatus(code: AccessCode): "active" | "inactive" | "expired" | "exhausted" {
  if (code.expires_at && new Date(code.expires_at) <= new Date()) return "expired";
  if (code.max_redemptions != null && code.redemption_count >= code.max_redemptions) return "exhausted";
  if (!code.is_active) return "inactive";
  return "active";
}
