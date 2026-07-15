import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Lock, Check } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import type { RoomMember } from "@/hooks/useRoomMembers";
import {
  ROOM_ACHIEVEMENTS,
  RARITY_STYLES,
  isUnlocked,
  progressPct,
  type AchievementContext,
  type AchievementCategory,
  type RoomAchievementDef,
} from "@/lib/roomAchievementDefs";
import type { TFunction } from "i18next";

interface Props {
  roomId: string;
  members: RoomMember[];
}

function formatValue(id: string, current: number, target: number): string {
  if (id.startsWith("total_")) return `${current.toFixed(1)}h / ${target}h`;
  if (id.startsWith("streak_")) return `${Math.floor(current)}d / ${target}d`;
  return `${Math.floor(current)} / ${target}`;
}

const PRESENCE_WINDOW_MS = 2 * 60 * 60 * 1000 + 5 * 60 * 1000;

export function RoomAchievements({ roomId, members }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const lang = i18n.language || "en";
  const isPt = lang.startsWith("pt");
  const prevUnlockedRef = useRef<Set<string>>(new Set());

  // Room streak
  const { data: streak = 0 } = useQuery({
    queryKey: ["roomStreak", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_room_streak", { _room_id: roomId });
      if (error) throw error;
      return (data || 0) as number;
    },
    enabled: !!roomId,
    staleTime: 60_000,
  });

  const { data: unlocked = [], refetch } = useQuery({
    queryKey: ["roomAchievements", roomId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("room_achievements" as any)
        .select("*")
        .eq("room_id", roomId)
        .order("unlocked_at", { ascending: true }) as any);
      if (error) throw error;
      return (data || []) as { id: string; achievement_type: string; unlocked_at: string }[];
    },
    enabled: !!roomId && !!user,
  });

  const ctx: AchievementContext = useMemo(() => {
    const now = Date.now();
    const liveNow = members.filter(
      (m) => m.is_timer_active && m.last_active_at && now - new Date(m.last_active_at).getTime() < PRESENCE_WINDOW_MS,
    ).length;
    const totalHours = members.reduce((s, m) => s + (m.total_seconds || 0), 0) / 3600;
    return {
      members,
      streak,
      totalHours,
      memberCount: members.length,
      liveNow,
    };
  }, [members, streak]);

  const unlockedTypes = useMemo(
    () => new Set(unlocked.map((u) => u.achievement_type)),
    [unlocked],
  );
  const unlockedAtMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of unlocked) m.set(u.achievement_type, u.unlocked_at);
    return m;
  }, [unlocked]);

  // Auto-unlock loop
  useEffect(() => {
    if (!user || !roomId) return;
    const toUnlock = ROOM_ACHIEVEMENTS.filter(
      (def) => isUnlocked(def, ctx) && !unlockedTypes.has(def.id),
    );
    if (toUnlock.length === 0) return;
    Promise.all(
      toUnlock.map((def) =>
        supabase
          .from("room_achievements" as any)
          .upsert(
            { room_id: roomId, achievement_type: def.id },
            { onConflict: "room_id,achievement_type", ignoreDuplicates: true },
          )
          .then(),
      ),
    ).then(() => refetch());
  }, [ctx, unlockedTypes, roomId, user, refetch]);

  // Confetti + flip animation for newly revealed unlocks (client-side detection)
  useEffect(() => {
    const prev = prevUnlockedRef.current;
    const fresh = [...unlockedTypes].filter((u) => !prev.has(u));
    if (prev.size > 0 && fresh.length > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.7 },
        colors: ["#f59e0b", "#3b82f6", "#22c55e", "#a855f7", "#ec4899"],
      });
    }
    prevUnlockedRef.current = unlockedTypes;
  }, [unlockedTypes]);

  const totalCount = ROOM_ACHIEVEMENTS.length;
  const unlockedCount = ROOM_ACHIEVEMENTS.filter((d) => unlockedTypes.has(d.id)).length;
  const overallPct = Math.round((unlockedCount / totalCount) * 100);

  const byCategory = useMemo(() => {
    const map = new Map<AchievementCategory, RoomAchievementDef[]>();
    for (const def of ROOM_ACHIEVEMENTS) {
      const arr = map.get(def.category) || [];
      arr.push(def);
      map.set(def.category, arr);
    }
    return map;
  }, []);

  const categoryOrder: AchievementCategory[] = ["time", "streak", "community", "special"];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4 overflow-hidden relative">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-amber-500" />
            {t("rooms.room_achievements")}
          </h3>
          <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
            {unlockedCount}/{totalCount}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 transition-all duration-700"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {categoryOrder.map((cat) => {
          const defs = byCategory.get(cat);
          if (!defs || defs.length === 0) return null;
          const catLabel = t(`rooms.achievements.category.${cat}`);
          const catUnlocked = defs.filter((d) => unlockedTypes.has(d.id)).length;
          return (
            <div key={cat} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {catLabel}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/70">
                  {catUnlocked}/{defs.length}
                </span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {defs.map((def) => {
                  const done = unlockedTypes.has(def.id);
                  return (
                    <MedalCard
                      key={def.id}
                      def={def}
                      done={done}
                      ctx={ctx}
                      name={t(`rooms.achievements.items.${def.id}.name`)}
                      desc={t(`rooms.achievements.items.${def.id}.desc`)}
                      unlockedAt={unlockedAtMap.get(def.id)}
                      t={t}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty‑state motivator */}
      {unlockedCount === 0 && (
        <p className="text-[11px] text-center text-muted-foreground italic">
          {t("rooms.achievements.empty")}
        </p>
      )}
    </div>
  );
}

function MedalCard({
  def,
  done,
  ctx,
  name,
  desc,
  unlockedAt,
  t,
}: {
  def: RoomAchievementDef;
  done: boolean;
  ctx: AchievementContext;
  name: string;
  desc: string;
  unlockedAt?: string;
  t: TFunction;
}) {
  const IconComp = def.icon;
  const style = RARITY_STYLES[def.rarity];
  const p = def.progress(ctx);
  const pct = progressPct(def, ctx);
  const rarityLabel = t(`rooms.achievements.rarity.${def.rarity}`);

  const timeAgo = useMemo(() => {
    if (!unlockedAt) return null;
    const diff = Date.now() - new Date(unlockedAt).getTime();
    const days = Math.floor(diff / (24 * 3600 * 1000));
    if (days <= 0) return t("rooms.achievements.today");
    if (days === 1) return t("rooms.achievements.yesterday");
    if (days < 30) return t("rooms.achievements.days_ago", { n: days });
    const months = Math.floor(days / 30);
    return t("rooms.achievements.months_ago", { n: months });
  }, [unlockedAt, t]);

  return (
    <div
      className={cn(
        "relative rounded-lg border p-2 flex items-start gap-2 min-w-0 transition-all",
        done
          ? cn(
              "border-transparent bg-card animate-fade-in",
              def.rarity === "legendary" && "shadow-[0_0_24px_-6px_rgba(251,191,36,0.55)]",
              def.rarity === "epic" && "shadow-[0_0_18px_-6px_rgba(251,191,36,0.45)]",
            )
          : "border-dashed border-border/70 bg-muted/20 opacity-80",
      )}
      title={`${name} — ${desc}`}
    >
      {/* Medal coin */}
      <div className="relative shrink-0">
        {done && (def.rarity === "epic" || def.rarity === "legendary") && (
          <span
            className={cn(
              "absolute -inset-[3px] rounded-full pointer-events-none overflow-hidden",
            )}
          >
            <span
              className={cn(
                "absolute inset-0 rounded-full",
                def.rarity === "legendary"
                  ? "bg-[conic-gradient(from_0deg,#ef4444,#f59e0b,#eab308,#22c55e,#06b6d4,#3b82f6,#a855f7,#ec4899,#ef4444)]"
                  : "bg-[conic-gradient(from_0deg,#f59e0b,#fbbf24,#f59e0b,#d97706,#f59e0b)]",
                "animate-[spin_4s_linear_infinite] motion-reduce:animate-none",
              )}
            />
          </span>
        )}
        <div
          className={cn(
            "relative h-10 w-10 rounded-full flex items-center justify-center ring-2",
            done ? cn(style.bg, style.ring) : "bg-muted/60 ring-border",
          )}
        >
          {done ? (
            <IconComp className={cn("h-5 w-5", style.text)} />
          ) : (
            <Lock className="h-4 w-4 text-muted-foreground/60" />
          )}
          {done && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-card flex items-center justify-center">
              <Check className="h-2 w-2 text-white" />
            </span>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-1">
          <span className={cn("text-[12px] font-bold truncate", done ? "text-foreground" : "text-muted-foreground")}>
            {name}
          </span>
        </div>
        <p className="text-[10px] leading-tight text-muted-foreground line-clamp-2">
          {done ? desc : (isPt ? `Bloqueada · ${rarityLabel}` : `Locked · ${rarityLabel}`)}
        </p>
        {done ? (
          timeAgo && (
            <p className="text-[9px] text-muted-foreground/70 tabular-nums">{timeAgo}</p>
          )
        ) : (
          p && (
            <div className="pt-1 space-y-0.5">
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full transition-all", style.text.includes("blue") ? "bg-blue-500" : "bg-primary")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[9px] font-mono text-muted-foreground/80 tabular-nums">
                {formatValue(def.id, p.current, p.target)}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}


