import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trophy, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useRoomChallenges,
  useDeleteChallenge,
  RoomChallenge,
  RoomChallengeMember,
} from "@/hooks/useRoomChallenges";
import { useRoomTodayWindow } from "@/hooks/useRoomTodayWindow";
import { CreateChallengeDialog } from "./CreateChallengeDialog";
import { ChallengeCalendarModal } from "./ChallengeCalendarModal";
import { RoomChallengesMatrix } from "./RoomChallengesMatrix";

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
  const { data: todayWindow } = useRoomTodayWindow(roomId);
  const del = useDeleteChallenge();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<RoomChallenge | null>(null);
  const [calendarFor, setCalendarFor] = useState<{ c: RoomChallenge; m: RoomChallengeMember } | null>(null);

  if (isLoading) return null;

  const active = challenges.filter((c) => c.is_active);
  if (active.length === 0 && !isOwner) return null;

  const rolloverHours = todayWindow ? Math.floor(todayWindow.seconds_until_rollover / 3600) : 0;
  const rolloverMins = todayWindow ? Math.floor((todayWindow.seconds_until_rollover % 3600) / 60) : 0;

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

      {todayWindow && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 rounded-md px-2 py-1.5 border border-border/60">
          <Clock className="h-3 w-3 text-primary" />
          <span className="font-medium text-foreground">
            {t("rooms.challenges.room_day", { defaultValue: "Dia da sala" })}: {new Date(todayWindow.today_local).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
          </span>
          <span className="opacity-60">·</span>
          <Globe className="h-3 w-3" />
          <span>{todayWindow.timezone}</span>
          <span className="opacity-60">·</span>
          <span>
            {t("rooms.challenges.rollover_in", { defaultValue: "vira em" })} {rolloverHours}h{String(rolloverMins).padStart(2, "0")}
          </span>
        </div>
      )}


      {active.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{t("rooms.challenges.empty_owner")}</p>
      ) : (
        <RoomChallengesMatrix
          challenges={active}
          isOwner={isOwner}
          onEdit={(c) => { setEditing(c); setCreateOpen(true); }}
          onDelete={(c) => {
            if (confirm(t("rooms.challenges.delete_confirm"))) del.mutate({ id: c.challenge_id, roomId });
          }}
          onOpenMember={(c, m) => setCalendarFor({ c, m })}
        />
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

