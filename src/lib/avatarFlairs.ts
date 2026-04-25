import type { PlanTier } from "@/lib/stripePlans";

export type FlairTier = "pro" | "premium";

export interface AvatarFlairDef {
  id: string;
  name: string;
  description: string;
  tier: FlairTier;
}

export const AVATAR_FLAIRS: AvatarFlairDef[] = [
  // Pro (4)
  { id: "pro-pulse", name: "Pulso", description: "Anel azul pulsante suave", tier: "pro" },
  { id: "pro-orbit", name: "Órbita", description: "Ponto de luz orbitando", tier: "pro" },
  { id: "pro-shimmer", name: "Brilho", description: "Gradiente cyan deslizante", tier: "pro" },
  { id: "pro-wave", name: "Onda", description: "Ondas concêntricas expandindo", tier: "pro" },

  // Premium (7) — mais elaborados
  { id: "premium-gold", name: "Ouro", description: "Halo dourado giratório", tier: "premium" },
  { id: "premium-flames", name: "Chamas", description: "Chamas douradas dançantes", tier: "premium" },
  { id: "premium-sparkles", name: "Brilhos", description: "Estrelas girando ao redor", tier: "premium" },
  { id: "premium-rainbow", name: "Arco-íris", description: "Anel multicolorido vibrante", tier: "premium" },
  { id: "premium-aurora", name: "Aurora", description: "Aurora boreal flutuante", tier: "premium" },
  { id: "premium-crown", name: "Coroa", description: "Coroa flutuante real", tier: "premium" },
  { id: "premium-galaxy", name: "Galáxia", description: "Partículas estelares orbitando", tier: "premium" },
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
  // user can't use a flair above their tier
  if (def.tier === "premium" && tier === "pro") return DEFAULT_FLAIR_BY_TIER.pro;
  return def.id;
}
