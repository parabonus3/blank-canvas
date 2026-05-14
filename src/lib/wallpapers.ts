import type { PlanTier } from "@/lib/stripePlans";

export type WallpaperTier = "free" | "pro" | "premium";

export interface WallpaperDef {
  id: string;
  tier: WallpaperTier;
  /** Inline CSS background applied to the wallpaper layer. Uses HSL tokens via tailwind utilities elsewhere. */
  background: string;
  /** Optional extra CSS animation class name (defined in index.css) for premium animated wallpapers. */
  animationClass?: string;
}

/**
 * Wallpaper catalog. IDs MUST follow the prefix convention:
 *   none | free-* | pro-* | premium-*
 * The Postgres triggers validate_profile_background / validate_room_background
 * enforce the same rule on the server.
 */
export const WALLPAPERS: WallpaperDef[] = [
  // -------- FREE (1 neutral option besides "none") --------
  {
    id: "free-mist",
    tier: "free",
    background:
      "linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--background)) 100%)",
  },

  // -------- PRO (6 elegant gradients) --------
  {
    id: "pro-twilight",
    tier: "pro",
    background:
      "linear-gradient(135deg, hsl(225 50% 18%) 0%, hsl(265 45% 28%) 100%)",
  },
  {
    id: "pro-sunrise",
    tier: "pro",
    background:
      "linear-gradient(135deg, hsl(20 85% 60%) 0%, hsl(340 75% 55%) 100%)",
  },
  {
    id: "pro-forest",
    tier: "pro",
    background:
      "linear-gradient(135deg, hsl(155 45% 22%) 0%, hsl(180 35% 35%) 100%)",
  },
  {
    id: "pro-rose",
    tier: "pro",
    background:
      "linear-gradient(135deg, hsl(340 70% 75%) 0%, hsl(15 80% 80%) 100%)",
  },
  {
    id: "pro-ocean",
    tier: "pro",
    background:
      "linear-gradient(135deg, hsl(210 70% 30%) 0%, hsl(195 60% 50%) 100%)",
  },
  {
    id: "pro-sand",
    tier: "pro",
    background:
      "linear-gradient(135deg, hsl(35 55% 75%) 0%, hsl(20 40% 60%) 100%)",
  },

  // -------- PREMIUM (8 — animated mesh / aurora / galaxy) --------
  {
    id: "premium-aurora",
    tier: "premium",
    background:
      "radial-gradient(at 20% 30%, hsl(155 80% 50% / 0.7), transparent 50%), radial-gradient(at 80% 70%, hsl(265 80% 60% / 0.7), transparent 55%), radial-gradient(at 50% 100%, hsl(195 90% 55% / 0.6), transparent 50%), hsl(225 50% 8%)",
    animationClass: "wallpaper-aurora",
  },
  {
    id: "premium-galaxy",
    tier: "premium",
    background:
      "radial-gradient(ellipse at 30% 20%, hsl(280 70% 35% / 0.9), transparent 60%), radial-gradient(ellipse at 70% 80%, hsl(220 80% 25% / 0.95), transparent 60%), hsl(260 60% 6%)",
    animationClass: "wallpaper-galaxy",
  },
  {
    id: "premium-mesh",
    tier: "premium",
    background:
      "radial-gradient(at 0% 0%, hsl(15 90% 65% / 0.85), transparent 50%), radial-gradient(at 100% 0%, hsl(330 85% 65% / 0.85), transparent 50%), radial-gradient(at 0% 100%, hsl(45 95% 60% / 0.8), transparent 50%), radial-gradient(at 100% 100%, hsl(280 80% 65% / 0.85), transparent 50%), hsl(15 30% 95%)",
    animationClass: "wallpaper-mesh",
  },
  {
    id: "premium-noir-gold",
    tier: "premium",
    background:
      "linear-gradient(135deg, hsl(0 0% 5%) 0%, hsl(0 0% 10%) 50%, hsl(40 80% 35%) 100%)",
  },
  {
    id: "premium-flame",
    tier: "premium",
    background:
      "radial-gradient(at 50% 100%, hsl(15 95% 55% / 0.95), transparent 60%), radial-gradient(at 50% 80%, hsl(45 95% 60% / 0.7), transparent 50%), hsl(0 70% 12%)",
    animationClass: "wallpaper-flame",
  },
  {
    id: "premium-sakura",
    tier: "premium",
    background:
      "radial-gradient(at 25% 25%, hsl(340 80% 88% / 0.95), transparent 50%), radial-gradient(at 75% 75%, hsl(15 75% 85% / 0.9), transparent 55%), hsl(345 60% 96%)",
  },
  {
    id: "premium-emerald",
    tier: "premium",
    background:
      "linear-gradient(135deg, hsl(155 60% 12%) 0%, hsl(165 75% 30%) 50%, hsl(45 70% 55%) 100%)",
  },
  {
    id: "premium-cosmos",
    tier: "premium",
    background:
      "radial-gradient(at 30% 40%, hsl(295 75% 55% / 0.85), transparent 50%), radial-gradient(at 70% 60%, hsl(195 85% 55% / 0.85), transparent 50%), radial-gradient(at 50% 90%, hsl(335 75% 60% / 0.7), transparent 50%), hsl(245 60% 8%)",
    animationClass: "wallpaper-aurora",
  },
];

export const WALLPAPER_NONE: WallpaperDef = {
  id: "none",
  tier: "free",
  background: "transparent",
};

export function getWallpapersForTier(tier: PlanTier): WallpaperDef[] {
  if (tier === "premium") return WALLPAPERS;
  if (tier === "pro") return WALLPAPERS.filter((w) => w.tier === "pro" || w.tier === "free");
  return WALLPAPERS.filter((w) => w.tier === "free");
}

export function getWallpaperById(id: string | null | undefined): WallpaperDef | null {
  if (!id || id === "none") return null;
  return WALLPAPERS.find((w) => w.id === id) || null;
}

/** Defense-in-depth: returns null if the user's tier doesn't allow that wallpaper. */
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
