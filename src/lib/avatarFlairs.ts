import type { PlanTier } from "@/lib/stripePlans";
import type { TFunction } from "i18next";

export type FlairTier = "pro" | "premium";
export type FlairCategory = "classic" | "dark" | "feminine" | "special";

export interface AvatarFlairDef {
  id: string;
  tier: FlairTier;
  category: FlairCategory;
}

export const AVATAR_FLAIRS: AvatarFlairDef[] = [
  // ===== Classic (Pro) =====
  { id: "pro-pulse", tier: "pro", category: "classic" },
  { id: "pro-orbit", tier: "pro", category: "classic" },
  { id: "pro-shimmer", tier: "pro", category: "classic" },
  { id: "pro-wave", tier: "pro", category: "classic" },

  // ===== Dark =====
  { id: "pro-noir", tier: "pro", category: "dark" },
  { id: "premium-obsidian", tier: "premium", category: "dark" },
  { id: "premium-void", tier: "premium", category: "dark" },

  // ===== Feminine =====
  { id: "pro-blossom", tier: "pro", category: "feminine" },
  { id: "premium-rose", tier: "premium", category: "feminine" },
  { id: "premium-pearl", tier: "premium", category: "feminine" },
  { id: "premium-butterfly", tier: "premium", category: "feminine" },

  // ===== Special (Premium) =====
  { id: "premium-gold", tier: "premium", category: "special" },
  { id: "premium-flames", tier: "premium", category: "special" },
  { id: "premium-sparkles", tier: "premium", category: "special" },
  { id: "premium-rainbow", tier: "premium", category: "special" },
  { id: "premium-aurora", tier: "premium", category: "special" },
  { id: "premium-crown", tier: "premium", category: "special" },
  { id: "premium-galaxy", tier: "premium", category: "special" },
];

export const FLAIR_CATEGORIES: { id: FlairCategory }[] = [
  { id: "classic" },
  { id: "dark" },
  { id: "feminine" },
  { id: "special" },
];

export const DEFAULT_FLAIR_BY_TIER: Record<PlanTier, string> = {
  free: "default",
  pro: "pro-pulse",
  premium: "premium-gold",
};

export function getFlairsForTier(tier: PlanTier): AvatarFlairDef[] {
  if (tier === "premium") return AVATAR_FLAIRS;
  if (tier === "pro") return AVATAR_FLAIRS.filter(f => f.tier === "pro");
  return [];
}

export function resolveFlair(tier: PlanTier, flairId?: string | null): string {
  if (tier === "free") return "default";
  if (!flairId || flairId === "default") return DEFAULT_FLAIR_BY_TIER[tier];
  const def = AVATAR_FLAIRS.find(f => f.id === flairId);
  if (!def) return DEFAULT_FLAIR_BY_TIER[tier];
  if (def.tier === "premium" && tier === "pro") return DEFAULT_FLAIR_BY_TIER.pro;
  return def.id;
}

export function getFlairName(id: string, t: TFunction): string {
  return t(`settings.avatar_flair.items.${id}.name`, { defaultValue: id });
}

export function getFlairDescription(id: string, t: TFunction): string {
  return t(`settings.avatar_flair.items.${id}.description`, { defaultValue: "" });
}

export function getCategoryLabel(category: FlairCategory, t: TFunction): string {
  return t(`settings.avatar_flair.categories.${category}`, { defaultValue: category });
}
