import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Flame, Search, ChevronDown, HelpCircle, CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AvatarFlair } from "@/components/avatar/AvatarFlair";
import { cn } from "@/lib/utils";
import type { RoomChallenge, RoomChallengeMember } from "@/hooks/useRoomChallenges";

interface Props {
  challenges: RoomChallenge[];
  isOwner: boolean;
  onEdit: (c: RoomChallenge) => void;
  onDelete: (c: RoomChallenge) => void;
  onOpenMember: (c: RoomChallenge, m: RoomChallengeMember) => void;
}

type Filter = "all" | "done_today" | "missing" | "not_started";

// -----------------------------------------------------------------------------
// Cell status helpers
// -----------------------------------------------------------------------------

function memberChallengeStatus(m: RoomChallengeMember) {
  if (m.completed_current) return "done" as const;
  if ((m.seconds_current || 0) > 0) return "in_progress" as const;
  const days = m.days_since_completed ?? 0;
  if (m.completed_periods_total > 0 && days >= 2) return "at_risk" as const;
  return "not_started" as const;
}

function StatusIcon({ status, className }: { status: ReturnType<typeof memberChallengeStatus>; className?: string }) {
  const base = cn("h-3.5 w-3.5 shrink-0", className);
  if (status === "done") return <CheckCircle2 className={cn(base, "text-green-500")} />;
  if (status === "in_progress") return <Clock className={cn(base, "text-primary")} />;
  if (status === "at_risk") return <AlertTriangle className={cn(base, "text-amber-500")} />;
  return <Circle className={cn(base, "text-muted-foreground/60")} />;
}

// -----------------------------------------------------------------------------
// Public component
// -----------------------------------------------------------------------------

export function RoomChallengesMatrix({ challenges, isOwner, onEdit, onDelete, onOpenMember }: Props) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  // Union of members across all challenges (some members might only appear in some).
  const memberIndex = useMemo(() => {
    const map = new Map<string, { user_id: string; display_name: string | null; avatar_url: string | null; avatar_flair: string | null }>();
    for (const c of challenges) {
      for (const m of c.members) {
        if (!map.has(m.user_id)) {
          map.set(m.user_id, {
            user_id: m.user_id,
            display_name: m.display_name,
            avatar_url: m.avatar_url,
            avatar_flair: m.avatar_flair,
          });
        }
      }
    }
    return map;
  }, [challenges]);

  // For each member, the map of challenge_id → member data (or null)
  type Row = {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    avatar_flair: string | null;
    doneToday: number;
    totalSecondsToday: number;
    perChallenge: Map<string, RoomChallengeMember | null>;
  };

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = [];
    for (const base of memberIndex.values()) {
      const per = new Map<string, RoomChallengeMember | null>();
      let doneToday = 0;
      let totalSecondsToday = 0;
      for (const c of challenges) {
        const m = c.members.find((mm) => mm.user_id === base.user_id) || null;
        per.set(c.challenge_id, m);
        if (m?.completed_current) doneToday += 1;
        if (m?.seconds_current) totalSecondsToday += m.seconds_current;
      }
      list.push({ ...base, doneToday, totalSecondsToday, perChallenge: per });
    }
    return list;
  }, [challenges, memberIndex]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => (q ? (r.display_name || "").toLowerCase().includes(q) : true))
      .filter((r) => {
        if (filter === "all") return true;
        if (filter === "done_today") return r.doneToday > 0;
        if (filter === "missing")
          return r.doneToday < challenges.length && r.totalSecondsToday > 0;
        if (filter === "not_started") return r.totalSecondsToday === 0;
        return true;
      })
      .sort((a, b) => {
        if (b.doneToday !== a.doneToday) return b.doneToday - a.doneToday;
        return b.totalSecondsToday - a.totalSecondsToday;
      });
  }, [rows, filter, search, challenges.length]);

  const showSearch = memberIndex.size > 10;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {(["all", "done_today", "missing", "not_started"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "text-[11px] px-2 py-1 rounded-md border transition-colors",
                  filter === f
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-background border-border hover:bg-accent text-muted-foreground",
                )}
              >
                {t(`rooms.challenges.filter_${f}`, defaultFilterLabel(f))}
              </button>
            ))}
          </div>
          {showSearch && (
            <div className="relative ml-auto w-full sm:w-56">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("rooms.challenges.search_member", "Buscar membro…")}
                className="pl-7 h-8 text-xs"
              />
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label={t("rooms.challenges.legend", "Legenda")}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-[11px] leading-relaxed max-w-[240px]">
              <div className="space-y-1">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> {t("rooms.challenges.legend_done", "Meta batida hoje")}</div>
                <div className="flex items-center gap-2"><Clock className="h-3 w-3 text-primary" /> {t("rooms.challenges.legend_in_progress", "Em andamento")}</div>
                <div className="flex items-center gap-2"><AlertTriangle className="h-3 w-3 text-amber-500" /> {t("rooms.challenges.legend_at_risk", "Faltou dias seguidos")}</div>
                <div className="flex items-center gap-2"><Circle className="h-3 w-3 text-muted-foreground/60" /> {t("rooms.challenges.legend_not_started", "Não começou")}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Desktop: matrix table */}
        <div className="hidden md:block">
          <MatrixTable
            challenges={challenges}
            rows={filtered}
            isOwner={isOwner}
            onEdit={onEdit}
            onDelete={onDelete}
            onOpenMember={onOpenMember}
          />
        </div>

        {/* Mobile: tabs */}
        <div className="md:hidden">
          <Tabs defaultValue="per_challenge" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="per_challenge" className="text-xs">
                {t("rooms.challenges.tab_per_challenge", "Por desafio")}
              </TabsTrigger>
              <TabsTrigger value="per_member" className="text-xs">
                {t("rooms.challenges.tab_per_member", "Por membro")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="per_challenge" className="mt-3">
              <MobilePerChallenge
                challenges={challenges}
                filteredMemberIds={new Set(filtered.map((r) => r.user_id))}
                isOwner={isOwner}
                onEdit={onEdit}
                onDelete={onDelete}
                onOpenMember={onOpenMember}
              />
            </TabsContent>

            <TabsContent value="per_member" className="mt-3">
              <MobilePerMember
                challenges={challenges}
                rows={filtered}
                onOpenMember={onOpenMember}
              />
            </TabsContent>
          </Tabs>
        </div>

        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            {t("rooms.challenges.no_results", "Nenhum membro corresponde ao filtro.")}
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}

function defaultFilterLabel(f: Filter) {
  switch (f) {
    case "all":
      return "Todos";
    case "done_today":
      return "Bateram hoje";
    case "missing":
      return "Faltam bater";
    case "not_started":
      return "Não começaram";
  }
}

// -----------------------------------------------------------------------------
// Desktop matrix
// -----------------------------------------------------------------------------

function MatrixTable({
  challenges,
  rows,
  isOwner,
  onEdit,
  onDelete,
  onOpenMember,
}: {
  challenges: RoomChallenge[];
  rows: Array<{
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    avatar_flair: string | null;
    doneToday: number;
    totalSecondsToday: number;
    perChallenge: Map<string, RoomChallengeMember | null>;
  }>;
  isOwner: boolean;
  onEdit: (c: RoomChallenge) => void;
  onDelete: (c: RoomChallenge) => void;
  onOpenMember: (c: RoomChallenge, m: RoomChallengeMember) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-max text-sm border-separate border-spacing-0">
        <thead>
          <tr className="bg-muted/40">
            <th className="sticky left-0 z-20 bg-muted/40 text-left px-3 py-2 border-b border-border font-medium text-xs text-muted-foreground">
              {t("rooms.challenges.col_member", "Membro")}
            </th>
            {challenges.map((c) => {
              const done = c.members.filter((m) => m.completed_current).length;
              const pct = c.members.length > 0 ? Math.round((done / c.members.length) * 100) : 0;
              return (
                <th key={c.challenge_id} className="px-3 py-2 border-b border-border align-top min-w-[180px]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base leading-none">{c.emoji}</span>
                        <span className="font-medium text-xs truncate max-w-[130px]">{c.title}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {c.target_minutes}min · {done}/{c.members.length} ({pct}%)
                      </div>
                    </div>
                    {isOwner && (
                      <div className="flex gap-0.5 shrink-0">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onEdit(c)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => onDelete(c)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <Progress value={pct} className="h-1 mt-1.5" />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.user_id} className="hover:bg-accent/30 transition-colors">
              <td className="sticky left-0 z-10 bg-card px-3 py-2 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <AvatarFlair tier="free" flairId={r.avatar_flair}>
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={r.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {(r.display_name || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </AvatarFlair>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate max-w-[140px]">{r.display_name || "—"}</p>
                    {r.doneToday > 0 && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Flame className="h-2.5 w-2.5 text-orange-500" />
                        {r.doneToday}/{challenges.length}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              {challenges.map((c) => {
                const m = r.perChallenge.get(c.challenge_id);
                if (!m) {
                  return (
                    <td key={c.challenge_id} className="px-3 py-2 border-b border-border text-center text-[10px] text-muted-foreground/50">
                      —
                    </td>
                  );
                }
                const status = memberChallengeStatus(m);
                const targetSec = c.target_minutes * 60;
                const pct = Math.min(100, Math.round((m.seconds_current / targetSec) * 100));
                const min = Math.floor(m.seconds_current / 60);
                return (
                  <td key={c.challenge_id} className="px-3 py-2 border-b border-border align-middle">
                    <button
                      onClick={() => onOpenMember(c, m)}
                      className={cn(
                        "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                        "hover:bg-accent",
                        status === "done" && "bg-green-500/10",
                        status === "at_risk" && "bg-amber-500/10",
                      )}
                      aria-label={`${r.display_name} — ${c.title} — ${min} de ${c.target_minutes}min`}
                    >
                      <StatusIcon status={status} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="text-[11px] font-medium tabular-nums">
                            {min}/{c.target_minutes}m
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">{pct}%</span>
                        </div>
                        <div className="mt-0.5 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all",
                              status === "done" ? "bg-green-500" : "bg-primary",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Mobile: swipeable carousel per challenge
// -----------------------------------------------------------------------------

function MobilePerChallenge({
  challenges,
  filteredMemberIds,
  isOwner,
  onEdit,
  onDelete,
  onOpenMember,
}: {
  challenges: RoomChallenge[];
  filteredMemberIds: Set<string>;
  isOwner: boolean;
  onEdit: (c: RoomChallenge) => void;
  onDelete: (c: RoomChallenge) => void;
  onOpenMember: (c: RoomChallenge, m: RoomChallengeMember) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex snap-x snap-mandatory overflow-x-auto gap-3 -mx-1 px-1 pb-2 scroll-smooth">
      {challenges.map((c, i) => {
        const done = c.members.filter((m) => m.completed_current).length;
        const pct = c.members.length > 0 ? Math.round((done / c.members.length) * 100) : 0;
        const targetSec = c.target_minutes * 60;
        const members = c.members.filter((m) => filteredMemberIds.has(m.user_id));

        return (
          <div
            key={c.challenge_id}
            className="snap-start shrink-0 w-full rounded-lg border border-border bg-muted/20 p-3 space-y-3"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <span className="text-2xl shrink-0">{c.emoji}</span>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {c.period_type === "daily"
                      ? t("rooms.challenges.period_daily_short", "Diário")
                      : t("rooms.challenges.period_weekly_short", "Semanal")}{" "}
                    · {c.target_minutes}min
                    {c.duration_days ? ` · ${c.duration_days}d` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-muted-foreground">
                  {i + 1}/{challenges.length}
                </span>
                {isOwner && (
                  <>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(c)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Room progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  {t("rooms.challenges.completed_today", "{{done}} de {{total}} bateram hoje", { done, total: c.members.length })}
                </span>
                <span className="font-medium tabular-nums">{pct}%</span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>

            {/* Compact member list */}
            <div className="space-y-1">
              {members.map((m) => {
                const status = memberChallengeStatus(m);
                const p = Math.min(100, Math.round((m.seconds_current / targetSec) * 100));
                const min = Math.floor(m.seconds_current / 60);
                return (
                  <button
                    key={m.user_id}
                    onClick={() => onOpenMember(c, m)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-left transition-colors",
                      status === "done" && "bg-green-500/10 border-green-500/30",
                    )}
                  >
                    <AvatarFlair tier="free" flairId={m.avatar_flair} compact>
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={m.avatar_url || undefined} />
                        <AvatarFallback className="text-[9px]">
                          {(m.display_name || "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </AvatarFlair>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-medium truncate">{m.display_name || "—"}</span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {min}/{c.target_minutes}m
                        </span>
                      </div>
                      <div className="mt-0.5 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full", status === "done" ? "bg-green-500" : "bg-primary")}
                          style={{ width: `${p}%` }}
                        />
                      </div>
                    </div>
                    <StatusIcon status={status} />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Mobile: per-member accordion
// -----------------------------------------------------------------------------

function MobilePerMember({
  challenges,
  rows,
  onOpenMember,
}: {
  challenges: RoomChallenge[];
  rows: Array<{
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    avatar_flair: string | null;
    doneToday: number;
    totalSecondsToday: number;
    perChallenge: Map<string, RoomChallengeMember | null>;
  }>;
  onOpenMember: (c: RoomChallenge, m: RoomChallengeMember) => void;
}) {
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <Collapsible key={r.user_id}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 hover:bg-accent/50 transition-colors">
              <AvatarFlair tier="free" flairId={r.avatar_flair} compact>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={r.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {(r.display_name || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </AvatarFlair>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-medium truncate">{r.display_name || "—"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {r.doneToday}/{challenges.length} · {Math.floor(r.totalSecondsToday / 60)}min
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-1 pl-2">
            {challenges.map((c) => {
              const m = r.perChallenge.get(c.challenge_id);
              if (!m) return null;
              const status = memberChallengeStatus(m);
              const targetSec = c.target_minutes * 60;
              const p = Math.min(100, Math.round((m.seconds_current / targetSec) * 100));
              const min = Math.floor(m.seconds_current / 60);
              return (
                <button
                  key={c.challenge_id}
                  onClick={() => onOpenMember(c, m)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5",
                    status === "done" && "bg-green-500/10 border-green-500/30",
                  )}
                >
                  <span className="text-sm">{c.emoji}</span>
                  <span className="text-xs truncate flex-1 text-left">{c.title}</span>
                  <StatusIcon status={status} />
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {min}/{c.target_minutes}m ({p}%)
                  </span>
                </button>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
