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
import { cn } from "@/lib/utils";
import type { RoomChallenge, RoomChallengeMember } from "@/hooks/useRoomChallenges";

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
  onOpenProfile?: (userId: string) => void;
  currentUserId?: string | null;
}

type Filter = "all" | "done_today" | "missing" | "not_started";

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
  onOpenProfile,
  currentUserId,
}: Props) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

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
              pct === 100
                ? "border-green-500/30 bg-green-500/10"
                : "border-border bg-muted/30",
            )}
          >
            <span className="text-sm leading-none">{c.emoji}</span>
            <span className="font-medium truncate max-w-[120px] sm:max-w-[160px]">
              {c.title}
            </span>
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
}: {
  row: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    avatar_flair: string | null;
    doneToday: number;
    totalSecondsToday: number;
    perChallenge: Map<string, RoomChallengeMember | null>;
  };
  challenges: RoomChallenge[];
  onOpenMember: (c: RoomChallenge, m: RoomChallengeMember) => void;
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

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2.5 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2.5 min-w-0">
        <AvatarFlair tier="free" flairId={row.avatar_flair}>
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={row.avatar_url || undefined} />
            <AvatarFallback className="text-[11px]">
              {(row.display_name || "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </AvatarFlair>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{row.display_name || "—"}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Flame className="h-3 w-3 text-orange-500" />
            <span className="tabular-nums">
              {row.doneToday}/{challenges.length}
            </span>
            <span className="opacity-60">·</span>
            <span className="tabular-nums">
              {t("rooms.challenges.total_today", "{{n}}min hoje", { n: totalMin })}
            </span>
          </p>
        </div>
        <div className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
          {totalPct}%
        </div>
      </div>

      {/* Lista de desafios */}
      <div className="space-y-1.5">
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

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors min-h-[40px]",
        status === "done" && "border-green-500/30 bg-green-500/10",
        status === "at_risk" && "border-amber-500/30 bg-amber-500/10",
        status === "in_progress" && "border-primary/25 bg-primary/5",
        status === "not_started" && "border-border bg-muted/20 hover:bg-accent/40",
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
