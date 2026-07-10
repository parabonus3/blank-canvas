import type { RoomMember } from "@/hooks/useRoomMembers";
import {
  Flame,
  Star,
  Trophy,
  Calendar,
  Target,
  Zap,
  Users,
  Crown,
  Sparkles,
  Sunrise,
  Moon,
  type LucideIcon,
} from "lucide-react";

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";
export type AchievementCategory = "time" | "streak" | "community" | "special";

export interface RoomAchievementDef {
  id: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: LucideIcon;
  /** progress returns [current, target] to compute % and label; null if not measurable client-side */
  progress: (ctx: AchievementContext) => { current: number; target: number } | null;
}

export interface AchievementContext {
  members: RoomMember[];
  streak: number;
  totalHours: number;
  memberCount: number;
  liveNow: number;
}

export const ROOM_ACHIEVEMENTS: RoomAchievementDef[] = [
  // ===== Time =====
  { id: "total_10h",   category: "time", rarity: "common",    icon: Flame,   progress: (c) => ({ current: c.totalHours, target: 10   }) },
  { id: "total_50h",   category: "time", rarity: "rare",      icon: Flame,   progress: (c) => ({ current: c.totalHours, target: 50   }) },
  { id: "total_100h",  category: "time", rarity: "epic",      icon: Star,    progress: (c) => ({ current: c.totalHours, target: 100  }) },
  { id: "total_500h",  category: "time", rarity: "legendary", icon: Trophy,  progress: (c) => ({ current: c.totalHours, target: 500  }) },
  { id: "total_1000h", category: "time", rarity: "legendary", icon: Crown,   progress: (c) => ({ current: c.totalHours, target: 1000 }) },

  // ===== Streak =====
  { id: "streak_3d",  category: "streak", rarity: "common", icon: Calendar, progress: (c) => ({ current: c.streak, target: 3  }) },
  { id: "streak_7d",  category: "streak", rarity: "rare",   icon: Calendar, progress: (c) => ({ current: c.streak, target: 7  }) },
  { id: "streak_30d", category: "streak", rarity: "epic",   icon: Calendar, progress: (c) => ({ current: c.streak, target: 30 }) },

  // ===== Community =====
  { id: "members_5",  category: "community", rarity: "common", icon: Users,  progress: (c) => ({ current: c.memberCount, target: 5  }) },
  { id: "members_10", category: "community", rarity: "rare",   icon: Target, progress: (c) => ({ current: c.memberCount, target: 10 }) },
  { id: "members_25", category: "community", rarity: "epic",   icon: Zap,    progress: (c) => ({ current: c.memberCount, target: 25 }) },

  // ===== Special (live) =====
  { id: "sync_5",     category: "special", rarity: "rare",      icon: Sparkles, progress: (c) => ({ current: c.liveNow, target: 5  }) },
  { id: "sync_10",    category: "special", rarity: "epic",      icon: Sparkles, progress: (c) => ({ current: c.liveNow, target: 10 }) },
];

export function isUnlocked(def: RoomAchievementDef, ctx: AchievementContext): boolean {
  const p = def.progress(ctx);
  if (!p) return false;
  return p.current >= p.target;
}

export function progressPct(def: RoomAchievementDef, ctx: AchievementContext): number {
  const p = def.progress(ctx);
  if (!p || p.target <= 0) return 0;
  return Math.min(100, Math.round((p.current / p.target) * 100));
}

export const RARITY_STYLES: Record<AchievementRarity, {
  ring: string;
  bg: string;
  text: string;
  label: string;
  labelPt: string;
  glow?: string;
  animatedRing?: boolean;
}> = {
  common: {
    ring: "ring-blue-500/40",
    bg: "bg-gradient-to-br from-blue-500/20 to-cyan-500/10",
    text: "text-blue-500",
    label: "Common",
    labelPt: "Comum",
  },
  rare: {
    ring: "ring-purple-500/50",
    bg: "bg-gradient-to-br from-purple-500/25 to-fuchsia-500/10",
    text: "text-purple-400",
    label: "Rare",
    labelPt: "Rara",
  },
  epic: {
    ring: "ring-amber-500/60",
    bg: "bg-gradient-to-br from-amber-500/30 to-orange-500/15",
    text: "text-amber-400",
    label: "Epic",
    labelPt: "Épica",
    glow: "shadow-[0_0_20px_-4px_rgba(251,191,36,0.6)]",
    animatedRing: true,
  },
  legendary: {
    ring: "ring-transparent",
    bg: "bg-[conic-gradient(from_0deg,rgba(239,68,68,0.3),rgba(245,158,11,0.3),rgba(34,197,94,0.3),rgba(59,130,246,0.3),rgba(168,85,247,0.3),rgba(239,68,68,0.3))]",
    text: "text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-400 to-violet-400",
    label: "Legendary",
    labelPt: "Lendária",
    glow: "shadow-[0_0_28px_-4px_rgba(251,191,36,0.7)]",
    animatedRing: true,
  },
};

export const CATEGORY_LABELS_PT: Record<AchievementCategory, string> = {
  time: "Tempo",
  streak: "Sequência",
  community: "Comunidade",
  special: "Especiais",
};
export const CATEGORY_LABELS_EN: Record<AchievementCategory, string> = {
  time: "Time",
  streak: "Streak",
  community: "Community",
  special: "Special",
};
