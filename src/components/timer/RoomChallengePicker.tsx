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

/**
 * Chip-card picker to choose which room challenge the current timer session
 * should count towards. Shown when the selected room has ≥ 1 active challenge
 * where the current user is a member.
 *
 * Escolha obrigatória. Auto-seleciona o 1º (ou o salvo em localStorage).
 * Persistência por sala em localStorage.
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
      <div className="flex items-center gap-1.5 px-0.5">
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

      {/* Chip-cards: horizontal scroll on mobile, grid on desktop */}
      <div
        className={cn(
          isSingle
            ? "grid grid-cols-1"
            : "flex overflow-x-auto snap-x snap-mandatory gap-2 -mx-1 px-1 pb-1 sm:grid sm:overflow-visible sm:grid-cols-2 sm:snap-none xl:grid-cols-3",
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

          return (
            <button
              key={c.challenge_id}
              type="button"
              onClick={() => handleChange(c.challenge_id)}
              className={cn(
                "group relative text-left rounded-lg border p-2.5 transition-all snap-start shrink-0",
                isSingle ? "w-full" : "min-w-[220px] w-[80%] sm:w-auto sm:min-w-0",
                isSelected
                  ? "border-primary/60 bg-primary/10 ring-2 ring-primary/40 shadow-sm"
                  : "border-border bg-card hover:bg-accent/40 opacity-80 hover:opacity-100",
              )}
              aria-pressed={isSelected}
            >
              {/* Top row: emoji + title + selected mark */}
              <div className="flex items-start gap-2 min-w-0">
                <span className="text-lg leading-none shrink-0 mt-0.5">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-sm font-semibold truncate",
                        isSelected ? "text-primary" : "text-foreground",
                      )}
                    >
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
              <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    done ? "bg-green-500" : isSelected ? "bg-primary" : "bg-primary/50",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
