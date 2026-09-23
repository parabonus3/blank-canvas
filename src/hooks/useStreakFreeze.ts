import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { STREAK_FREEZE_LIMITS } from "@/lib/stripePlans";
import { useEffect, useRef } from "react";
import { useTimezone } from "@/hooks/useTimezone";

function localDateString(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(isoDate: string, delta: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return date.toISOString().slice(0, 10);
}

export function useStreakFreeze() {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const queryClient = useQueryClient();
  const autoUsedRef = useRef(false);
  const { timezone } = useTimezone();

  const today = localDateString(new Date(), timezone);
  const monthYear = today.slice(0, 7);

  // Limite mensal calculado no servidor: plano + bônus por recorde de sequência
  const { data: allowance } = useQuery({
    queryKey: ["freezeAllowance", user?.id, monthYear],
    queryFn: async () => {
      if (!user) return 0;
      const { data, error } = await (supabase as any).rpc("get_monthly_freeze_allowance", {
        _user_id: user.id,
      });
      if (error) throw error;
      return (data ?? 0) as number;
    },
    enabled: !!user,
    staleTime: 300000,
  });

  const granted = allowance ?? (STREAK_FREEZE_LIMITS[tier] || 0);

  // Monthly freeze record
  const { data: freezeData, isLoading } = useQuery({
    queryKey: ["streakFreeze", user?.id, monthYear, granted],
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
        // Nunca reduzir: resgates e bônus podem ter aumentado o total concedido.
        if (granted > data.total_granted) {
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

  const remaining = Math.max(0, freezeData ? freezeData.total_granted - freezeData.used : granted);
  const used = freezeData?.used ?? 0;
  const autoUsedDates: string[] = (freezeData?.auto_used_dates as string[]) ?? [];
  const purchasedBalance = purchasedRow?.balance ?? 0;
  const totalAvailable = remaining + purchasedBalance;
  const hasFreezes = granted > 0 || purchasedBalance > 0;

  // Auto-use freeze if user didn't study yesterday — uses RPC (monthly first, then purchased)
  useEffect(() => {
    if (!user || autoUsedRef.current) return;
    if (totalAvailable <= 0) return;

    const yesterday = addDays(today, -1);
    if (autoUsedDates.includes(yesterday)) return;

    // Guard global por dia via localStorage para evitar disparos paralelos
    // de múltiplas montagens do hook (sidebar + modal, StrictMode, etc).
    const guardKey = `timezoni-freeze-checked-${user.id}-${yesterday}`;
    if (typeof window !== "undefined" && localStorage.getItem(guardKey)) return;

    const checkAndAutoUse = async () => {
      if (typeof window !== "undefined") localStorage.setItem(guardKey, "1");
      autoUsedRef.current = true;
      const { data, error } = await (supabase as any).rpc("auto_consume_pending_freezes", {
        _user_id: user.id,
      });
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["streakFreeze"] });
        queryClient.invalidateQueries({ queryKey: ["purchasedFreezes"] });
        queryClient.invalidateQueries({ queryKey: ["personalStreak"] });
        queryClient.invalidateQueries({ queryKey: ["streakShield"] });
        queryClient.invalidateQueries({ queryKey: ["streakStudiedDates"] });
      }
    };

    checkAndAutoUse();
  }, [user, freezeData, purchasedRow, totalAvailable, autoUsedDates, today, queryClient]);

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
