import type { PlanTier } from "@/lib/stripePlans";

export type FlairTier = "pro" | "premium";
export type FlairCategory = "classic" | "dark" | "feminine" | "special";

export interface AvatarFlairDef {
  id: string;
  name: string;
  description: string;
  tier: FlairTier;
  category: FlairCategory;
}

export const AVATAR_FLAIRS: AvatarFlairDef[] = [
  // ===== Clássicos (Pro) =====
  { id: "pro-pulse", name: "Pulso", description: "Anel azul pulsante suave", tier: "pro", category: "classic" },
  { id: "pro-orbit", name: "Órbita", description: "Ponto de luz orbitando", tier: "pro", category: "classic" },
  { id: "pro-shimmer", name: "Brilho", description: "Gradiente cyan deslizante", tier: "pro", category: "classic" },
  { id: "pro-wave", name: "Onda", description: "Ondas concêntricas expandindo", tier: "pro", category: "classic" },

  // ===== Dark (Pro + Premium) =====
  { id: "pro-noir", name: "Noir", description: "Grafite com linha cyan", tier: "pro", category: "dark" },
  { id: "premium-obsidian", name: "Obsidiana", description: "Preto profundo com reflexo prateado", tier: "premium", category: "dark" },
  { id: "premium-void", name: "Vazio", description: "Anel preto com partículas etéreas", tier: "premium", category: "dark" },

  // ===== Femininos (Pro + Premium) =====
  { id: "pro-blossom", name: "Florescer", description: "Lavanda e rosa em pulso suave", tier: "pro", category: "feminine" },
  { id: "premium-rose", name: "Rosé", description: "Pétalas douradas flutuando", tier: "premium", category: "feminine" },
  { id: "premium-pearl", name: "Pérola", description: "Iridescência perolada", tier: "premium", category: "feminine" },
  { id: "premium-butterfly", name: "Borboleta", description: "Asas batendo em rosa e violeta", tier: "premium", category: "feminine" },

  // ===== Especiais (Premium) =====
  { id: "premium-gold", name: "Ouro", description: "Halo dourado giratório", tier: "premium", category: "special" },
  { id: "premium-flames", name: "Chamas", description: "Círculo de fogo flamejante", tier: "premium", category: "special" },
  { id: "premium-sparkles", name: "Brilhos", description: "Partículas estelares orbitando", tier: "premium", category: "special" },
  { id: "premium-rainbow", name: "Arco-íris", description: "Anel multicolorido vibrante", tier: "premium", category: "special" },
  { id: "premium-aurora", name: "Aurora", description: "Aurora boreal flutuante", tier: "premium", category: "special" },
  { id: "premium-crown", name: "Coroa", description: "Diadema dourado real", tier: "premium", category: "special" },
  { id: "premium-galaxy", name: "Galáxia", description: "Estrelas orbitando em galáxia", tier: "premium", category: "special" },
];

export const FLAIR_CATEGORIES: { id: FlairCategory; label: string }[] = [
  { id: "classic", label: "Clássicos" },
  { id: "dark", label: "Dark" },
  { id: "feminine", label: "Femininos" },
  { id: "special", label: "Especiais" },
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
