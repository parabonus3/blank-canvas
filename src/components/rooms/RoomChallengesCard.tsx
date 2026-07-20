import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

function shortTz(tz: string): string {
  if (!tz) return "";
  const parts = tz.split("/");
  return (parts[parts.length - 1] || tz).replace(/_/g, " ");
}
import { useQuery } from "@tanstack/react-query";
import { Plus, Trophy, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  useRoomChallenges,
  useDeleteChallenge,
  RoomChallenge,
  RoomChallengeMember,
} from "@/hooks/useRoomChallenges";
import { useRoomTodayWindow } from "@/hooks/useRoomTodayWindow";
import { CreateChallengeDialog } from "./CreateChallengeDialog";
import { ChallengeCalendarModal } from "./ChallengeCalendarModal";
import { RoomChallengesMatrix, type MatrixMemberExtra } from "./RoomChallengesMatrix";
import { MemberProfileModal } from "./MemberProfileModal";
import type { RoomMember } from "@/hooks/useRoomMembers";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  roomId: string;
  isOwner: boolean;
  members?: RoomMember[];
}

export function RoomChallengesCard({ roomId, isOwner, members = [] }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: challenges = [], isLoading } = useRoomChallenges(roomId);
  const { data: todayWindow } = useRoomTodayWindow(roomId);
  const del = useDeleteChallenge();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<RoomChallenge | null>(null);
  const [calendarFor, setCalendarFor] = useState<{ c: RoomChallenge; m: RoomChallengeMember } | null>(null);
  const [profileMember, setProfileMember] = useState<RoomMember | null>(null);

  // All-time totals from time_entries (source of truth for level titles).
  const { data: allTimeTotals } = useQuery({
    queryKey: ["roomAllTimeTotalsMap", roomId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_room_ranking_by_period", {
        _room_id: roomId,
        _period: "all",
      });
      if (error) throw error;
      const map = new Map<string, number>();
      for (const r of (data || []) as { user_id: string; total_seconds: number }[]) {
        map.set(r.user_id, Number(r.total_seconds || 0));
      }
      return map;
    },
    enabled: !!roomId,
    staleTime: 60_000,
  });

  // Weekly totals used by the matrix "Semana" sort toggle.
  // Shares cache key with RoomRankingSidebar so no extra request is made.
  const { data: weekRanking } = useQuery({
    queryKey: ["roomRanking", roomId, "week"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_room_ranking_by_period", {
        _room_id: roomId,
        _period: "week",
      });
      if (error) throw error;
      return (data || []) as { user_id: string; total_seconds: number }[];
    },
    enabled: !!roomId,
    refetchInterval: 60000,
  });

  const weekTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of (Array.isArray(weekRanking) ? weekRanking : [])) {
      map.set(r.user_id, Number(r.total_seconds || 0));
    }
    return map;
  }, [weekRanking]);

  const memberExtras = useMemo(() => {
    const map = new Map<string, MatrixMemberExtra>();
    for (const m of members) {
      const trueTotal = allTimeTotals?.get(m.user_id);
      map.set(m.user_id, {
        plan_tier: (m as any).plan_tier,
        is_timer_active: m.is_timer_active,
        last_active_at: m.last_active_at,
        is_online: m.is_online,
        total_seconds: typeof trueTotal === "number" ? trueTotal : m.total_seconds,
        status_text: m.status_text,
        role: m.role,
        avatar_flair_color: (m as any).avatar_flair_color,
      });
    }
    return map;
  }, [members, allTimeTotals]);

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
          memberExtras={memberExtras}
          weekTotals={weekTotals}
          currentUserId={user?.id ?? null}
          onOpenProfile={(userId) => {
            const found = members.find((m) => m.user_id === userId) || null;
            if (found) setProfileMember(found);
          }}
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
      <MemberProfileModal
        open={!!profileMember}
        onOpenChange={(o) => !o && setProfileMember(null)}
        member={profileMember}
        roomId={roomId}
        totalMembers={members.length}
      />
    </div>
  );
}
