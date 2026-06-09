import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trophy, Pencil, Trash2, Target, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  useRoomChallenges,
  useDeleteChallenge,
  RoomChallenge,
  RoomChallengeMember,
} from "@/hooks/useRoomChallenges";
import { CreateChallengeDialog } from "./CreateChallengeDialog";
import { ChallengeCalendarModal } from "./ChallengeCalendarModal";
import { AvatarFlair } from "@/components/avatar/AvatarFlair";

interface Props {
  roomId: string;
  isOwner: boolean;
}

function memberStatus(m: RoomChallengeMember, t: (k: string, opts?: any) => string) {
  if (m.completed_current) {
    return { label: t("rooms.challenges.status_on_track"), color: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" };
  }
  if (m.completed_periods_total === 0) {
    return { label: t("rooms.challenges.status_not_started"), color: "bg-muted text-muted-foreground border-border" };
  }
  const days = m.days_since_completed ?? 0;
  if (days <= 1) return { label: t("rooms.challenges.status_missed_short", { count: days }), color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" };
  return { label: t("rooms.challenges.status_missed_days", { count: days }), color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" };
}

export function RoomChallengesCard({ roomId, isOwner }: Props) {
  const { t } = useTranslation();
  const { data: challenges = [], isLoading } = useRoomChallenges(roomId);
  const del = useDeleteChallenge();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<RoomChallenge | null>(null);
  const [calendarFor, setCalendarFor] = useState<{ c: RoomChallenge; m: RoomChallengeMember } | null>(null);

  if (isLoading) return null;

  const active = challenges.filter((c) => c.is_active);
  if (active.length === 0 && !isOwner) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold truncate">{t("rooms.challenges.section_title")}</h3>
        </div>
        {isOwner && (
          <Button size="sm" variant="outline" onClick={() => { setEditing(null); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{t("rooms.challenges.new")}</span>
          </Button>
        )}
      </div>

      {active.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{t("rooms.challenges.empty_owner")}</p>
      ) : (
        <div className="space-y-4">
          {active.map((c) => (
            <ChallengeRow
              key={c.challenge_id}
              c={c}
              isOwner={isOwner}
              onEdit={() => { setEditing(c); setCreateOpen(true); }}
              onDelete={() => {
                if (confirm(t("rooms.challenges.delete_confirm"))) del.mutate({ id: c.challenge_id, roomId });
              }}
              onOpenMember={(m) => setCalendarFor({ c, m })}
            />
          ))}
        </div>
      )}

      <CreateChallengeDialog open={createOpen} onOpenChange={setCreateOpen} roomId={roomId} editing={editing} />
      {calendarFor && (
        <ChallengeCalendarModal
          open={!!calendarFor}
          onOpenChange={(o) => !o && setCalendarFor(null)}
          challenge={calendarFor.c}
          userId={calendarFor.m.user_id}
          displayName={calendarFor.m.display_name}
        />
      )}
    </div>
  );
}

function ChallengeRow({
  c, isOwner, onEdit, onDelete, onOpenMember,
}: {
  c: RoomChallenge;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenMember: (m: RoomChallengeMember) => void;
}) {
  const { t } = useTranslation();
  const completed = c.members.filter((m) => m.completed_current).length;
  const totalMembers = c.members.length;
  const pctMembers = totalMembers > 0 ? (completed / totalMembers) * 100 : 0;
  const targetSeconds = c.target_minutes * 60;
  const periodLabel = c.period_type === "daily" ? t("rooms.challenges.period_daily_short") : t("rooms.challenges.period_weekly_short");

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-xl shrink-0">{c.emoji}</span>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{c.title}</p>
            <p className="text-xs text-muted-foreground">
              {periodLabel} · {c.target_minutes} {t("rooms.challenges.min_per_period_short")}
              {c.duration_days ? ` · ${c.duration_days}d` : ""}
            </p>
            {c.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
          </div>
        </div>
        {isOwner && (
          <div className="flex gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {t("rooms.challenges.completed_today", { done: completed, total: totalMembers })}
          </span>
          <span className="font-medium tabular-nums">{pctMembers.toFixed(0)}%</span>
        </div>
        <Progress value={pctMembers} className="h-1.5" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {c.members.map((m) => {
          const st = memberStatus(m, t);
          const pct = Math.min(100, (m.seconds_current / targetSeconds) * 100);
          return (
            <button
              key={m.user_id}
              onClick={() => onOpenMember(m)}
              className="flex items-center gap-2 rounded-md border border-border bg-card p-2 text-left hover:bg-accent transition-colors"
            >
              <AvatarFlair tier="free" flairId={m.avatar_flair}>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={m.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {(m.display_name || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </AvatarFlair>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-medium truncate">{m.display_name || "—"}</p>
                  {m.completed_periods_total > 0 && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                      <Flame className="h-2.5 w-2.5" />{m.completed_periods_total}
                    </span>
                  )}
                </div>
                <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full transition-all", m.completed_current ? "bg-green-500" : "bg-primary")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={cn("inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] border", st.color)}>
                  {st.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
