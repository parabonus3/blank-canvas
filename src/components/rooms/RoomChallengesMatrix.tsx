import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pencil,
  Trash2,
  Flame,
  Search,
  HelpCircle,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  MoreVertical,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AvatarFlair } from "@/components/avatar/AvatarFlair";
import { PlanBadge, PlanAvatarRing } from "@/components/rooms/PlanBadge";
import { cn } from "@/lib/utils";
import type { RoomChallenge, RoomChallengeMember } from "@/hooks/useRoomChallenges";

const PRESENCE_WINDOW_MS = 2 * 60 * 60 * 1000 + 5 * 60 * 1000;

function isActivelyStudying(is_timer_active?: boolean, last_active_at?: string | null) {
  if (!is_timer_active || !last_active_at) return false;
  return Date.now() - new Date(last_active_at).getTime() < PRESENCE_WINDOW_MS;
}

function getMemberTitle(totalSeconds: number, t: (key: string) => string) {
  const hours = totalSeconds / 3600;
  if (hours >= 200) return { label: t("rooms.level_legend"), color: "text-yellow-500" };
  if (hours >= 80) return { label: t("rooms.level_master"), color: "text-purple-500" };
  if (hours >= 30) return { label: t("rooms.level_veteran"), color: "text-blue-500" };
  if (hours >= 10) return { label: t("rooms.level_dedicated"), color: "text-green-500" };
  if (hours >= 3) return { label: t("rooms.level_regular"), color: "text-cyan-500" };
  if (hours >= 0.5) return { label: t("rooms.level_starter"), color: "text-orange-400" };
  return { label: t("rooms.level_novice"), color: "text-muted-foreground" };
}

export interface MatrixMemberExtra {
  plan_tier?: string;
  is_timer_active?: boolean;
  last_active_at?: string | null;
  is_online?: boolean;
  total_seconds?: number;
  status_text?: string | null;
  role?: string;
  avatar_flair_color?: string | null;
}

interface Props {
  challenges: RoomChallenge[];
  isOwner: boolean;
  onEdit: (c: RoomChallenge) => void;
  onDelete: (c: RoomChallenge) => void;
  onOpenMember: (c: RoomChallenge, m: RoomChallengeMember) => void;
  memberExtras?: Map<string, MatrixMemberExtra>;
  weekTotals?: Map<string, number>;
  onOpenProfile?: (userId: string) => void;
  currentUserId?: string | null;
}

type Filter = "all" | "done_today" | "missing" | "not_started";
type SortMode = "today" | "week";

const COLLAPSE_THRESHOLD = 6; // desafios acima disso colapsam por padrão dentro do card

// -----------------------------------------------------------------------------
// Status helpers
// -----------------------------------------------------------------------------

function memberChallengeStatus(m: RoomChallengeMember) {
  if (m.completed_current) return "done" as const;
  if ((m.seconds_current || 0) > 0) return "in_progress" as const;
  const days = m.days_since_completed ?? 0;
  if (m.completed_periods_total > 0 && days >= 2) return "at_risk" as const;
  return "not_started" as const;
}

type Status = ReturnType<typeof memberChallengeStatus>;

const statusRank: Record<Status, number> = {
  at_risk: 0,
  in_progress: 1,
  not_started: 2,
  done: 3,
};

function StatusIcon({ status, className }: { status: Status; className?: string }) {
  const base = cn("h-3.5 w-3.5 shrink-0", className);
  if (status === "done") return <CheckCircle2 className={cn(base, "text-green-500")} />;
  if (status === "in_progress") return <Clock className={cn(base, "text-primary")} />;
  if (status === "at_risk") return <AlertTriangle className={cn(base, "text-amber-500")} />;
  return <Circle className={cn(base, "text-muted-foreground/60")} />;
}

// -----------------------------------------------------------------------------
// Public component
// -----------------------------------------------------------------------------

export function RoomChallengesMatrix({
  challenges,
  isOwner,
  onEdit,
  onDelete,
  onOpenMember,
  memberExtras,
  weekTotals,
  onOpenProfile,
  currentUserId,
}: Props) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("today");

  const memberIndex = useMemo(() => {
    const map = new Map<
      string,
      {
        user_id: string;
        display_name: string | null;
        avatar_url: string | null;
        avatar_flair: string | null;
      }
    >();
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

  type Row = {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    avatar_flair: string | null;
    doneToday: number;
    totalSecondsToday: number;
    weekSeconds: number;
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
      const weekSeconds = weekTotals?.get(base.user_id) ?? 0;
      list.push({ ...base, doneToday, totalSecondsToday, weekSeconds, perChallenge: per });
    }
    return list;
  }, [challenges, memberIndex, weekTotals]);

  // Week ranking index (position among members with week activity > 0).
  const weekRankMap = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...rows].filter((r) => r.weekSeconds > 0).sort((a, b) => b.weekSeconds - a.weekSeconds);
    sorted.forEach((r, i) => map.set(r.user_id, i + 1));
    return map;
  }, [rows]);

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
        if (sortMode === "week") {
          if (b.weekSeconds !== a.weekSeconds) return b.weekSeconds - a.weekSeconds;
        }
        if (b.doneToday !== a.doneToday) return b.doneToday - a.doneToday;
        return b.totalSecondsToday - a.totalSecondsToday;
      });
  }, [rows, filter, search, challenges.length, sortMode]);

  const showSearch = memberIndex.size > 10;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        {/* Chips resumo por desafio */}
        <ChallengeSummaryChips
          challenges={challenges}
          isOwner={isOwner}
          onEdit={onEdit}
          onDelete={onDelete}
        />

        {/* Filtros + busca */}
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

          {/* Sort toggle: Today / Week */}
          {weekTotals && weekTotals.size > 0 && (
            <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
              <span className="text-[10px] text-muted-foreground px-1.5">
                {t("rooms.challenges.sort_label", "Ordenar")}:
              </span>
              {(["today", "week"] as SortMode[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSortMode(s)}
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded transition-colors",
                    sortMode === s
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s === "today"
                    ? t("rooms.challenges.sort_today", "Hoje")
                    : t("rooms.challenges.sort_week", "Semana")}
                </button>
              ))}
            </div>
          )}
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
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />{" "}
                  {t("rooms.challenges.legend_done", "Meta batida hoje")}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-primary" />{" "}
                  {t("rooms.challenges.legend_in_progress", "Em andamento")}
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />{" "}
                  {t("rooms.challenges.legend_at_risk", "Faltou dias seguidos")}
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-3 w-3 text-muted-foreground/60" />{" "}
                  {t("rooms.challenges.legend_not_started", "Não começou")}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Grid responsiva de cards de membro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <MemberCard
              key={r.user_id}
              row={r}
              challenges={challenges}
              onOpenMember={onOpenMember}
              extra={memberExtras?.get(r.user_id)}
              onOpenProfile={onOpenProfile}
              isMe={currentUserId === r.user_id}
              weekRank={weekRankMap.get(r.user_id)}
              showWeekRank={sortMode === "week"}
            />
          ))}
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
// Chips resumo por desafio (substitui o cabeçalho de colunas)
// -----------------------------------------------------------------------------

function ChallengeSummaryChips({
  challenges,
  isOwner,
  onEdit,
  onDelete,
}: {
  challenges: RoomChallenge[];
  isOwner: boolean;
  onEdit: (c: RoomChallenge) => void;
  onDelete: (c: RoomChallenge) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1.5">
      {challenges.map((c) => {
        const done = c.members.filter((m) => m.completed_current).length;
        const total = c.members.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        const chip = (
          <div
            className={cn(
              "group inline-flex items-center gap-1.5 rounded-full border pl-1.5 pr-2 py-1 text-[11px] max-w-full",
              c.is_ended
                ? "border-muted-foreground/30 bg-muted/40 opacity-70"
                : pct === 100
                ? "border-green-500/30 bg-green-500/10"
                : "border-border bg-muted/30",
            )}
          >
            <span className="text-sm leading-none">{c.emoji}</span>
            <span className={cn("font-medium truncate max-w-[120px] sm:max-w-[160px]", c.is_ended && "line-through")}>
              {c.title}
            </span>
            {c.is_ended ? (
              <span className="text-[9px] uppercase tracking-wide font-semibold text-muted-foreground shrink-0 border border-muted-foreground/30 rounded px-1 py-0.5">
                {t("rooms.challenges.ended_badge", "Encerrado")}
              </span>
            ) : (
              <>
                <span className="text-muted-foreground tabular-nums shrink-0">
                  {done}/{total}
                </span>
                <span
                  className={cn(
                    "tabular-nums font-medium shrink-0",
                    pct === 100 ? "text-green-600 dark:text-green-400" : "text-primary",
                  )}
                >
                  {pct}%
                </span>
              </>
            )}
            {isOwner && <MoreVertical className="h-3 w-3 text-muted-foreground shrink-0" />}
          </div>
        );

        if (!isOwner) return <div key={c.challenge_id}>{chip}</div>;

        return (
          <Popover key={c.challenge_id}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-full"
                aria-label={c.title}
              >
                {chip}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-44 p-1">
              <button
                type="button"
                onClick={() => onEdit(c)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-accent"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("common.edit", "Editar")}
              </button>
              <button
                type="button"
                onClick={() => onDelete(c)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-accent text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("common.delete", "Excluir")}
              </button>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Card por membro (mesmo layout em mobile e desktop)
// -----------------------------------------------------------------------------

function MemberCard({
  row,
  challenges,
  onOpenMember,
  extra,
  onOpenProfile,
  isMe,
  weekRank,
  showWeekRank,
}: {
  row: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    avatar_flair: string | null;
    doneToday: number;
    totalSecondsToday: number;
    weekSeconds?: number;
    perChallenge: Map<string, RoomChallengeMember | null>;
  };
  challenges: RoomChallenge[];
  onOpenMember: (c: RoomChallenge, m: RoomChallengeMember) => void;
  extra?: MatrixMemberExtra;
  onOpenProfile?: (userId: string) => void;
  isMe?: boolean;
  weekRank?: number;
  showWeekRank?: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // Ordena: at_risk → in_progress → not_started → done, mantém ordem original como desempate.
  const orderedChallenges = useMemo(() => {
    return [...challenges].sort((a, b) => {
      const ma = row.perChallenge.get(a.challenge_id);
      const mb = row.perChallenge.get(b.challenge_id);
      const sa = ma ? statusRank[memberChallengeStatus(ma)] : 4;
      const sb = mb ? statusRank[memberChallengeStatus(mb)] : 4;
      return sa - sb;
    });
  }, [challenges, row.perChallenge]);

  const needsCollapse = orderedChallenges.length >= COLLAPSE_THRESHOLD;
  const visible = needsCollapse && !expanded ? orderedChallenges.slice(0, 3) : orderedChallenges;
  const hidden = needsCollapse && !expanded ? orderedChallenges.length - visible.length : 0;

  const totalMin = Math.floor(row.totalSecondsToday / 60);
  const totalPct =
    challenges.length > 0 ? Math.round((row.doneToday / challenges.length) * 100) : 0;

  const tier = extra?.plan_tier || "free";
  const isPremium = tier === "premium";
  const isPro = tier === "pro";
  const studyingNow = isActivelyStudying(extra?.is_timer_active, extra?.last_active_at);
  const title = getMemberTitle(extra?.total_seconds ?? 0, t);
  const clickable = !!onOpenProfile && !isMe;
  const openProfile = () => {
    if (clickable) onOpenProfile!(row.user_id);
  };

  const totalSecondsAllTime = extra?.total_seconds ?? 0;
  const totalHoursExact = totalSecondsAllTime / 3600;
  const exactLabel =
    totalHoursExact >= 1
      ? `${Math.floor(totalHoursExact)}h ${Math.floor((totalSecondsAllTime % 3600) / 60)}m`
      : `${Math.floor(totalSecondsAllTime / 60)}m`;

  // Accent color for the top strip. Prefer explicit flair color, then tier, then a
  // stable hash color so cards with rich avatars (like custom photos) stand out.
  const stripColor = (() => {
    if (extra?.avatar_flair_color) return extra.avatar_flair_color;
    if (isPremium) return "#f59e0b";
    if (isPro) return "#3b82f6";
    // deterministic per-user hue
    let hash = 0;
    for (let i = 0; i < row.user_id.length; i++) hash = row.user_id.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 55%)`;
  })();

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-3 pt-4 space-y-2.5 min-w-0 transition-all",
        isPremium
          ? "border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-card to-card shadow-[inset_0_0_0_1px_rgba(251,191,36,0.15)]"
          : isPro
          ? "border-blue-500/40 bg-gradient-to-br from-blue-500/5 via-card to-card shadow-[inset_0_0_0_1px_rgba(59,130,246,0.15)]"
          : "border-border bg-card",
        isMe && !isPremium && !isPro && "ring-1 ring-primary/30",
        studyingNow && "ring-2 ring-green-500/40",
      )}
    >
      {/* Colored top strip that fades under the avatar */}
      <div
        className="absolute inset-x-0 top-0 h-14 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, ${stripColor} 0%, transparent 100%)`,
          opacity: 0.18,
        }}
        aria-hidden
      />

      {/* Header */}
      <div className="relative flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={openProfile}
          disabled={!clickable}
          className={cn(
            "relative shrink-0 rounded-full",
            clickable && "cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40",
          )}
          aria-label={row.display_name || "member"}
        >
          <PlanAvatarRing tier={tier} flairId={row.avatar_flair} compact>
            <Avatar className={cn(isPremium ? "h-16 w-16" : "h-14 w-14")}>
              <AvatarImage src={row.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="text-[13px]">
                {(row.display_name || "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </PlanAvatarRing>
          {studyingNow ? (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-background" />
            </span>
          ) : extra?.is_online ? (
            <span className="absolute -bottom-0.5 -right-0.5 inline-flex rounded-full h-3 w-3 bg-yellow-500 border-2 border-background" />
          ) : (
            <span className="absolute -bottom-0.5 -right-0.5 inline-flex rounded-full h-3 w-3 bg-muted-foreground/40 border-2 border-background" />
          )}
        </button>
        <button
          type="button"
          onClick={openProfile}
          disabled={!clickable}
          className={cn(
            "min-w-0 flex-1 text-left",
            clickable && "cursor-pointer",
          )}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "text-sm font-semibold truncate max-w-[160px]",
                isPremium &&
                  "font-extrabold bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 bg-clip-text text-transparent",
                isPro &&
                  "font-extrabold bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent",
                !isPremium && !isPro && (isMe ? "text-primary" : "text-foreground"),
              )}
            >
              {row.display_name || "—"}
            </span>
            <PlanBadge tier={tier} />
            {isMe && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-0">
                {t("rooms.you", "Você")}
              </Badge>
            )}
            {extra?.role === "owner" && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                👑
              </Badge>
            )}
            {extra?.role === "moderator" && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                <Shield className="h-2.5 w-2.5" />
              </Badge>
            )}
            {showWeekRank && weekRank && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[9px] px-1 py-0 border-0 tabular-nums",
                  weekRank === 1
                    ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                    : weekRank <= 3
                    ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                #{weekRank} {t("rooms.challenges.pos_week_short", "sem")}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Flame className="h-3 w-3 text-orange-500" />
            <span className="tabular-nums">
              {row.doneToday}/{challenges.length}
            </span>
            <span className="opacity-60">·</span>
            <span className="tabular-nums">
              {t("rooms.challenges.total_today", "{{n}}min hoje", { n: totalMin })}
            </span>
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("text-[10px] font-medium block mt-0.5 cursor-help", title.color)}>
                {title.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[11px]">
              {exactLabel} {t("rooms.in_this_room", "nesta sala")}
            </TooltipContent>
          </Tooltip>
        </button>
        <div className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground self-start">
          {totalPct}%
        </div>
      </div>


      {/* Lista de desafios */}
      <div className="relative space-y-1.5">
        {visible.map((c) => {
          const m = row.perChallenge.get(c.challenge_id);
          if (!m) {
            return (
              <div
                key={c.challenge_id}
                className="flex items-center gap-2 rounded-md border border-dashed border-border/60 px-2 py-1.5 text-[11px] text-muted-foreground/60"
              >
                <span>{c.emoji}</span>
                <span className="truncate flex-1">{c.title}</span>
                <span>—</span>
              </div>
            );
          }
          return (
            <ChallengeRow
              key={c.challenge_id}
              challenge={c}
              member={m}
              onClick={() => onOpenMember(c, m)}
            />
          );
        })}
      </div>

      {needsCollapse && (
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleContent />
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full text-[11px] font-medium text-primary hover:underline py-1"
            >
              {expanded
                ? t("rooms.challenges.see_less", "Ver menos")
                : t("rooms.challenges.see_more", "Ver mais ({{n}})", { n: hidden })}
            </button>
          </CollapsibleTrigger>
        </Collapsible>
      )}
    </div>
  );
}

function ChallengeRow({
  challenge,
  member,
  onClick,
}: {
  challenge: RoomChallenge;
  member: RoomChallengeMember;
  onClick: () => void;
}) {
  const status = memberChallengeStatus(member);
  const targetSec = challenge.target_minutes * 60;
  const pct = Math.min(100, Math.round((member.seconds_current / targetSec) * 100));
  const min = Math.floor(member.seconds_current / 60);

  const ended = !!challenge.is_ended;

  return (
    <button
      type="button"
      onClick={ended ? undefined : onClick}
      disabled={ended}
      className={cn(
        "w-full flex items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors min-h-[40px]",
        ended && "border-muted-foreground/20 bg-muted/20 opacity-60 cursor-not-allowed",
        !ended && status === "done" && "border-green-500/30 bg-green-500/10",
        !ended && status === "at_risk" && "border-amber-500/30 bg-amber-500/10",
        !ended && status === "in_progress" && "border-primary/25 bg-primary/5",
        !ended && status === "not_started" && "border-border bg-muted/20 hover:bg-accent/40",
      )}
      aria-label={`${challenge.title} — ${min}/${challenge.target_minutes}min (${pct}%)`}
    >
      <StatusIcon status={status} />
      <span className="text-sm leading-none shrink-0">{challenge.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[12px] font-medium truncate">{challenge.title}</span>
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            {min}/{challenge.target_minutes}m
            <span className="ml-1 opacity-70">{pct}%</span>
          </span>
        </div>
        <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              status === "done"
                ? "bg-green-500"
                : status === "at_risk"
                ? "bg-amber-500"
                : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </button>
  );
}
