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
 * should count towards. 2 columns on mobile (no horizontal scroll),
 * scales up to 3/4 cols on larger screens. Selected card has strong
 * primary ring + bottom SELECTED bar; state color (red/orange/green)
 * remains visible via the card border.
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
    <div className="space-y-2">
      {/* Header + legend row */}
      <div className="sm:flex sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 px-0.5 flex-wrap">
          <Target className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-medium text-foreground/80">
            {isSingle
              ? t("rooms.challenges.pick_hint_single", "Desafio desta sessão")
              : t("rooms.challenges.pick_hint_multi", "Escolha o desafio · {{n}} disponíveis", { n: mine.length })}
          </span>
          <span className="ml-auto sm:ml-0 text-[9px] font-semibold uppercase tracking-wide text-primary/80 border border-primary/30 rounded-sm px-1.5 py-0.5">
            {t("rooms.challenges.required_badge", "Obrigatório")}
          </span>
        </div>

        {!isSingle && (
          <div className="flex items-center gap-2.5 px-0.5 mt-1 sm:mt-0 text-[10px] text-muted-foreground flex-wrap">
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
      </div>

      {/* Grid: 2 cols on mobile, no horizontal scroll */}
      <div
        className={cn(
          "grid gap-1.5 sm:gap-2",
          isSingle ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        )}
      >
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

          // Base state classes (border color + bg)
          const stateBorderSelected =
            state === "done"
              ? "border-green-500"
              : state === "in_progress"
                ? "border-orange-500"
                : "border-red-500";

          const stateBorderIdle =
            state === "done"
              ? "border-green-500/50"
              : state === "in_progress"
                ? "border-orange-500/50"
                : "border-red-500/40";

          const stateBg =
            state === "done"
              ? "bg-green-500/10"
              : state === "in_progress"
                ? "bg-orange-500/5"
                : "bg-red-500/5";

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
              aria-pressed={isSelected}
              className={cn(
                "group relative text-left rounded-lg p-2 min-h-[112px] flex flex-col",
                "transition-all duration-200",
                stateBg,
                isSelected
                  ? cn(
                      "border-2 opacity-100 scale-[1.02]",
                      stateBorderSelected,
                      "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      "shadow-lg shadow-primary/20",
                      "pb-6", // room for bottom SELECTED bar
                    )
                  : cn(
                      "border opacity-70 hover:opacity-100",
                      stateBorderIdle,
                      "hover:" + stateBorderSelected,
                    ),
              )}
            >
              {/* Row 1: emoji + done icon */}
              <div className="flex items-start justify-between gap-1">
                <span className="text-xl leading-none">{c.emoji}</span>
                {done && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                )}
              </div>

              {/* Title */}
              <div className="mt-1 text-xs font-semibold leading-tight line-clamp-2 text-foreground">
                {c.title}
              </div>

              {/* Progress text */}
              <div className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
                <span className="tabular-nums">{Math.floor(seconds / 60)}/{c.target_minutes}m</span>
                <span className="opacity-70">
                  {" · "}
                  {done
                    ? t("rooms.challenges.done_short", "feito")
                    : t("rooms.challenges.remaining_min_short", "faltam {{n}}min", { n: rMin })}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-auto pt-1.5">
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full transition-all", barClass)}
                    style={{ width: `${done ? 100 : pct}%` }}
                  />
                </div>
              </div>

              {/* SELECTED bottom bar */}
              {isSelected && (
                <div className="absolute inset-x-0 bottom-0 bg-primary text-primary-foreground text-[9px] font-bold tracking-wider uppercase py-1 rounded-b-md flex items-center justify-center gap-1">
                  <Check className="h-2.5 w-2.5" />
                  {t("rooms.challenges.selected_badge", "Selecionado")}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
