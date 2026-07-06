import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Target, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRoomChallenges } from "@/hooks/useRoomChallenges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  roomId?: string;
  value: string | null;
  onChange: (challengeId: string | null) => void;
}

const NONE = "__none__";

function storageKey(roomId?: string) {
  return roomId ? `timezoni:room:${roomId}:challenge` : null;
}

/**
 * Compact picker to choose which room challenge the current timer session
 * should count towards. Only shown when the selected room has ≥ 1 active
 * challenge where the current user is a member.
 *
 * - Auto-selects the only challenge when there's exactly one (unless the user
 *   explicitly chose "none" before).
 * - Persists the last choice per room in localStorage.
 */
export function RoomChallengePicker({ roomId, value, onChange }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: challenges = [] } = useRoomChallenges(
    roomId && roomId !== "none" ? roomId : undefined,
  );

  const mine = useMemo(
    () =>
      challenges.filter(
        (c) => c.is_active && c.members.some((m) => m.user_id === user?.id),
      ),
    [challenges, user?.id],
  );

  // Hydrate from localStorage / auto-select on room change
  useEffect(() => {
    if (!roomId || roomId === "none") {
      onChange(null);
      return;
    }
    const key = storageKey(roomId);
    const saved = key ? localStorage.getItem(key) : null;

    if (mine.length === 0) {
      onChange(null);
      return;
    }
    if (saved === NONE) {
      onChange(null);
      return;
    }
    if (saved && mine.some((c) => c.challenge_id === saved)) {
      onChange(saved);
      return;
    }
    // Auto-pick when a single active challenge exists
    if (mine.length === 1) {
      onChange(mine[0].challenge_id);
      return;
    }
    // Multiple challenges + no saved preference: leave as-is (null → user picks)
    onChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, mine.length]);

  if (!roomId || roomId === "none" || mine.length === 0) return null;

  const selected = value && mine.some((c) => c.challenge_id === value) ? value : NONE;

  const handleChange = (v: string) => {
    const key = storageKey(roomId);
    if (v === NONE) {
      if (key) localStorage.setItem(key, NONE);
      onChange(null);
    } else {
      if (key) localStorage.setItem(key, v);
      onChange(v);
    }
  };

  return (
    <div className="space-y-1">
      <Select value={selected} onValueChange={handleChange}>
        <SelectTrigger className="h-10 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Target className="h-4 w-4 text-primary shrink-0" />
            <SelectValue placeholder={t("rooms.challenges.pick_for_session", "Contar para qual desafio?")} />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>
            <span className="text-muted-foreground">
              {t("rooms.challenges.no_challenge", "Nenhum (não contar em desafios)")}
            </span>
          </SelectItem>
          {mine.map((c) => {
            const me = c.members.find((m) => m.user_id === user?.id);
            const done = !!me?.completed_current;
            const remaining = Math.max(0, c.target_minutes * 60 - (me?.seconds_current || 0));
            const rMin = Math.ceil(remaining / 60);
            return (
              <SelectItem key={c.challenge_id} value={c.challenge_id}>
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">{c.emoji}</span>
                  <span className="truncate max-w-[180px]">{c.title}</span>
                  {done ? (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      {t("rooms.challenges.done_short", "feito")}
                    </span>
                  ) : (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      {t("rooms.challenges.remaining_min_short", "faltam {{n}}min", { n: rMin })}
                    </span>
                  )}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
