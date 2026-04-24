import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { RoomMember } from "@/hooks/useRoomMembers";
import { Users, Wifi, Clock, BookOpen, Target, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

function formatHours(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const roomTypeEmoji: Record<string, string> = {
  study: "📚",
  reading: "📖",
  work: "💻",
  custom: "🎯",
};

interface Props {
  roomId?: string;
  members: RoomMember[];
  roomType: string;
  goalHours?: number | null;
  goalLabel?: string | null;
  roomStreak?: number;
}

const PRESENCE_WINDOW_MS = 2 * 60 * 60 * 1000 + 5 * 60 * 1000; // 2h05min

export function RoomStatsHeader({ roomId, members, roomType, goalHours, goalLabel, roomStreak = 0 }: Props) {
  const { t } = useTranslation();
  const online = members.filter((m) => m.is_online).length;
  const studying = members.filter((m) => {
    if (!m.is_timer_active) return false;
    if (!m.last_active_at) return false;
    return Date.now() - new Date(m.last_active_at).getTime() < PRESENCE_WINDOW_MS;
  }).length;
  const isActive = studying > 0;

  // Real total seconds from time_entries (all members, all-time)
  const { data: totalAll } = useQuery({
    queryKey: ["roomTotalAll", roomId],
    queryFn: async () => {
      if (!roomId) return 0;
      const { data, error } = await (supabase.rpc as any)("get_room_daily_progress", {
        _room_id: roomId,
        _period: "all",
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return Number(row?.total_seconds_today || 0);
    },
    enabled: !!roomId,
    refetchInterval: 60000,
  });

  // Real today seconds (for goal progress)
  const { data: totalToday } = useQuery({
    queryKey: ["roomTotalToday", roomId],
    queryFn: async () => {
      if (!roomId) return 0;
      const { data, error } = await (supabase.rpc as any)("get_room_daily_progress", {
        _room_id: roomId,
        _period: "today",
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return Number(row?.total_seconds_today || 0);
    },
    enabled: !!roomId,
    refetchInterval: 30000,
  });

  const totalSeconds = totalAll ?? 0;
  const goalSeconds = totalToday ?? 0;

  const emoji = roomTypeEmoji[roomType] || "📚";

  const stats = [
    { icon: Users, label: t("rooms.members"), value: members.length, highlight: false },
    { icon: Wifi, label: t("rooms.online_now"), value: online, highlight: false },
    { icon: BookOpen, label: t("rooms.studying_now"), value: studying, highlight: studying > 0 },
    { icon: Clock, label: t("rooms.total_hours"), value: formatHours(totalSeconds), highlight: false },
    ...(roomStreak >= 2 ? [{ icon: Flame, label: t("rooms.room_streak"), value: `${roomStreak}d`, highlight: roomStreak >= 5 }] : []),
  ];

  // Goal progress inline (uses today's real seconds)
  const goalPercent = goalHours ? Math.min(100, (goalSeconds / 3600 / goalHours) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className={cn(
        "grid grid-cols-2 sm:grid-cols-5 gap-3 transition-all",
        isActive && "ring-1 ring-green-500/20 rounded-xl p-1"
      )}>
        {stats.map((stat, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-3 rounded-lg border bg-card p-3 transition-all",
              stat.highlight && "border-green-500/40 bg-green-500/5"
            )}
          >
            <div className={cn(
              "rounded-md p-2",
              stat.highlight ? "bg-green-500/15" : "bg-primary/10"
            )}>
              <stat.icon className={cn(
                "h-4 w-4",
                stat.highlight ? "text-green-600 animate-pulse" : "text-primary"
              )} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
              <p className={cn("text-lg font-bold truncate", stat.highlight && "text-green-600")}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Inline goal progress bar (promoted to top) */}
      {goalHours && goalHours > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <Target className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground truncate">
                {emoji} {goalLabel || t("rooms.collective_goal")}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {(goalSeconds / 3600).toFixed(1)}h / {goalHours}h
              </span>
            </div>
            <Progress value={goalPercent} className="h-2" />
          </div>
          <span className={cn(
            "text-xs font-bold tabular-nums shrink-0",
            goalPercent >= 100 ? "text-green-600" : "text-primary"
          )}>
            {goalPercent.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}
