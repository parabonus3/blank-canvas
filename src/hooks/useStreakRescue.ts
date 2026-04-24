import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { playSuccess } from "@/lib/soundEffects";

/**
 * Checks once per session if the user is eligible for a retroactive
 * "streak rescue" (defensive granted as a reward for long streaks).
 * Shows a celebratory toast if granted.
 */
export function useStreakRescue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!user || checkedRef.current) return;
    checkedRef.current = true;

    const run = async () => {
      try {
        const { data, error } = await (supabase as any).rpc("check_and_grant_streak_rescue");
        if (error) {
          console.error("Streak rescue check error:", error);
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.granted) {
          // Refetch streak-related queries
          queryClient.invalidateQueries({ queryKey: ["personalStreak"] });
          queryClient.invalidateQueries({ queryKey: ["streakFreeze"] });

          playSuccess();
          toast({
            title: `🛡️ ${t("streak.rescue_title")}`,
            description: t("streak.rescue_desc", {
              days: row.days_rescued,
              streak: row.last_streak,
            }),
            duration: 8000,
          });
        }
      } catch (e) {
        console.error("Streak rescue exception:", e);
      }
    };

    // Slight delay to avoid racing with auth/profile loading
    const timer = setTimeout(run, 1500);
    return () => clearTimeout(timer);
  }, [user, queryClient, toast, t]);
}
