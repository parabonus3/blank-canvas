import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Target, CheckCircle2, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRoomChallenges } from "@/hooks/useRoomChallenges";
import { cn } from "@/lib/utils";

interface Props {
  roomId?: string;
  value: string | null;
  onChange: (challengeId: string | null) => void;
}

function storageKey(roomId?: string) {
  return roomId ? `timezoni:room:${roomId}:challenge` : null;
}

type ChallengeState = "done" | "in_progress" | "not_started";

/**
 * Card picker to choose which room challenge the current timer session
 * should count towards. Stacks vertically on mobile (no horizontal scroll),
 * uses semantic colors for state (red / orange / green).
 */
export function RoomChallengePicker({ roomId, value, onChange }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: challenges = [] } = useRoomChallenges(
    roomId && roomId !== "none" ? roomId : undefined,
  );

  const mine = useMemo(
    () =>
      challenges
        .filter((c) => c.is_active && !c.is_ended && c.members.some((m) => m.user_id === user?.id))
        .sort((a, b) => (a.created_at < b.created_at ? -1 : 1)),
    [challenges, user?.id],
  );

  useEffect(() => {
    if (!roomId || roomId === "none" || mine.length === 0) {
      onChange(null);
      return;
    }
    const key = storageKey(roomId);
    const saved = key ? localStorage.getItem(key) : null;
    if (saved && mine.some((c) => c.challenge_id === saved)) {
      onChange(saved);
      return;
    }
    const first = mine[0].challenge_id;
    if (key) localStorage.setItem(key, first);
    onChange(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, mine.length]);

  if (!roomId || roomId === "none" || mine.length === 0) return null;

  const selected = value && mine.some((c) => c.challenge_id === value) ? value : mine[0]?.challenge_id;

  const handleChange = (v: string) => {
    const key = storageKey(roomId);
    if (key) localStorage.setItem(key, v);
    onChange(v);
  };

  const isSingle = mine.length === 1;

  return (
    <div className="space-y-1.5">
      {/* Header hint */}
      <div className="flex items-center gap-1.5 px-0.5 flex-wrap">
        <Target className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-medium text-foreground/80">
          {isSingle
            ? t("rooms.challenges.pick_hint_single", "Desafio desta sessão")
            : t("rooms.challenges.pick_hint_multi", "Escolha o desafio · {{n}} disponíveis", { n: mine.length })}
        </span>
        <span className="ml-auto text-[9px] font-semibold uppercase tracking-wide text-primary/80 border border-primary/30 rounded-sm px-1.5 py-0.5">
          {t("rooms.challenges.required_badge", "Obrigatório")}
        </span>
      </div>

      {/* Legend (only when multiple) */}
      {!isSingle && (
        <div className="flex items-center gap-2.5 px-0.5 text-[9.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500/70" />
            {t("rooms.challenges.legend_todo", "a fazer")}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500/80" />
            {t("rooms.challenges.legend_progress", "em andamento")}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500/80" />
            {t("rooms.challenges.legend_done_short", "feito")}
          </span>
        </div>
      )}

      {/* Stacked grid: no horizontal scroll on mobile */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {mine.map((c) => {
          const me = c.members.find((m) => m.user_id === user?.id);
          const done = !!me?.completed_current;
          const targetSec = c.target_minutes * 60;
          const seconds = me?.seconds_current || 0;
          const pct = Math.min(100, Math.round((seconds / targetSec) * 100));
          const remaining = Math.max(0, targetSec - seconds);
          const rMin = Math.ceil(remaining / 60);
          const isSelected = c.challenge_id === selected;

          const state: ChallengeState = done
            ? "done"
            : seconds > 0
              ? "in_progress"
              : "not_started";

          const stateClasses =
            state === "done"
              ? "border-green-500/70 bg-green-500/10"
              : state === "in_progress"
                ? "border-orange-500/70 bg-orange-500/5"
                : "border-red-500/50 bg-red-500/5";

          const barClass =
            state === "done"
              ? "bg-green-500"
              : state === "in_progress"
                ? "bg-orange-500"
                : "bg-red-500/40";

          return (
            <button
              key={c.challenge_id}
              type="button"
              onClick={() => handleChange(c.challenge_id)}
              className={cn(
                "group relative text-left rounded-lg border-2 p-2 transition-all",
                stateClasses,
                isSelected
                  ? "ring-2 ring-primary/50 shadow-sm"
                  : "opacity-90 hover:opacity-100",
              )}
              aria-pressed={isSelected}
            >
              {/* Top row: emoji + title + selected mark */}
              <div className="flex items-start gap-2 min-w-0">
                <span className="text-base leading-none shrink-0 mt-0.5">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold truncate text-foreground">
                      {c.title}
                    </span>
                    {done && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                    {done
                      ? t("rooms.challenges.done_short", "feito")
                      : t("rooms.challenges.remaining_min_short", "faltam {{n}}min", { n: rMin })}
                    <span className="opacity-60"> · {Math.floor(seconds / 60)}/{c.target_minutes}m</span>
                  </div>
                </div>
                {isSelected && (
                  <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary bg-primary/15 rounded px-1.5 py-0.5">
                    <Check className="h-2.5 w-2.5" />
                    {t("rooms.challenges.selected_badge", "Selecionado")}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full transition-all", barClass)}
                  style={{ width: `${done ? 100 : pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
