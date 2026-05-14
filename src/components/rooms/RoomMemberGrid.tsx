import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RoomMember } from "@/hooks/useRoomMembers";
import { Shield, VolumeX, Pencil, Check, X, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { MemberProfileModal } from "@/components/rooms/MemberProfileModal";
import { PlanBadge, PlanAvatarRing } from "@/components/rooms/PlanBadge";
import { Wallpaper } from "@/components/Wallpaper";
import { useQuery } from "@tanstack/react-query";

const PRESENCE_WINDOW_MS = 2 * 60 * 60 * 1000 + 5 * 60 * 1000; // 2h05min

function isActivelyStudying(m: { is_timer_active?: boolean; last_active_at?: string | null }) {
  if (!m.is_timer_active) return false;
  if (!m.last_active_at) return false;
  return Date.now() - new Date(m.last_active_at).getTime() < PRESENCE_WINDOW_MS;
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
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

function getMemberTitle(totalSeconds: number, t: (key: string) => string) {
  const hours = totalSeconds / 3600;
  if (hours >= 500) return { label: t("rooms.level_legend"), color: "text-yellow-500" };
  if (hours >= 200) return { label: t("rooms.level_master"), color: "text-purple-500" };
  if (hours >= 50) return { label: t("rooms.level_veteran"), color: "text-blue-500" };
  if (hours >= 10) return { label: t("rooms.level_dedicated"), color: "text-green-500" };
  return { label: t("rooms.level_novice"), color: "text-muted-foreground" };
}

function TimerPulse() {
  return (
    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-background" />
    </span>
  );
}

function OnlineDot() {
  return (
    <span className="absolute -bottom-0.5 -right-0.5 inline-flex rounded-full h-3 w-3 bg-yellow-500 border-2 border-background" />
  );
}

function OfflineDot() {
  return (
    <span className="absolute -bottom-0.5 -right-0.5 inline-flex rounded-full h-3 w-3 bg-muted-foreground/40 border-2 border-background" />
  );
}

interface RoomMemberExtended extends RoomMember {
  status_text?: string;
  plan_tier?: string;
}

interface Props {
  members: RoomMemberExtended[];
  roomId: string;
  isOwnerOrMod?: boolean;
}

export function RoomMemberGrid({ members, roomId, isOwnerOrMod = false }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusDraft, setStatusDraft] = useState("");
  const [selectedMember, setSelectedMember] = useState<RoomMemberExtended | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Batch fetch streaks for all members
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

  const handleSaveStatus = async () => {
    if (!user || !roomId) return;
    await supabase
      .from("room_members")
      .update({ status_text: statusDraft || null })
      .eq("room_id", roomId)
      .eq("user_id", user.id);
    setEditingStatus(false);
    queryClient.invalidateQueries({ queryKey: ["roomMembers", roomId] });
  };

  const handleMemberClick = (member: RoomMemberExtended) => {
    if (member.user_id === user?.id) return;
    setSelectedMember(member);
    setProfileOpen(true);
  };

  const myMember = members.find(m => m.user_id === user?.id);

  return (
    <div className="space-y-4">
      {/* Status editor */}
      {myMember && (
        <div className="flex items-center gap-2 text-sm">
          {editingStatus ? (
            <>
              <Input
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
                placeholder={t("rooms.status_placeholder")}
                className="h-8 text-xs flex-1"
                maxLength={60}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveStatus()}
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveStatus}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingStatus(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                setStatusDraft((myMember as any).status_text || "");
                setEditingStatus(true);
              }}
            >
              <Pencil className="h-3 w-3" />
              {(myMember as any).status_text || t("rooms.set_status")}
            </button>
          )}
        </div>
      )}

      {/* Desk grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {members.map((member) => {
          const isMe = member.user_id === user?.id;
          const memberTier = (member as any).plan_tier || "free";
          const title = getMemberTitle(member.total_seconds, t);
          const studyingNow = isActivelyStudying(member);
          const isPremium = memberTier === "premium";
          const isPro = memberTier === "pro";
          return (
            <div
              key={member.id}
              className={cn(
                "relative flex items-center gap-3 p-3 pr-4 transition-all",
                isPremium ? "classroom-desk-premium" : isPro ? "classroom-desk-pro" : "classroom-desk",
                !isMe && "cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5",
                isMe && !isPremium && !isPro && "ring-2 ring-primary/30",
                studyingNow && "ring-2 ring-green-500/40"
              )}
              onClick={() => handleMemberClick(member)}
            >
              {isPremium && <span className="plan-ribbon plan-ribbon-premium">Premium</span>}
              {isPro && <span className="plan-ribbon plan-ribbon-pro">Pro</span>}
              {/* Avatar with plan ring */}
              <div className="relative shrink-0 z-[1]">
                <PlanAvatarRing tier={memberTier} flairId={(member as any).avatar_flair}>
                  <Avatar className={cn(
                    "h-11 w-11 ring-2 ring-offset-1 ring-offset-transparent",
                    memberTier !== "free"
                      ? "ring-transparent"
                      : studyingNow
                        ? "ring-green-500"
                        : isMe
                        ? "ring-primary"
                        : "ring-border"
                  )}>
                    {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                    <AvatarFallback className={cn("text-xs font-bold text-white", getAvatarColor(member.user_id))}>
                      {getInitials(member.display_name)}
                    </AvatarFallback>
                  </Avatar>
                </PlanAvatarRing>
                {studyingNow ? <TimerPulse /> : member.is_online ? <OnlineDot /> : <OfflineDot />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-0.5 relative z-[1]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn(
                    "font-semibold text-sm truncate",
                    isPremium && "font-extrabold bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_1px_1px_rgba(180,120,0,0.25)]",
                    isPro && "font-extrabold bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent",
                    !isPremium && !isPro && (isMe ? "text-primary" : "text-foreground")
                  )}>
                    {member.display_name || t("rooms.anonymous")}
                  </span>
                  <PlanBadge tier={memberTier} />
                  {isPremium && (
                    <span className="text-amber-500 text-xs animate-pulse">✨</span>
                  )}
                  {isMe && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0 shrink-0">
                      {t("rooms.you")}
                    </Badge>
                  )}
                  {member.role === "owner" && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                      👑 {t("rooms.owner")}
                    </Badge>
                  )}
                  {member.role === "moderator" && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                      <Shield className="h-2.5 w-2.5 mr-0.5" /> MOD
                    </Badge>
                  )}
                  {isOwnerOrMod && (member as any).is_muted && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30 shrink-0">
                      <VolumeX className="h-2.5 w-2.5 mr-0.5" /> {t("rooms.muted")}
                    </Badge>
                  )}
                  {(streaksMap[member.user_id] || 0) >= 2 && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-orange-500/15 text-orange-600 border-orange-500/30 shrink-0">
                      <Flame className="h-2.5 w-2.5 mr-0.5" /> {streaksMap[member.user_id]}d
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Level title */}
                  <span className={cn("text-[10px] font-medium", title.color)}>
                    {title.label}
                  </span>
                </div>
                {(member as any).status_text && (
                  <p className="text-[11px] italic text-muted-foreground truncate">
                    {(member as any).status_text}
                  </p>
                )}
              </div>

              {/* Time */}
              <span className={cn(
                "font-mono text-base font-bold tabular-nums shrink-0 relative z-[1]",
                isPremium && "text-amber-700 dark:text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]",
                isPro && "text-blue-700 dark:text-blue-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]",
                !isPremium && !isPro && "text-foreground"
              )}>
                {formatTime(member.total_seconds)}
              </span>
            </div>
          );
        })}
      </div>

      <MemberProfileModal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        member={selectedMember}
        roomId={roomId}
        totalMembers={members.length}
      />
    </div>
  );
}
