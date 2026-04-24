import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RoomMember } from "@/hooks/useRoomMembers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Flame, Zap } from "lucide-react";

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

interface Props {
  members: RoomMember[];
  onJoinSession?: () => void;
  hasFocusSession?: boolean;
}

const PRESENCE_WINDOW_MS = 2 * 60 * 60 * 1000 + 5 * 60 * 1000; // 2h05min

export function RoomLiveBanner({ members, onJoinSession, hasFocusSession }: Props) {
  const { t } = useTranslation();
  const studying = members.filter((m) => {
    if (!m.is_timer_active) return false;
    if (!m.last_active_at) return false;
    return Date.now() - new Date(m.last_active_at).getTime() < PRESENCE_WINDOW_MS;
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (studying.length === 0) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [studying.length]);

  if (studying.length === 0) return null;

  // Intensity level
  const intensity = studying.length >= 3 ? "high" : studying.length >= 2 ? "medium" : "low";
  const intensityLabel = intensity === "high"
    ? t("rooms.intensity_high")
    : intensity === "medium"
    ? t("rooms.intensity_medium")
    : null;

  return (
    <div className={cn(
      "rounded-xl border p-4 space-y-3 animate-in fade-in duration-500",
      intensity === "high"
        ? "border-orange-500/40 bg-orange-500/5"
        : intensity === "medium"
        ? "border-green-500/30 bg-green-500/5"
        : "border-destructive/30 bg-destructive/5"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-3 w-3 rounded-full bg-destructive opacity-75 animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
        </div>
        <span className="text-sm font-bold text-destructive uppercase tracking-wider">
          LIVE
        </span>

        {/* Intensity badge */}
        {intensityLabel && (
          <Badge variant="outline" className={cn(
            "text-[10px] px-2 py-0 border-orange-500/40",
            intensity === "high" ? "text-orange-600 bg-orange-500/10" : "text-green-600 bg-green-500/10 border-green-500/40"
          )}>
            <Flame className="h-3 w-3 mr-0.5" />
            {intensityLabel}
          </Badge>
        )}

        <span className="text-sm text-muted-foreground">
          — {t("rooms.live_studying_count", { count: studying.length })}
        </span>
      </div>

      {/* Studying members list */}
      <div className="flex flex-col gap-2.5">
        {studying.slice(0, 5).map((member) => {
          const timerStartedAt = (member as any).timer_started_at;
          let elapsedLabel = "";
          let elapsedMins = 0;

          if (timerStartedAt) {
            const elapsedMs = now - new Date(timerStartedAt).getTime();
            elapsedMins = Math.max(0, Math.floor(elapsedMs / 60000));
            const elapsedSecs = Math.max(0, Math.floor((elapsedMs % 60000) / 1000));
            if (elapsedMins >= 60) {
              const h = Math.floor(elapsedMins / 60);
              const m = elapsedMins % 60;
              elapsedLabel = `${h}h ${m}m`;
            } else {
              elapsedLabel = `${elapsedMins}m ${String(elapsedSecs).padStart(2, "0")}s`;
            }
          } else {
            const mins = Math.floor(member.total_seconds / 60) % 60;
            const hrs = Math.floor(member.total_seconds / 3600);
            elapsedLabel = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
          }

          // Progress ring (based on 25min cycle)
          const progressPercent = Math.min(100, (elapsedMins / 25) * 100);
          const statusText = (member as any).status_text;

          // About to finish check
          let isAboutToFinish = false;
          const commonDurations = [25, 45, 60, 90];
          for (const dur of commonDurations) {
            const remaining = dur - elapsedMins;
            if (remaining > 0 && remaining <= 2) {
              isAboutToFinish = true;
              break;
            }
          }

          return (
            <div key={member.id} className="flex items-center gap-2.5">
              {/* Avatar with circular progress */}
              <div className="relative">
                <svg className="absolute -inset-0.5" width="36" height="36" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
                  <circle
                    cx="18" cy="18" r="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="text-green-500"
                    strokeDasharray={`${progressPercent} ${100 - progressPercent}`}
                    strokeDashoffset="25"
                    style={{ transition: "stroke-dasharray 1s ease" }}
                  />
                </svg>
                <Avatar className="h-7 w-7 ring-2 ring-green-500/50">
                  {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                  <AvatarFallback className={cn("text-[10px] text-white", getAvatarColor(member.user_id))}>
                    {getInitials(member.display_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background animate-pulse" />
              </div>
              <span className="text-sm font-medium truncate flex-1">
                {member.display_name || t("rooms.anonymous")}
              </span>
              {statusText && (
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {statusText}
                </span>
              )}
              {isAboutToFinish && (
                <Badge variant="outline" className="text-[10px] border-yellow-500/50 text-yellow-600 animate-pulse px-1.5 py-0">
                  ⏳ {t("rooms.about_to_finish")}
                </Badge>
              )}
              <span className="text-xs font-mono text-muted-foreground tabular-nums">
                {elapsedLabel}
              </span>
            </div>
          );
        })}
        {studying.length > 5 && (
          <span className="text-xs text-muted-foreground pl-9">
            +{studying.length - 5} {t("rooms.more_studying")}
          </span>
        )}
      </div>

      {/* Join session CTA */}
      {hasFocusSession && onJoinSession && (
        <button
          onClick={onJoinSession}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Zap className="h-4 w-4" />
          {t("rooms.join_session")}
        </button>
      )}
    </div>
  );
}
