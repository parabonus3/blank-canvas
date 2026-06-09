import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMemberChallengeCalendar, RoomChallenge } from "@/hooks/useRoomChallenges";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: RoomChallenge;
  userId: string;
  displayName: string | null;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function ChallengeCalendarModal({ open, onOpenChange, challenge, userId, displayName }: Props) {
  const { t } = useTranslation();

  const { from, to, days } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 41); // ~6 weeks
    const days: Date[] = [];
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return { from: isoDate(start), to: isoDate(today), days };
  }, [open]);

  const { data: progress = [] } = useMemberChallengeCalendar(
    open ? challenge.challenge_id : undefined,
    userId,
    from,
    to,
  );

  const progressByDate = useMemo(() => {
    const m = new Map<string, { seconds: number; completed: boolean }>();
    for (const p of progress) {
      m.set(p.period_start, { seconds: p.seconds_in_period, completed: p.completed });
    }
    return m;
  }, [progress]);

  const startDate = new Date(challenge.start_date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span>{challenge.emoji}</span>
            <span className="truncate">{displayName || t("rooms.challenges.member")}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {challenge.title} · {challenge.target_minutes} {t("rooms.challenges.min_per_period_short")}
          </p>

          <div className="grid grid-cols-7 gap-1.5">
            {["S","T","Q","Q","S","S","D"].map((l, i) => (
              <div key={i} className="text-[10px] text-center text-muted-foreground">{l}</div>
            ))}
            {days.map((d) => {
              const key = isoDate(d);
              const p = progressByDate.get(key);
              const before = d < startDate;
              const completed = p?.completed;
              const partial = !completed && (p?.seconds || 0) > 0;
              return (
                <div
                  key={key}
                  title={`${key} — ${p ? Math.round((p.seconds / 60)) + "min" : (before ? "—" : t("rooms.challenges.missed"))}`}
                  className={cn(
                    "aspect-square rounded-md border text-[10px] flex items-center justify-center",
                    before && "bg-muted/30 border-border/50 text-muted-foreground/40",
                    !before && completed && "bg-green-500/80 border-green-600 text-white",
                    !before && partial && "bg-amber-500/60 border-amber-600 text-white",
                    !before && !p && "bg-red-500/15 border-red-500/30 text-red-600",
                  )}
                >
                  {d.getDate()}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/80 inline-block" /> {t("rooms.challenges.legend_done")}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/60 inline-block" /> {t("rooms.challenges.legend_partial")}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/15 border border-red-500/30 inline-block" /> {t("rooms.challenges.legend_missed")}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
