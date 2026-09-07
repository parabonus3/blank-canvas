import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  duelDaysLeft,
  isDuelOver,
  useCancelDuel,
  useDuelScoreboard,
  useFinishDuel,
  useRespondDuel,
  type Duel,
} from "@/hooks/useDuels";
import { cn } from "@/lib/utils";
import { Check, Crown, Swords, Trash2, X } from "lucide-react";

function formatHm(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function DuelCard({ duel }: { duel: Duel }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isChallenger = duel.challenger_id === user?.id;
  const showScores = duel.status === "active" || duel.status === "finished";
  const { data: scores = [] } = useDuelScoreboard(showScores ? duel.id : null);
  const respond = useRespondDuel();
  const cancel = useCancelDuel();
  const finish = useFinishDuel();

  const me = scores.find((s) => s.user_id === user?.id);
  const other = scores.find((s) => s.user_id !== user?.id);
  const targetSeconds = duel.target_minutes * 60;

  // Encerra automaticamente quando o período acabou (apenas o desafiante grava o resultado).
  useEffect(() => {
    if (duel.status !== "active" || !isDuelOver(duel) || !isChallenger) return;
    if (scores.length < 2 || finish.isPending) return;
    const [a, b] = scores;
    const winnerId = a.seconds === b.seconds ? null : a.seconds > b.seconds ? a.user_id : b.user_id;
    finish.mutate({ duelId: duel.id, winnerId });
  }, [duel, isChallenger, scores, finish]);

  const daysLeft = duelDaysLeft(duel);

  return (
    <div
      className={cn(
        "rounded-2xl border p-3 space-y-3",
        duel.status === "active"
          ? "border-primary/40 bg-primary/5"
          : duel.status === "finished"
            ? "border-border bg-muted/30"
            : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate flex items-center gap-1.5">
            <Swords className="h-3.5 w-3.5 text-primary shrink-0" />
            {duel.title || t("duels.default_title")}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t("duels.target_summary", { hours: (duel.target_minutes / 60).toFixed(0) })}
            {duel.status === "active" && ` · ${t("duels.days_left", { count: daysLeft })}`}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
            duel.status === "active"
              ? "border-success/40 bg-success/10 text-success"
              : duel.status === "pending"
                ? "border-warning/40 bg-warning/10 text-warning"
                : "border-border bg-muted text-muted-foreground",
          )}
        >
          {t(`duels.status_${duel.status}`)}
        </span>
      </div>

      {/* Convite recebido */}
      {duel.status === "pending" && !isChallenger && (
        <div className="flex gap-1.5">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => respond.mutate({ duelId: duel.id, accept: true })}
            disabled={respond.isPending}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            {t("duels.accept")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => respond.mutate({ duelId: duel.id, accept: false })}
            disabled={respond.isPending}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            {t("duels.decline")}
          </Button>
        </div>
      )}

      {duel.status === "pending" && isChallenger && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">{t("duels.waiting_answer")}</p>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => cancel.mutate(duel.id)}
            disabled={cancel.isPending}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {t("duels.cancel")}
          </Button>
        </div>
      )}

      {/* Placar */}
      {showScores && (
        <div className="space-y-2">
          {[me, other].map((s, i) =>
            s ? (
              <ScoreRow
                key={s.user_id}
                name={i === 0 ? t("duels.you") : s.display_name || t("rooms.anonymous")}
                avatarUrl={s.avatar_url}
                seconds={s.seconds}
                targetSeconds={targetSeconds}
                leading={!!me && !!other && s.seconds >= Math.max(me.seconds, other.seconds) && me.seconds !== other.seconds}
                winner={duel.status === "finished" && duel.winner_id === s.user_id}
              />
            ) : null,
          )}
          {duel.status === "finished" && (
            <p className="text-[11px] font-medium text-center text-muted-foreground">
              {duel.winner_id == null
                ? t("duels.result_tie")
                : duel.winner_id === user?.id
                  ? t("duels.result_win")
                  : t("duels.result_loss")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreRow({
  name,
  avatarUrl,
  seconds,
  targetSeconds,
  leading,
  winner,
}: {
  name: string;
  avatarUrl: string | null;
  seconds: number;
  targetSeconds: number;
  leading: boolean;
  winner: boolean;
}) {
  const pct = targetSeconds > 0 ? Math.min(100, (seconds / targetSeconds) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7">
          {avatarUrl && <AvatarImage src={avatarUrl} />}
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium truncate flex-1 flex items-center gap-1">
          {name}
          {winner && <Crown className="h-3 w-3 text-warning shrink-0" />}
        </span>
        <span className="text-xs font-mono tabular-nums font-bold shrink-0">{formatHm(seconds)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", leading ? "bg-success" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
