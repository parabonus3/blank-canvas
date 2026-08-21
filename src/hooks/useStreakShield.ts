import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { playSuccess } from "@/lib/soundEffects";

export interface StreakShieldStatus {
  current_streak: number;
  best_streak: number;
  monthly_allowance: number;
  monthly_used: number;
  monthly_remaining: number;
  purchased_balance: number;
  rescue_available: boolean;
  rescue_days_cover: number;
  rescue_days_absent: number;
  rescue_next_available_in: number;
  last_rescue_at: string | null;
}

/** Bônus mensal de defensivas por recorde de sequência (espelha o servidor). */
export function shieldBonusFor(bestStreak: number): number {
  if (bestStreak >= 100) return 3;
  if (bestStreak >= 60) return 2;
  if (bestStreak >= 30) return 1;
  return 0;
}

/** Próximo marco de recorde que libera mais uma defensiva por mês. */
export function nextShieldMilestone(bestStreak: number): number | null {
  if (bestStreak < 30) return 30;
  if (bestStreak < 60) return 60;
  if (bestStreak < 100) return 100;
  return null;
}

export function useStreakShield() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["streakShield", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_streak_shield_status");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as StreakShieldStatus | null;
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const rescue = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc("check_and_grant_streak_rescue");
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as {
        granted: boolean;
        days_rescued: number;
        new_streak: number;
        last_streak: number;
      };
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["streakShield"] });
      qc.invalidateQueries({ queryKey: ["personalStreak"] });
      qc.invalidateQueries({ queryKey: ["streakFreeze"] });
      qc.invalidateQueries({ queryKey: ["streakStudiedDates"] });
      if (row?.granted) {
        playSuccess();
        toast({
          title: `🛡️ ${t("streak.rescue_title")}`,
          description: t("streak.rescue_desc", {
            days: row.days_rescued,
            streak: row.new_streak,
          }),
          duration: 8000,
        });
      } else {
        toast({
          title: t("streak.rescue_unavailable_title"),
          description: t("streak.rescue_unavailable_desc"),
        });
      }
    },
    onError: (e: any) =>
      toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  return { status: query.data ?? null, isLoading: query.isLoading, rescue };
}
