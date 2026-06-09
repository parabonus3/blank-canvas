import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Target, X, CheckCircle2 } from "lucide-react";
import { useRoomChallenges } from "@/hooks/useRoomChallenges";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface Props {
  roomId?: string;
}

function fmtMin(seconds: number) {
  const m = Math.max(0, Math.floor(seconds / 60));
  return `${m}min`;
}

export function RoomChallengeBanner({ roomId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: challenges = [] } = useRoomChallenges(roomId && roomId !== "none" ? roomId : undefined);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const showAlerts = (profile as any)?.show_room_challenge_alerts ?? true;

  const active = useMemo(
    () => challenges.filter((c) => c.is_active && !dismissedIds.includes(c.challenge_id)),
    [challenges, dismissedIds],
  );

  if (!roomId || roomId === "none" || !user || !showAlerts || active.length === 0) return null;

  return (
    <div className="space-y-2">
      {active.map((c) => {
        const me = c.members.find((m) => m.user_id === user.id);
        const seconds = me?.seconds_current || 0;
        const targetSec = c.target_minutes * 60;
        const completed = !!me?.completed_current;
        const remainingSec = Math.max(0, targetSec - seconds);
        const pct = Math.min(100, (seconds / targetSec) * 100);

        return (
          <div
            key={c.challenge_id}
            className={cn(
              "rounded-lg border p-2.5 sm:p-3 flex items-center gap-2.5 text-xs sm:text-sm",
              completed
                ? "border-green-500/40 bg-green-500/10"
                : "border-primary/30 bg-primary/5",
            )}
          >
            <span className="text-base shrink-0">{c.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                {completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                ) : (
                  <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
                <span className="font-medium truncate">
                  {completed
                    ? t("rooms.challenges.banner_done", { title: c.title })
                    : t("rooms.challenges.banner_remaining", { remaining: fmtMin(remainingSec), title: c.title })}
                </span>
              </div>
              {!completed && (
                <div className="mt-1.5">
                  <Progress value={pct} className="h-1" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDismissedIds((p) => [...p, c.challenge_id])}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
