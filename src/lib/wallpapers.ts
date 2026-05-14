import type { PlanTier } from "@/lib/stripePlans";

/**
 * Room Frame catalog (the column is still called `room_background` in Postgres for
 * historical reasons, but visually these are now ANIMATED CONTOURS / BORDERS that
 * wrap a room — they never paint the interior.
 *
 * IDs follow the prefix convention enforced by the trigger validate_room_background:
 *   none | free-* | pro-* | premium-*
 */

export type WallpaperTier = "free" | "pro" | "premium";

export interface WallpaperDef {
  id: string;
  tier: WallpaperTier;
  /** CSS background applied to the OUTER border layer (the moldura).
   *  For animated frames this should look good when its background-position shifts. */
  borderBackground: string;
  /** Optional CSS animation class name (defined in src/index.css) for animated frames. */
  animationClass?: string;
}

export const WALLPAPERS: WallpaperDef[] = [
  // -------- FREE --------
  {
    id: "free-mist",
    tier: "free",
    borderBackground:
      "linear-gradient(135deg, hsl(var(--border)) 0%, hsl(var(--muted)) 100%)",
  },

  // -------- PRO (subtle moving gradients on the border) --------
  {
    id: "pro-twilight",
    tier: "pro",
    borderBackground:
      "linear-gradient(110deg, hsl(225 60% 35%), hsl(265 60% 55%), hsl(225 60% 35%))",
    animationClass: "frame-shimmer",
  },
  {
    id: "pro-sunrise",
    tier: "pro",
    borderBackground:
      "linear-gradient(110deg, hsl(20 90% 60%), hsl(340 80% 60%), hsl(20 90% 60%))",
    animationClass: "frame-shimmer",
  },
  {
    id: "pro-forest",
    tier: "pro",
    borderBackground:
      "linear-gradient(110deg, hsl(155 55% 35%), hsl(180 50% 50%), hsl(155 55% 35%))",
    animationClass: "frame-shimmer",
  },
  {
    id: "pro-rose",
    tier: "pro",
    borderBackground:
      "linear-gradient(110deg, hsl(340 80% 70%), hsl(15 85% 75%), hsl(340 80% 70%))",
    animationClass: "frame-shimmer",
  },
  {
    id: "pro-ocean",
    tier: "pro",
    borderBackground:
      "linear-gradient(110deg, hsl(210 80% 45%), hsl(195 75% 60%), hsl(210 80% 45%))",
    animationClass: "frame-shimmer",
  },
  {
    id: "pro-sand",
    tier: "pro",
    borderBackground:
      "linear-gradient(110deg, hsl(35 70% 65%), hsl(20 60% 55%), hsl(35 70% 65%))",
    animationClass: "frame-shimmer",
  },

  // -------- PREMIUM (rotating conic gradients / aurora) --------
  {
    id: "premium-aurora",
    tier: "premium",
    borderBackground:
      "conic-gradient(from 0deg, hsl(155 80% 55%), hsl(195 85% 55%), hsl(265 80% 60%), hsl(155 80% 55%))",
    animationClass: "frame-rotate",
  },
  {
    id: "premium-galaxy",
    tier: "premium",
    borderBackground:
      "conic-gradient(from 0deg, hsl(280 75% 55%), hsl(220 80% 50%), hsl(335 70% 55%), hsl(280 75% 55%))",
    animationClass: "frame-rotate",
  },
  {
    id: "premium-mesh",
    tier: "premium",
    borderBackground:
      "conic-gradient(from 0deg, hsl(15 90% 65%), hsl(330 85% 65%), hsl(45 95% 60%), hsl(280 80% 65%), hsl(15 90% 65%))",
    animationClass: "frame-rotate",
  },
  {
    id: "premium-noir-gold",
    tier: "premium",
    borderBackground:
      "linear-gradient(110deg, hsl(0 0% 8%), hsl(40 80% 50%), hsl(0 0% 8%))",
    animationClass: "frame-shimmer",
  },
  {
    id: "premium-flame",
    tier: "premium",
    borderBackground:
      "conic-gradient(from 0deg, hsl(15 95% 55%), hsl(45 95% 60%), hsl(0 90% 50%), hsl(15 95% 55%))",
    animationClass: "frame-rotate",
  },
  {
    id: "premium-sakura",
    tier: "premium",
    borderBackground:
      "linear-gradient(110deg, hsl(340 85% 80%), hsl(15 80% 80%), hsl(340 85% 80%))",
    animationClass: "frame-shimmer",
  },
  {
    id: "premium-emerald",
    tier: "premium",
    borderBackground:
      "conic-gradient(from 0deg, hsl(155 70% 25%), hsl(165 80% 40%), hsl(45 75% 55%), hsl(155 70% 25%))",
    animationClass: "frame-rotate",
  },
  {
    id: "premium-cosmos",
    tier: "premium",
    borderBackground:
      "conic-gradient(from 0deg, hsl(295 75% 55%), hsl(195 85% 55%), hsl(335 75% 60%), hsl(295 75% 55%))",
    animationClass: "frame-rotate",
  },
];

export function getWallpapersForTier(tier: PlanTier): WallpaperDef[] {
  if (tier === "premium") return WALLPAPERS;
  if (tier === "pro") return WALLPAPERS.filter((w) => w.tier === "pro" || w.tier === "free");
  return WALLPAPERS.filter((w) => w.tier === "free");
}

export function getWallpaperById(id: string | null | undefined): WallpaperDef | null {
  if (!id || id === "none") return null;
  return WALLPAPERS.find((w) => w.id === id) || null;
}

export function resolveWallpaper(
  id: string | null | undefined,
  tier: PlanTier,
): WallpaperDef | null {
  const w = getWallpaperById(id);
  if (!w) return null;
  if (w.tier === "premium" && tier !== "premium") return null;
  if (w.tier === "pro" && tier !== "pro" && tier !== "premium") return null;
  return w;
}
