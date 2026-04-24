import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { RoomMember } from "@/hooks/useRoomMembers";
import { Trophy, Medal, Award, ArrowUp, Flame } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
  return <span className="text-xs font-mono text-muted-foreground w-4 text-center">#{rank}</span>;
}

function getAvatarColor(userId: string) {
  const colors = [
    "bg-red-500", "bg-blue-500", "bg-green-500", "bg-purple-500",
    "bg-pink-500", "bg-indigo-500", "bg-teal-500", "bg-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

type Period = "all" | "today" | "week" | "month";

interface Props {
  members: RoomMember[];
  roomId?: string;
}

export function RoomRankingSidebar({ members, roomId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("all");

  // Batch streaks
  const { data: streaksMap = {} } = useQuery({
    queryKey: ["roomMembersStreaks", roomId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_room_members_streaks", {
        _room_id: roomId,
      });
      if (error) throw error;
      const map: Record<string, number> = {};
      (data || []).forEach((r: { user_id: string; streak: number }) => {
        map[r.user_id] = r.streak;
      });
      return map;
    },
    enabled: !!roomId,
    staleTime: 120000,
  });

  const { data: periodData, isLoading: periodLoading } = useQuery({
    queryKey: ["roomRanking", roomId, period],
    queryFn: async () => {
      if (!roomId) return [];
      const { data, error } = await (supabase.rpc as any)("get_room_ranking_by_period", {
        _room_id: roomId,
        _period: period,
      });
      if (error) throw error;
      return (data || []) as { user_id: string; display_name: string; avatar_url: string; total_seconds: number }[];
    },
    enabled: !!roomId,
    refetchInterval: 60000,
  });

  const displayData = (periodData || []).map(p => ({
    id: p.user_id,
    user_id: p.user_id,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    total_seconds: Number(p.total_seconds || 0),
  }));

  const periods: { key: Period; label: string }[] = [
    { key: "today", label: t("rooms.ranking_today") },
    { key: "week", label: t("rooms.ranking_week") },
    { key: "month", label: t("rooms.ranking_month") },
    { key: "all", label: t("rooms.ranking_all") },
  ];

  // Find my position + distance to next
  const myIndex = displayData.findIndex(m => m.user_id === user?.id);
  const myRank = myIndex >= 0 ? myIndex + 1 : null;
  const distanceToNext = myIndex > 0
    ? displayData[myIndex - 1].total_seconds - displayData[myIndex].total_seconds
    : null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Trophy className="h-4 w-4" />
        {t("rooms.leaderboard")}
      </h3>

      {/* Period tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={cn(
              "flex-1 text-[10px] font-medium py-1 px-1.5 rounded-md transition-all",
              period === p.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {displayData.map((member, index) => {
          const rank = index + 1;
          const isMe = member.user_id === user?.id;
          const isLeader = rank === 1 && member.total_seconds > 0;
          return (
            <div
              key={member.user_id}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all",
                isMe && "bg-primary/5",
                isLeader && "leader-glow"
              )}
            >
              <div className="w-5 flex justify-center shrink-0">
                {getRankIcon(rank)}
              </div>
              <Avatar className="h-6 w-6 shrink-0">
                {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                <AvatarFallback className={cn("text-[10px] text-white", getAvatarColor(member.user_id))}>
                  {getInitials(member.display_name)}
                </AvatarFallback>
              </Avatar>
              <span className={cn("truncate flex-1 text-xs", isMe && "font-semibold text-primary")}>
                {member.display_name || t("rooms.anonymous")}
                {isMe && ` (${t("rooms.you")})`}
              </span>
              {(streaksMap[member.user_id] || 0) >= 2 && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-orange-500 shrink-0">
                  <Flame className="h-3 w-3" />{streaksMap[member.user_id]}
                </span>
              )}
              <span className="font-mono text-xs font-bold tabular-nums shrink-0">
                {formatTime(member.total_seconds)}
              </span>
            </div>
          );
        })}
        {displayData.length === 0 && !periodLoading && (
          <p className="text-xs text-muted-foreground text-center py-2">
            {t("rooms.no_activity_period")}
          </p>
        )}
        {periodLoading && displayData.length === 0 && (
          <div className="space-y-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-7 rounded-lg bg-muted/40 animate-pulse" />
            ))}
          </div>
        )}
      </div>

      {/* Distance to next rank */}
      {myRank && myRank > 1 && distanceToNext != null && distanceToNext > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-primary bg-primary/5 rounded-lg px-3 py-2 font-medium">
          <ArrowUp className="h-3.5 w-3.5" />
          {t("rooms.distance_to_next", { time: formatTime(distanceToNext), position: myRank - 1 })}
        </div>
      )}
    </div>
  );
}
