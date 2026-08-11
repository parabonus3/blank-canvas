import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Archive, ChevronDown, BarChart3 } from "lucide-react";
import { useRoomChallengeHistory, type RoomChallengeHistoryItem } from "@/hooks/useRoomChallenges";
import { RoomChallengeRankingModal } from "./RoomChallengeRankingModal";
import { cn } from "@/lib/utils";

interface Props {
  roomId: string;
}

function fmtHours(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}m` : `${m}m`;
}

export function RoomChallengeHistoryCard({ roomId }: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<RoomChallengeHistoryItem | null>(null);
  const { data: history = [] } = useRoomChallengeHistory(roomId);

  if (history.length === 0) return null;

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" }).format(
      new Date(`${iso}T12:00:00`),
    );

  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
      >
        <Archive className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold text-foreground/90">
          {t("rooms.challenges.history_title", "Desafios encerrados")}
        </span>
        <span className="text-[10px] font-bold rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground tabular-nums">
          {history.length}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground ml-auto transition-transform shrink-0",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="p-2 pt-0 space-y-1.5">
          {history.map((c) => {
            const totalSeconds = c.members.reduce((s, m) => s + m.total_seconds, 0);
            const participants = c.members.filter((m) => m.total_seconds > 0).length;
            const avgPct = c.members.length
              ? Math.round(
                  (c.members.reduce(
                    (s, m) => s + m.completed_periods / Math.max(1, c.total_periods),
                    0,
                  ) /
                    c.members.length) *
                    100,
                )
              : 0;

            return (
              <button
                key={c.challenge_id}
                type="button"
                onClick={() => setSelected(c)}
                className="w-full text-left rounded-lg border border-border bg-card p-2.5 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg leading-none shrink-0">{c.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-semibold truncate">{c.title}</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wide rounded-sm border border-border px-1 py-0.5 text-muted-foreground shrink-0">
                        {t("rooms.challenges.ended_badge")}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {fmtDate(c.start_date)} – {fmtDate(c.end_date)} · {c.target_minutes}
                      {t("rooms.challenges.min_per_period_short")}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                      {t("rooms.challenges.history_summary", {
                        total: fmtHours(totalSeconds),
                        people: participants,
                        pct: avgPct,
                        defaultValue: "{{total}} no total · {{people}} participaram · {{pct}}% de conclusão média",
                      })}
                    </p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {t("rooms.challenges.history_view_ranking", "Ver ranking")}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <RoomChallengeRankingModal
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          challenge={selected}
        />
      )}
    </div>
  );
}
