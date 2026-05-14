import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Target, PartyPopper } from "lucide-react";
import { RoomMember } from "@/hooks/useRoomMembers";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useTimezone } from "@/hooks/useTimezone";
import confetti from "canvas-confetti";

interface Props {
  goalHours: number;
  goalLabel?: string | null;
  members: RoomMember[];
  isChalkboard?: boolean;
  roomId?: string;
}

function fireConfetti() {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7"],
  });
}

export function RoomGoalProgress({ goalHours, goalLabel, members, isChalkboard = false, roomId }: Props) {
  const { t } = useTranslation();
  const { timezone } = useTimezone();
  const [showCelebration, setShowCelebration] = useState(false);
  const [prevPercent, setPrevPercent] = useState(0);
  const firedRef = useRef(false);

  // Use daily progress RPC when roomId is available
  const { data: dailyData } = useQuery({
    queryKey: ["roomDailyProgress", roomId, timezone],
    queryFn: async () => {
      if (!roomId) return null;
      const { data, error } = await (supabase.rpc as any)("get_room_daily_progress", {
        _room_id: roomId,
        _period: "today",
        _tz: timezone,
      });
      if (error) throw error;
      return data?.[0] || data;
    },
    enabled: !!roomId,
    refetchInterval: 30000, // refresh every 30s
  });

  const dailySeconds = dailyData?.total_seconds_today || 0;
  
  // Prefer daily seconds from RPC, fallback to member totals
  const totalSeconds = roomId ? dailySeconds : members.reduce((sum, m) => sum + m.total_seconds, 0);
  const totalHours = totalSeconds / 3600;
  const percent = Math.min(100, (totalHours / goalHours) * 100);

  useEffect(() => {
    if (percent >= 100 && prevPercent < 100 && !firedRef.current) {
      setShowCelebration(true);
      firedRef.current = true;
      fireConfetti();
      setTimeout(() => setShowCelebration(false), 5000);
    }
    if (percent < 100) firedRef.current = false;
    setPrevPercent(percent);
  }, [percent]);

  if (isChalkboard) {
    return (
      <div className="space-y-2 relative">
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-10"
            >
              <div className="text-center space-y-1">
                <PartyPopper className="h-8 w-8 text-yellow-300 mx-auto" />
                <p className="font-bold text-yellow-300 text-sm">{t("rooms.goal_completed")}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2 chalk-text">
          <Target className="h-4 w-4 opacity-80" />
          <span className="text-sm font-semibold opacity-90">
            {goalLabel || t("rooms.daily_goal")}
          </span>
          {percent >= 100 && (
            <span className="text-xs text-green-300 font-medium">✓ {t("rooms.goal_reached_label")}</span>
          )}
        </div>

        {/* Chalk-style progress bar */}
        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-400/70 rounded-full transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex justify-between text-xs chalk-text opacity-70">
          <span>{totalHours.toFixed(1)}h {t("rooms.of")} {goalHours}h {t("rooms.today_label")}</span>
          <span>{percent.toFixed(0)}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3 relative overflow-hidden">
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-primary/10 z-10 rounded-lg"
          >
            <div className="text-center space-y-2">
              <PartyPopper className="h-10 w-10 text-primary mx-auto" />
              <p className="font-bold text-primary text-lg">{t("rooms.goal_completed")}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">
          {goalLabel || t("rooms.daily_goal")}
        </h3>
        {percent >= 100 && (
          <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-medium">
            ✓ {t("rooms.goal_reached_label")}
          </span>
        )}
      </div>
      <Progress value={percent} className="h-2.5" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{totalHours.toFixed(1)}h {t("rooms.of")} {goalHours}h {t("rooms.today_label")}</span>
        <span>{percent.toFixed(0)}%</span>
      </div>
    </div>
  );
}
