import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { STREAK_FREEZE_LIMITS } from "@/lib/stripePlans";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { playSuccess } from "@/lib/soundEffects";

function getCurrentMonthYear() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export function useStreakFreeze() {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const autoUsedRef = useRef(false);

  const monthYear = getCurrentMonthYear();
  const granted = STREAK_FREEZE_LIMITS[tier] || 0;

  // Monthly freeze record
  const { data: freezeData, isLoading } = useQuery({
    queryKey: ["streakFreeze", user?.id, monthYear],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("streak_freezes")
        .select("*")
        .eq("user_id", user.id)
        .eq("month_year", monthYear)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if (data.total_granted !== granted && granted > 0) {
          await supabase
            .from("streak_freezes")
            .update({ total_granted: granted })
            .eq("id", data.id);
          return { ...data, total_granted: granted };
        }
        return data;
      }

      if (granted === 0) return null;

      const { data: newRow, error: insertErr } = await supabase
        .from("streak_freezes")
        .insert({
          user_id: user.id,
          month_year: monthYear,
          total_granted: granted,
          used: 0,
          auto_used_dates: [],
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      return newRow;
    },
    enabled: !!user,
    staleTime: 60000,
  });

  // Purchased balance (permanent, never expires)
  const { data: purchasedRow } = useQuery({
    queryKey: ["purchasedFreezes", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("purchased_streak_freezes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const remaining = freezeData ? freezeData.total_granted - freezeData.used : granted;
  const used = freezeData?.used ?? 0;
  const autoUsedDates: string[] = (freezeData?.auto_used_dates as string[]) ?? [];
  const purchasedBalance = purchasedRow?.balance ?? 0;
  const totalAvailable = remaining + purchasedBalance;
  const hasFreezes = granted > 0 || purchasedBalance > 0;

  // Auto-use freeze if user didn't study yesterday — uses RPC (monthly first, then purchased)
  useEffect(() => {
    if (!user || autoUsedRef.current) return;
    if (totalAvailable <= 0) return;

    const yesterday = getYesterday();
    if (autoUsedDates.includes(yesterday)) return;

    const checkAndAutoUse = async () => {
      const yesterdayStart = new Date(yesterday + "T00:00:00");
      const yesterdayEnd = new Date(yesterday + "T23:59:59");

      const { count } = await supabase
        .from("time_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("end_time", "is", null)
        .gte("start_time", yesterdayStart.toISOString())
        .lte("start_time", yesterdayEnd.toISOString());

      if ((count ?? 0) === 0) {
        autoUsedRef.current = true;
        const { data, error } = await supabase.rpc("consume_streak_freeze", {
          _date: yesterday,
        });
        if (!error && data && data[0]?.source && data[0].source !== "none" && data[0].source !== "already_used") {
          queryClient.invalidateQueries({ queryKey: ["streakFreeze"] });
          queryClient.invalidateQueries({ queryKey: ["purchasedFreezes"] });
          queryClient.invalidateQueries({ queryKey: ["personalStreak"] });
          playSuccess();
          toast({
            title: `🛡️ ${t("streak.freeze_used_title")}`,
            description: t("streak.freeze_used_desc"),
          });
        }
      }
    };

    checkAndAutoUse();
  }, [user, freezeData, purchasedRow, totalAvailable, autoUsedDates]);

  return {
    remaining,
    used,
    total: granted,
    autoUsedDates,
    isLoading,
    hasFreezes,
    purchasedBalance,
    totalAvailable,
  };
}
