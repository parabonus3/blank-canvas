import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/components/ui/sidebar";
import { useStreakFreeze } from "@/hooks/useStreakFreeze";
import { useActiveTimeEntry } from "@/hooks/useTimeEntries";
import { Flame, AlertTriangle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { StreakDetailModal } from "@/components/StreakDetailModal";

function useStreakColors(studiedToday: boolean, isTimerRunning: boolean) {
  if (studiedToday) {
    return {
      icon: "text-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
      bgCollapsed: "bg-emerald-500/10",
      bgExpanded: "bg-emerald-500/5 border-emerald-500/20",
      bgExpandedRisk: "bg-emerald-500/10 border-emerald-500/30",
      hover: "hover:border-emerald-500/40",
    };
  }
  if (isTimerRunning) {
    return {
      icon: "text-cyan-500 animate-pulse",
      text: "text-cyan-600 dark:text-cyan-400",
      bgCollapsed: "bg-cyan-500/10",
      bgExpanded: "bg-cyan-500/5 border-cyan-500/20",
      bgExpandedRisk: "bg-cyan-500/10 border-cyan-500/30",
      hover: "hover:border-cyan-500/40",
    };
  }
  return {
    icon: "text-orange-500",
    text: "text-orange-600 dark:text-orange-400",
    bgCollapsed: "bg-orange-500/10",
    bgExpanded: "bg-orange-500/5 border-orange-500/20",
    bgExpandedRisk: "bg-orange-500/10 border-orange-500/30",
    hover: "hover:border-orange-500/40",
  };
}

export function SidebarStreakWidget() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { remaining, hasFreezes, autoUsedDates, purchasedBalance, total } = useStreakFreeze();
  const [showModal, setShowModal] = useState(false);
  const { data: activeEntry } = useActiveTimeEntry();
  const isTimerRunning = !!activeEntry;

  const { data } = useQuery({
    queryKey: ["personalStreak", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: streak, error } = await supabase.rpc("get_member_room_streak", {
        _user_id: user.id,
      });
      if (error) throw error;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("time_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("end_time", "is", null)
        .gte("start_time", todayStart.toISOString());

      return { streak: (streak || 0) as number, studiedToday: (count || 0) > 0 };
    },
    enabled: !!user,
    staleTime: 60000,
    refetchInterval: 120000,
  });

  if (!data || data.streak === 0) return null;

  const studiedToday = data.studiedToday;
  const atRisk = data.streak >= 2 && !studiedToday && !isTimerRunning;
  const colors = useStreakColors(studiedToday, isTimerRunning);

  if (isCollapsed) {
    return (
      <>
      <button onClick={() => setShowModal(true)} className={cn(
        "mx-auto mb-2 flex flex-col items-center justify-center w-10 gap-0.5 rounded-lg transition-colors py-1.5 cursor-pointer",
        atRisk ? cn(colors.bgCollapsed, "animate-pulse") : colors.bgCollapsed
      )}>
        <div className="flex items-center gap-0.5">
          <Flame className={cn("h-4 w-4", colors.icon)} />
          <span className={cn("text-xs font-bold", colors.text)}>{data.streak}</span>
        </div>
        {hasFreezes && remaining > 0 && (
          <div className="flex items-center gap-0.5">
            <Shield className="h-3 w-3 text-blue-500" />
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{remaining}</span>
          </div>
        )}
      </button>
      <StreakDetailModal open={showModal} onClose={() => setShowModal(false)} streak={data.streak} autoUsedDates={autoUsedDates} remaining={remaining} hasFreezes={hasFreezes} purchasedBalance={purchasedBalance} total={total} />
      </>
    );
  }

  return (
    <>
    <button onClick={() => setShowModal(true)} className={cn(
      "mx-2 mb-3 p-3 rounded-xl border transition-colors animate-fade-in cursor-pointer w-[calc(100%-1rem)] text-left",
      colors.hover,
      atRisk ? colors.bgExpandedRisk : colors.bgExpanded,
      atRisk && "animate-pulse"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className={cn("h-4 w-4", colors.icon)} />
          <span className={cn("text-sm font-bold", colors.text)}>
            {data.streak} {t("rooms.streak_days")}
          </span>
        </div>
        {hasFreezes && (
          <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
            <Shield className="h-3.5 w-3.5" />
            {remaining}
          </div>
        )}
      </div>
      {atRisk && (
        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-orange-600 dark:text-orange-400 font-medium">
          <AlertTriangle className="h-3 w-3" />
          {t("rooms.streak_warning")}
        </div>
      )}
      {hasFreezes && remaining > 0 && (
        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-blue-600 dark:text-blue-400">
          <Shield className="h-3 w-3" />
          {t("streak.freezes_remaining", { count: remaining })}
        </div>
      )}
    </button>

    <StreakDetailModal open={showModal} onClose={() => setShowModal(false)} streak={data.streak} autoUsedDates={autoUsedDates} remaining={remaining} hasFreezes={hasFreezes} purchasedBalance={purchasedBalance} total={total} />
    </>
  );
}
