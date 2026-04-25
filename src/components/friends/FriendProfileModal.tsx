import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, Flame, Zap, Trophy, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanBadge, PlanAvatarRing } from "@/components/rooms/PlanBadge";

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

interface FriendProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

export function FriendProfileModal({ open, onOpenChange, userId, displayName, avatarUrl }: FriendProfileModalProps) {
  const { t } = useTranslation();

  const { data: publicStats } = useQuery({
    queryKey: ["friend-public-stats", userId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_member_public_stats", { _user_id: userId });
      return data?.[0] || null;
    },
    enabled: open && !!userId,
  });

  const { data: bestSession = 0 } = useQuery({
    queryKey: ["friend-best-session", userId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_member_best_session", { _user_id: userId });
      return (data || 0) as number;
    },
    enabled: open && !!userId,
  });

  const { data: streak = 0 } = useQuery({
    queryKey: ["friend-streak", userId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_member_room_streak", { _user_id: userId });
      return (data || 0) as number;
    },
    enabled: open && !!userId,
  });

  const { data: progress } = useQuery({
    queryKey: ["friend-progress", userId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_friend_progress", { _user_id: userId });
      return data?.[0] || { hours_today: 0, hours_week: 0 };
    },
    enabled: open && !!userId,
  });

  const totalSeconds = publicStats?.total_seconds || 0;
  const isPublic = publicStats?.is_stats_public !== false;
  const planTier = publicStats?.plan_tier || "free";
  const bestSessionMins = Math.floor(bestSession / 60);
  const hoursToday = progress?.hours_today || 0;
  const hoursWeek = progress?.hours_week || 0;
  const badges = getAchievementBadges(totalSeconds, streak, bestSession);

  // Level title
  const totalHours = totalSeconds / 3600;
  let titleLabel = t("rooms.level_novice");
  let titleColor = "text-muted-foreground";
  let titleIcon = "🌱";
  if (totalHours >= 500) { titleLabel = t("rooms.level_legend"); titleColor = "text-yellow-500"; titleIcon = "👑"; }
  else if (totalHours >= 200) { titleLabel = t("rooms.level_master"); titleColor = "text-purple-500"; titleIcon = "🥇"; }
  else if (totalHours >= 50) { titleLabel = t("rooms.level_veteran"); titleColor = "text-blue-500"; titleIcon = "⚔️"; }
  else if (totalHours >= 10) { titleLabel = t("rooms.level_dedicated"); titleColor = "text-green-500"; titleIcon = "📚"; }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <ScrollArea className="max-h-[85vh]">
          <div className="p-6 space-y-5">
            <DialogHeader className="pb-0">
              <DialogTitle className="sr-only">{displayName}</DialogTitle>
              <DialogDescription className="sr-only">{t("friends.profile")}</DialogDescription>
            </DialogHeader>

            {/* Avatar + Name + Level + PlanBadge */}
            <div className="flex flex-col items-center gap-3">
              <PlanAvatarRing tier={planTier} flairId={(publicStats as any)?.avatar_flair}>
                <div className="rounded-full p-[3px] bg-muted">
                  <Avatar className="h-20 w-20 border-2 border-background">
                    {avatarUrl && <AvatarImage src={avatarUrl} />}
                    <AvatarFallback className={cn("text-xl text-white", getAvatarColor(userId))}>
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </PlanAvatarRing>

              <div className="text-center space-y-1.5">
                <div className="flex items-center justify-center gap-1.5">
                  <h3 className="text-xl font-bold">{displayName || "?"}</h3>
                  <PlanBadge tier={planTier} size="md" />
                </div>

                {isPublic && (
                  <p className={cn("text-sm font-semibold", titleColor)}>
                    {titleIcon} {titleLabel}
                  </p>
                )}

                {isPublic && streak >= 1 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 px-2.5 py-0.5 text-xs font-bold">
                    <Flame className="h-3.5 w-3.5" /> {streak} {t("rooms.streak_days")}
                  </span>
                )}
              </div>
            </div>

            {!isPublic ? (
              <p className="text-center text-sm text-muted-foreground py-4">{t("rooms.stats_private")}</p>
            ) : (
              <>
                {/* 3 Stat Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center gap-1 rounded-xl bg-orange-500/10 p-3">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <span className="text-xl font-bold text-orange-600 dark:text-orange-400">{streak}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight text-center">{t("rooms.streak_days")}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded-xl bg-blue-500/10 p-3">
                    <Zap className="h-5 w-5 text-blue-500" />
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{bestSessionMins}m</span>
                    <span className="text-[10px] text-muted-foreground leading-tight text-center">{t("rooms.best_session")}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded-xl bg-yellow-500/10 p-3">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{Math.floor(totalHours)}h</span>
                    <span className="text-[10px] text-muted-foreground leading-tight text-center">{t("friends.total_study")}</span>
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

                {/* Total time card */}
                <div className="rounded-xl border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {t("friends.total_study")}
                    </span>
                    <span className="font-mono font-bold">{formatTime(totalSeconds)}</span>
                  </div>
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
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
