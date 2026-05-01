import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { playSuccess } from "@/lib/soundEffects";

export type FreezeMissionType = "weekly_bronze" | "weekly_gold" | "monthly_legendary";

export interface FreezeMissionProgress {
  mission_type: FreezeMissionType;
  period_key: string;
  progress_current: number;
  progress_target: number;
  completed: boolean;
  freezes_reward: number;
}

/**
 * Reads current progress on the 3 freeze missions and triggers
 * an automatic check-and-grant once per session.
 */
export function useFreezeMissions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const checkedRef = useRef(false);

  const { data: missions = [], isLoading } = useQuery({
    queryKey: ["freezeMissions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any).rpc("get_freeze_missions_progress");
      if (error) throw error;
      return (data ?? []) as FreezeMissionProgress[];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // Auto-check & grant once per session
  useEffect(() => {
    if (!user || checkedRef.current) return;
    checkedRef.current = true;

    const run = async () => {
      try {
        const { data, error } = await (supabase as any).rpc("check_and_grant_freeze_missions");
        if (error) {
          console.error("Freeze missions check error:", error);
          return;
        }
        const granted = (data ?? []) as { mission_type: FreezeMissionType; freezes_granted: number }[];
        if (granted.length > 0) {
          queryClient.invalidateQueries({ queryKey: ["freezeMissions"] });
          queryClient.invalidateQueries({ queryKey: ["purchasedFreezes"] });
          for (const g of granted) {
            playSuccess();
            toast({
              title: `🛡️ ${t(`freeze_missions.${g.mission_type}_completed_title`)}`,
              description: t("freeze_missions.completed_desc", { count: g.freezes_granted }),
              duration: 7000,
            });
          }
        }
      } catch (e) {
        console.error("Freeze missions exception:", e);
      }
    };

    const timer = setTimeout(run, 1200);
    return () => clearTimeout(timer);
  }, [user, queryClient, toast, t]);

  return { missions, isLoading };
}
