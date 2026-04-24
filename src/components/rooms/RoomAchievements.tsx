import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Flame, Target, Calendar, Zap, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomMember } from "@/hooks/useRoomMembers";
import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

const ACHIEVEMENT_DEFS: Record<string, { icon: any; colorClass: string }> = {
  total_10h: { icon: Flame, colorClass: "text-orange-500 bg-orange-500/10" },
  total_50h: { icon: Flame, colorClass: "text-orange-600 bg-orange-600/10" },
  total_100h: { icon: Flame, colorClass: "text-red-500 bg-red-500/10" },
  total_500h: { icon: Star, colorClass: "text-yellow-500 bg-yellow-500/10" },
  total_1000h: { icon: Trophy, colorClass: "text-yellow-600 bg-yellow-600/10" },
  streak_3d: { icon: Calendar, colorClass: "text-blue-500 bg-blue-500/10" },
  streak_7d: { icon: Calendar, colorClass: "text-blue-600 bg-blue-600/10" },
  streak_30d: { icon: Calendar, colorClass: "text-purple-500 bg-purple-500/10" },
  members_5: { icon: Target, colorClass: "text-green-500 bg-green-500/10" },
  members_10: { icon: Target, colorClass: "text-green-600 bg-green-600/10" },
  members_25: { icon: Zap, colorClass: "text-indigo-500 bg-indigo-500/10" },
};

interface Props {
  roomId: string;
  members: RoomMember[];
  streak?: number;
}

export function RoomAchievements({ roomId, members, streak = 0 }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const prevCountRef = useRef(0);

  const { data: achievements = [], refetch } = useQuery({
    queryKey: ["roomAchievements", roomId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("room_achievements" as any)
        .select("*")
        .eq("room_id", roomId)
        .order("unlocked_at", { ascending: true }) as any);
      if (error) throw error;
      return (data || []) as { id: string; achievement_type: string; unlocked_at: string }[];
    },
    enabled: !!roomId && !!user,
  });

  // Fire confetti when new achievement is unlocked
  useEffect(() => {
    if (achievements.length > prevCountRef.current && prevCountRef.current > 0) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#f59e0b", "#3b82f6", "#22c55e", "#a855f7"],
      });
    }
    prevCountRef.current = achievements.length;
  }, [achievements.length]);

  // Auto-check and unlock achievements
  useEffect(() => {
    if (!user || !roomId || members.length === 0) return;
    
    const totalHours = members.reduce((sum, m) => sum + m.total_seconds, 0) / 3600;
    const memberCount = members.length;
    const unlockedTypes = new Set(achievements.map(a => a.achievement_type));

    const checks: { type: string; condition: boolean }[] = [
      { type: "total_10h", condition: totalHours >= 10 },
      { type: "total_50h", condition: totalHours >= 50 },
      { type: "total_100h", condition: totalHours >= 100 },
      { type: "total_500h", condition: totalHours >= 500 },
      { type: "total_1000h", condition: totalHours >= 1000 },
      { type: "streak_3d", condition: streak >= 3 },
      { type: "streak_7d", condition: streak >= 7 },
      { type: "streak_30d", condition: streak >= 30 },
      { type: "members_5", condition: memberCount >= 5 },
      { type: "members_10", condition: memberCount >= 10 },
      { type: "members_25", condition: memberCount >= 25 },
    ];

    const toUnlock = checks.filter(c => c.condition && !unlockedTypes.has(c.type));
    if (toUnlock.length === 0) return;

    Promise.all(
      toUnlock.map(c =>
        supabase.from("room_achievements" as any).insert({
          room_id: roomId,
          achievement_type: c.type,
        }).then()
      )
    ).then(() => refetch());
  }, [members, streak, achievements, roomId, user]);

  if (achievements.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Trophy className="h-4 w-4" />
        {t("rooms.room_achievements")}
      </h3>
      <div className="flex flex-wrap gap-2">
        {achievements.map((ach) => {
          const def = ACHIEVEMENT_DEFS[ach.achievement_type];
          if (!def) return null;
          const IconComp = def.icon;
          return (
            <div
              key={ach.id}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                def.colorClass
              )}
              title={t(`rooms.achievement_${ach.achievement_type}`)}
            >
              <IconComp className="h-3.5 w-3.5" />
              {t(`rooms.achievement_${ach.achievement_type}`)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
