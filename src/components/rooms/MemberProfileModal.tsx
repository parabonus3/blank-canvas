import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, Eye, EyeOff, Trophy, Flame, Zap, TrendingUp, BookOpen, Target, Timer, Award, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomMember } from "@/hooks/useRoomMembers";
import { useEffect, useState } from "react";
import { PlanBadge, PlanAvatarRing } from "@/components/rooms/PlanBadge";
import { useSendFriendRequest, useFriendships } from "@/hooks/useFriendships";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatHours(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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

function timeAgo(dateStr: string, t: (key: string) => string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("rooms.profile_just_now");
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function getAchievementBadges(totalSeconds: number, streak: number, bestSession: number) {
  const hours = totalSeconds / 3600;
  const bestMins = bestSession / 60;
  const badges: { icon: string; label: string; key: string }[] = [];

  if (hours >= 1) badges.push({ icon: "🏆", label: "1h", key: "1h" });
  if (hours >= 10) badges.push({ icon: "📚", label: "10h", key: "10h" });
  if (hours >= 50) badges.push({ icon: "📚", label: "50h", key: "50h" });
  if (hours >= 100) badges.push({ icon: "💎", label: "100h", key: "100h" });
  if (hours >= 500) badges.push({ icon: "👑", label: "500h", key: "500h" });
  if (streak >= 7) badges.push({ icon: "🔥", label: "7d", key: "7d" });
  if (streak >= 30) badges.push({ icon: "🔥", label: "30d", key: "30d" });
  if (bestMins >= 60) badges.push({ icon: "💪", label: "1h+", key: "1h_session" });
  if (bestMins >= 180) badges.push({ icon: "💪", label: "3h+", key: "3h_session" });

  return badges;
}

function getActivityLabel(action: string, metadata: any, t: (key: string, opts?: any) => string) {
  switch (action) {
    case "study_started": return t("rooms.profile_activity_started");
    case "study_completed":
      return t("rooms.profile_activity_completed", { minutes: Math.floor((metadata?.duration || 0) / 60) });
    case "session_completed": {
      const secs = metadata?.duration_seconds || 0;
      const mins = Math.floor(secs / 60);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const dur = h > 0 ? `${h}h ${m}m` : `${m}m`;
      return t("rooms.profile_activity_session_completed", { duration: dur });
    }
    case "member_joined": return t("rooms.profile_activity_joined");
    case "member_kicked": return t("rooms.profile_activity_kicked");
    case "room_created": return t("rooms.profile_activity_room_created");
    case "focus_started": return t("rooms.profile_activity_focus_started");
    case "focus_ended": return t("rooms.profile_activity_focus_ended");
    case "focus_joined": return t("rooms.profile_activity_focus_joined");
    case "focus_left": return t("rooms.profile_activity_focus_left");
    case "focus_scheduled": return t("rooms.profile_activity_focus_scheduled");
    case "milestone":
      return t("rooms.profile_activity_milestone", { hours: metadata?.hours || 0 });
    default: return action.replace(/_/g, " ");
  }
}

interface MemberExtended extends RoomMember {
  plan_tier?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberExtended | null;
  roomId?: string;
  totalMembers?: number;
}

export function MemberProfileModal({ open, onOpenChange, member, roomId, totalMembers }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [elapsedMin, setElapsedMin] = useState(0);
  const sendFriendRequest = useSendFriendRequest();
  const { accepted, pendingSent, getFriendUserId } = useFriendships();

  // Live timer elapsed
  useEffect(() => {
    if (!member?.is_timer_active || !member?.timer_started_at) {
      setElapsedMin(0);
      return;
    }
    const update = () => {
      const diff = Date.now() - new Date(member.timer_started_at!).getTime();
      setElapsedMin(Math.floor(diff / 60000));
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [member?.is_timer_active, member?.timer_started_at]);

  const { data: profileStats } = useQuery({
    queryKey: ["memberProfileStats", member?.user_id, roomId],
    queryFn: async () => {
      if (!member || !roomId) return null;
      const { data, error } = await (supabase.rpc as any)("get_member_profile_stats", {
        _user_id: member.user_id,
        _room_id: roomId,
      });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!member && !!roomId && open,
  });

  const { data: publicStats } = useQuery({
    queryKey: ["memberPublicStats", member?.user_id],
    queryFn: async () => {
      if (!member) return null;
      const { data, error } = await supabase.rpc("get_member_public_stats", {
        _user_id: member.user_id,
      });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!member && open,
  });

  if (!member) return null;

  const streak = profileStats?.streak || 0;
  const globalStreak = profileStats?.global_streak || 0;
  const bestSessionMins = Math.floor((profileStats?.best_session || 0) / 60);
  const roomRank = profileStats?.room_rank || 0;
  const hoursToday = profileStats?.hours_today || 0;
  const hoursWeek = profileStats?.hours_week || 0;
  const recentActivities = (profileStats?.recent_activities || []) as any[];
  const globalHours = publicStats?.total_seconds ? publicStats.total_seconds / 3600 : 0;
  const badges = getAchievementBadges(member.total_seconds, globalStreak, profileStats?.best_session || 0);

  const isSelf = user?.id === member.user_id;
  const isAlreadyFriend = accepted.some(f => getFriendUserId(f) === member.user_id);
  const isPendingFriend = pendingSent.some(f => getFriendUserId(f) === member.user_id);

  const isStudying = member.is_timer_active;
  const isOnline = member.is_online;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <ScrollArea className="max-h-[85vh]">
          <div className="p-6 space-y-5">
            <DialogHeader className="pb-0">
              <DialogTitle className="sr-only">{t("rooms.member_profile")}</DialogTitle>
            </DialogHeader>

            {/* Avatar + Name + Status */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <PlanAvatarRing tier={(member as any).plan_tier || "free"} flairId={(member as any).avatar_flair || (publicStats as any)?.avatar_flair}>
                <div className={cn(
                  "rounded-full p-[3px]",
                  isStudying
                    ? "bg-gradient-to-br from-cyan-400 to-blue-500 animate-pulse"
                    : isOnline
                      ? "bg-gradient-to-br from-green-400 to-emerald-500"
                      : "bg-muted"
                )}>
                  <Avatar className="h-20 w-20 border-2 border-background">
                    {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                    <AvatarFallback className={cn("text-xl text-white", getAvatarColor(member.user_id))}>
                      {getInitials(member.display_name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                </PlanAvatarRing>
                {/* Online indicator dot */}
                <div className={cn(
                  "absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-background",
                  isStudying ? "bg-cyan-400 animate-pulse" : isOnline ? "bg-green-500" : "bg-muted-foreground/30"
                )} />
              </div>

              <div className="text-center space-y-1.5">
                <div className="flex items-center justify-center gap-1.5">
                  <h3 className="text-xl font-bold">{member.display_name || t("rooms.anonymous")}</h3>
                  <PlanBadge tier={(member as any).plan_tier || "free"} size="md" />
                </div>

                {/* Title - prominent */}
                {(() => {
                  const hours = member.total_seconds / 3600;
                  let titleLabel = t("rooms.level_novice");
                  let titleColor = "text-muted-foreground";
                  let titleIcon = "🌱";
                  if (hours >= 500) { titleLabel = t("rooms.level_legend"); titleColor = "text-yellow-500"; titleIcon = "👑"; }
                  else if (hours >= 200) { titleLabel = t("rooms.level_master"); titleColor = "text-purple-500"; titleIcon = "🥇"; }
                  else if (hours >= 50) { titleLabel = t("rooms.level_veteran"); titleColor = "text-blue-500"; titleIcon = "⚔️"; }
                  else if (hours >= 10) { titleLabel = t("rooms.level_dedicated"); titleColor = "text-green-500"; titleIcon = "📚"; }
                  return (
                    <p className={cn("text-sm font-semibold", titleColor)}>
                      {titleIcon} {titleLabel}
                    </p>
                  );
                })()}

                {/* Streak + Rank badges */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {globalStreak >= 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 px-2.5 py-0.5 text-xs font-bold">
                      <Flame className="h-3.5 w-3.5" /> {globalStreak} {t("rooms.streak_days")}
                    </span>
                  )}
                  {streak >= 1 && streak !== globalStreak && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 text-xs font-bold">
                      🏠 {streak}d {t("friends.in_room")}
                    </span>
                  )}
                  {roomRank > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 px-2.5 py-0.5 text-xs font-bold">
                      <Trophy className="h-3.5 w-3.5" /> #{roomRank}
                    </span>
                  )}
                </div>

                {/* Add friend button */}
                {!isSelf && !isAlreadyFriend && (
                  <Button
                    size="sm"
                    variant={isPendingFriend ? "outline" : "default"}
                    disabled={isPendingFriend || sendFriendRequest.isPending}
                    onClick={() => sendFriendRequest.mutate(member.user_id)}
                    className="gap-1.5"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {isPendingFriend ? t("friends.request_sent") : t("friends.add_friend")}
                  </Button>
                )}

                {/* Status line - secondary */}
                {isStudying ? (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>
                      {member.status_text
                        ? `${member.status_text} — ${elapsedMin}m`
                        : `${t("rooms.profile_studying")} — ${elapsedMin}m`
                      }
                    </span>
                  </div>
                ) : isOnline ? (
                  <p className="text-xs text-green-600 dark:text-green-400">🟢 Online</p>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("rooms.profile_offline")}</p>
                )}
              </div>
            </div>

            {/* 3 Stat Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-1 rounded-xl bg-orange-500/10 p-3">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="text-xl font-bold text-orange-600 dark:text-orange-400">{globalStreak}</span>
                <span className="text-[10px] text-muted-foreground leading-tight text-center">{t("rooms.streak_days")}</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl bg-blue-500/10 p-3">
                <Zap className="h-5 w-5 text-blue-500" />
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{bestSessionMins}m</span>
                <span className="text-[10px] text-muted-foreground leading-tight text-center">{t("rooms.best_session")}</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl bg-yellow-500/10 p-3">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                  {roomRank > 0 ? `#${roomRank}` : "—"}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight text-center">{t("rooms.profile_rank")}</span>
              </div>
            </div>

            {/* Today & Week Progress */}
            <div className="rounded-xl bg-muted/50 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5" />
                {t("rooms.profile_progress")}
              </h4>
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t("rooms.profile_today")}</span>
                    <span className="font-mono font-semibold">{formatHours(hoursToday)}</span>
                  </div>
                  <Progress value={Math.min((hoursToday / 3) * 100, 100)} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t("rooms.profile_week")}</span>
                    <span className="font-mono font-semibold">{formatHours(hoursWeek)}</span>
                  </div>
                  <Progress value={Math.min((hoursWeek / 20) * 100, 100)} className="h-2" />
                </div>
              </div>
            </div>

            {/* In This Room */}
            <div className="rounded-xl border border-border p-4 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                {t("rooms.profile_in_room")}
              </h4>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("rooms.time_in_room")}
                </span>
                <span className="font-mono font-bold">{formatTime(member.total_seconds)}</span>
              </div>
              {roomRank > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("rooms.profile_ranking")}
                  </span>
                  <span className="font-mono font-bold">
                    #{roomRank} {totalMembers ? `/ ${totalMembers}` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Achievement Badges */}
            {badges.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("rooms.profile_achievements")}
                </h4>
                <TooltipProvider>
                  <div className="flex flex-wrap gap-1.5">
                    {badges.map((b) => (
                      <Tooltip key={b.key}>
                        <TooltipTrigger>
                          <Badge variant="secondary" className="text-sm px-2.5 py-1 cursor-default">
                            {b.icon} {b.label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>{b.icon} {b.label}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>
              </div>
            )}

            {/* Recent Activity */}
            {recentActivities.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("rooms.profile_recent")}
                </h4>
                <div className="space-y-1.5">
                  {recentActivities.map((act: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>• {getActivityLabel(act.action_type, act.metadata, t)}</span>
                      <span className="text-[10px] shrink-0 ml-2">{timeAgo(act.created_at, t)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Global Stats */}
            {publicStats?.is_stats_public ? (
              <div className="rounded-xl border border-border p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Eye className="h-3 w-3" />
                  {t("rooms.public_stats")}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>{t("rooms.total_hours_global")}</span>
                  <span className="font-mono font-bold">{globalHours.toFixed(1)}h</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                <EyeOff className="h-3 w-3" />
                {t("rooms.stats_private")}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
