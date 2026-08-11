import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RoomChallengeHistoryItem, RoomChallengeHistoryMember } from "@/hooks/useRoomChallenges";
import { ChallengeCalendarModal } from "./ChallengeCalendarModal";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: RoomChallengeHistoryItem;
}

function fmtDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}m` : `${m}m`;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function RoomChallengeRankingModal({ open, onOpenChange, challenge }: Props) {
  const { t, i18n } = useTranslation();
  const [calendarFor, setCalendarFor] = useState<RoomChallengeHistoryMember | null>(null);

  const { ranked, absent } = useMemo(() => {
    const list = [...(challenge.members || [])].sort(
      (a, b) => b.completed_periods - a.completed_periods || b.total_seconds - a.total_seconds,
    );
    return {
      ranked: list.filter((m) => m.total_seconds > 0 || m.completed_periods > 0),
      absent: list.filter((m) => m.total_seconds === 0 && m.completed_periods === 0),
    };
  }, [challenge.members]);

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" }).format(
      new Date(`${iso}T12:00:00`),
    );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-base">
              <span>{challenge.emoji}</span>
              <span className="truncate">{challenge.title}</span>
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground text-left">
              {fmtDate(challenge.start_date)} – {fmtDate(challenge.end_date)} ·{" "}
              {challenge.target_minutes}
              {t("rooms.challenges.min_per_period_short")} ·{" "}
              {challenge.period_type === "weekly"
                ? t("rooms.challenges.period_weekly")
                : t("rooms.challenges.period_daily")}
            </p>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh]">
            <div className="p-3 space-y-1.5">
              {ranked.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  {t("rooms.challenges.history_no_data", "Ninguém registrou tempo neste desafio.")}
                </p>
              )}

              {ranked.map((m, i) => {
                const pct = Math.min(
                  100,
                  Math.round((m.completed_periods / Math.max(1, challenge.total_periods)) * 100),
                );
                const barClass =
                  pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-orange-500" : "bg-red-500/70";
                return (
                  <button
                    key={m.user_id}
                    type="button"
                    onClick={() => setCalendarFor(m)}
                    className={cn(
                      "w-full text-left rounded-lg border border-border bg-card p-2.5 flex items-center gap-2.5",
                      "hover:border-primary/40 transition-colors",
                      i === 0 && "border-amber-500/50 bg-amber-500/5",
                    )}
                  >
                    <span className="w-6 text-center text-sm font-bold text-muted-foreground shrink-0">
                      {MEDALS[i] ?? i + 1}
                    </span>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={m.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {(m.display_name || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold truncate">
                          {m.display_name || t("rooms.challenges.member")}
                        </span>
                        <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
                          {fmtDuration(m.total_seconds)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full transition-all", barClass)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
                          {m.completed_periods}/{challenge.total_periods} · {pct}%
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {absent.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 px-1 pb-1">
                    {t("rooms.challenges.history_absent", "Não participaram")} · {absent.length}
                  </p>
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {absent.map((m) => (
                      <span
                        key={m.user_id}
                        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 pl-1 pr-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={m.avatar_url || undefined} />
                          <AvatarFallback className="text-[7px]">
                            {(m.display_name || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[90px]">
                          {m.display_name || t("rooms.challenges.member")}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {calendarFor && (
        <ChallengeCalendarModal
          open={!!calendarFor}
          onOpenChange={(o) => !o && setCalendarFor(null)}
          challenge={challenge}
          userId={calendarFor.user_id}
          displayName={calendarFor.display_name}
          range={{ from: challenge.start_date, to: challenge.end_date }}
        />
      )}
    </>
  );
}
