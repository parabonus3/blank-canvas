import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, UserPlus, Clock, Trophy, Timer, Target, Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR, enUS, es, fr, de, ja, ko, zhCN, it, ru, id as idLocale, arSA } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { ActivityReactions } from "./ActivityReactions";
import { cn } from "@/lib/utils";

const localeMap: Record<string, any> = {
  "pt-BR": ptBR, "en-US": enUS, "es-ES": es, "fr-FR": fr,
  "de-DE": de, "ja-JP": ja, "ko-KR": ko, "zh-CN": zhCN,
  "it-IT": it, "ru-RU": ru, "id-ID": idLocale, "ar-SA": arSA,
};

function getActionIcon(type: string) {
  switch (type) {
    case "member_joined": return <UserPlus className="h-4 w-4 text-green-500" />;
    case "room_created": return <Trophy className="h-4 w-4 text-yellow-500" />;
    case "session_completed": return <Clock className="h-4 w-4 text-blue-500" />;
    case "focus_started": return <Timer className="h-4 w-4 text-primary" />;
    case "focus_ended": return <Timer className="h-4 w-4 text-muted-foreground" />;
    case "goal_reached": return <Target className="h-4 w-4 text-green-600" />;
    case "milestone": return <Flame className="h-4 w-4 text-orange-500" />;
    case "member_kicked": return <Activity className="h-4 w-4 text-red-500" />;
    case "study_started": return <Timer className="h-4 w-4 text-green-500" />;
    case "study_completed": return <Clock className="h-4 w-4 text-blue-500" />;
    case "rank_up": return <Trophy className="h-4 w-4 text-yellow-500" />;
    case "achievement_unlocked": return <Flame className="h-4 w-4 text-orange-500" />;
    default: return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

function isHighlightEvent(type: string) {
  return ["rank_up", "milestone", "achievement_unlocked", "goal_reached"].includes(type);
}

interface Props {
  roomId: string;
  memberProfiles?: Map<string, { display_name?: string }>;
}

export function RoomActivityFeed({ roomId, memberProfiles }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: activities = [] } = useQuery({
    queryKey: ["roomActivity", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_activity_log")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!roomId && !!user,
  });

  const activityIds = useMemo(() => activities.map(a => a.id), [activities]);

  const { data: reactionsData = [] } = useQuery({
    queryKey: ["activityReactions", activityIds],
    queryFn: async () => {
      if (activityIds.length === 0) return [];
      const { data, error } = await supabase
        .from("activity_reactions" as any)
        .select("*")
        .in("activity_id", activityIds);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: activityIds.length > 0 && !!user,
  });

  const reactionsByActivity = useMemo(() => {
    const map = new Map<string, { emoji: string; count: number; hasReacted: boolean }[]>();
    for (const actId of activityIds) {
      const actReactions = reactionsData.filter((r: any) => r.activity_id === actId);
      const emojiMap = new Map<string, { count: number; hasReacted: boolean }>();
      for (const r of actReactions) {
        const existing = emojiMap.get(r.emoji) || { count: 0, hasReacted: false };
        existing.count++;
        if (r.user_id === user?.id) existing.hasReacted = true;
        emojiMap.set(r.emoji, existing);
      }
      map.set(actId, Array.from(emojiMap.entries()).map(([emoji, data]) => ({ emoji, ...data })));
    }
    return map;
  }, [reactionsData, activityIds, user?.id]);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`room-activity-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_activity_log", filter: `room_id=eq.${roomId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["roomActivity", roomId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, queryClient]);

  const locale = localeMap[i18n.language] || enUS;

  if (activities.length === 0) return null;

  const getLabel = (act: any) => {
    const name = memberProfiles?.get(act.user_id)?.display_name || t("rooms.anonymous");
    const metadata = act.metadata || {};
    
    switch (act.action_type) {
      case "member_joined": return t("rooms.activity_member_joined", { name });
      case "room_created": return t("rooms.activity_room_created", { name });
      case "session_completed": {
        const mins = Math.round((metadata.duration_seconds || 0) / 60);
        return t("rooms.activity_session_completed", { name, minutes: mins });
      }
      case "focus_started": return t("rooms.activity_focus_started", { name, minutes: metadata.duration || 25 });
      case "focus_ended": return t("rooms.activity_focus_ended", { minutes: metadata.duration || 25 });
      case "goal_reached": return t("rooms.activity_goal_reached");
      case "milestone": return t("rooms.activity_milestone", { name, hours: metadata.hours || 0 });
      case "study_started": return t("rooms.activity_study_started", { name });
      case "study_completed": {
        const mins2 = Math.round((metadata.duration_seconds || 0) / 60);
        return t("rooms.activity_study_completed", { name, minutes: mins2 });
      }
      case "rank_up": return t("rooms.activity_rank_up", { name, position: metadata.position || "?" });
      case "achievement_unlocked": return t("rooms.activity_achievement_unlocked", { achievement: metadata.achievement || "" });
      case "member_kicked": return t("rooms.activity_member_kicked", { name });
      default: return `${name} — ${act.action_type}`;
    }
  };

  const handleReactionChange = () => {
    queryClient.invalidateQueries({ queryKey: ["activityReactions", activityIds] });
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Activity className="h-4 w-4" />
        {t("rooms.activity")}
      </h3>
      <ScrollArea className="h-[250px]">
        <div className="space-y-2">
          {activities.map((act, idx) => {
            const highlight = isHighlightEvent(act.action_type);
            return (
              <div
                key={act.id}
                className={cn(
                  "space-y-0.5 rounded-lg px-2 py-1.5 transition-all",
                  highlight && "bg-primary/5 border border-primary/10",
                  idx === 0 && "animate-in slide-in-from-top-2 duration-300"
                )}
              >
                <div className="flex items-start gap-2 text-sm">
                  <div className="mt-0.5">{getActionIcon(act.action_type)}</div>
                  <div className="flex-1 min-w-0">
                    <span className={cn("text-foreground", highlight && "font-medium")}>{getLabel(act)}</span>
                    <span className="text-muted-foreground/60 text-xs ml-2">
                      {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale })}
                    </span>
                  </div>
                </div>
                <div className="pl-6">
                  <ActivityReactions
                    activityId={act.id}
                    reactions={reactionsByActivity.get(act.id) || []}
                    onReactionChange={handleReactionChange}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
