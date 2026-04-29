// Stripe product and price IDs mapping (PRODUCTION v2)

export const ROOM_LIMITS: Record<PlanTier, number> = {
  free: 1,
  pro: 3,
  premium: 10,
};

export const MEMBER_LIMITS: Record<PlanTier, number> = {
  free: 10,
  pro: 50,
  premium: 200,
};

export const STREAK_FREEZE_LIMITS: Record<PlanTier, number> = {
  free: 0,
  pro: 3,
  premium: 6,
};

export const FREE_SOUNDS = ["rain", "white-noise", "lofi-1"];

// Streak Freeze Pack: one-off purchase, $1 for 3 freezes
export const STREAK_FREEZE_PACK_PRODUCT_ID = "prod_UNmXo6i8oRzIMK";
export const STREAK_FREEZE_PACK_PRICE_ID = "price_1TP0yRIF7aEwjBbZvWsh6hsv";
export const STREAK_FREEZE_PACK_SIZE = 3;
export const STREAK_FREEZE_PACK_PRICE_USD = 1;

// Legacy price IDs from previous pricing versions
const LEGACY_PRICES: Record<string, "monthly" | "yearly"> = {
  // v0 Pro
  "price_1T4SbtIF7aEwjBbZRpxoZ2ig": "monthly",
  "price_1T4Sf7IF7aEwjBbZeGnsTnGb": "yearly",
  // v1 Pro
  "price_1T8vxKIF7aEwjBbZ0s2tjwZU": "monthly",
  "price_1T8vz5IF7aEwjBbZn7C7YRLa": "yearly",
  // v2 Pro ($13/$99)
  "price_1TBJG4IF7aEwjBbZdzr3DzRV": "monthly",
  "price_1TBJGcIF7aEwjBbZxswWAoHk": "yearly",
  // v0 Premium
  "price_1T4SfZIF7aEwjBbZHQS9rWcG": "monthly",
  "price_1T4SfyIF7aEwjBbZrePYVAm8": "yearly",
  // v1 Premium
  "price_1T8w0mIF7aEwjBbZJn3LVHG0": "monthly",
  "price_1T8w1XIF7aEwjBbZ56jupbxP": "yearly",
  // v2 Premium ($24/$179)
  "price_1TBJHYIF7aEwjBbZii0gpOdE": "monthly",
  "price_1TBJI7IF7aEwjBbZCvoQGwog": "yearly",
};

export const STRIPE_PLANS = {
  free: {
    name: "Free",
    product_id: null,
    prices: {},
    features: [
      "timer_basic",
      "pomodoro_basic",
      "projects_3",
      "sounds_3",
      "rooms_1",
      "members_10",
    ],
  },
  pro: {
    name: "Pro",
    product_ids: [
      "prod_U9cV4fuZjYahhc",
      "prod_U9cVTsdR19wOvY",
      // legacy
      "prod_U2XhJsja0hQj1w",
      "prod_U2XkpL9hN68Gjn",
      "prod_U7AHwT0K5dTEB7",
      "prod_U7AJBjf96NNNx6",
    ],
    prices: {
      monthly: "price_1TRgNQIF7aEwjBbZlhFZMuSc",
      yearly: "price_1TRgNQIF7aEwjBbZGAatgXtO",
    },
    monthlyPrice: 9.9,
    yearlyPrice: 95,
    yearlyMonthlyEquivalent: 7.92,
    features: [
      "everything_free",
      "unlimited_projects",
      "all_sounds",
      "rooms_3",
      "members_50",
      "goals",
      "export_csv",
      "freezes_3_monthly",
      "avatar_flair_pro",
    ],
  },
  premium: {
    name: "Premium",
    product_ids: [
      "prod_U9cW1bur6JaHIy",
      "prod_U9cXdUEoYVf070",
      // legacy
      "prod_U2XlgWOl7aJNKN",
      "prod_U2XlbGDQP8G5FM",
      "prod_U7ALKqBXBiZkH3",
      "prod_U7AM9GTRJYqVNV",
    ],
    prices: {
      monthly: "price_1TBJHYIF7aEwjBbZii0gpOdE",
      yearly: "price_1TBJI7IF7aEwjBbZCvoQGwog",
    },
    monthlyPrice: 24,
    yearlyPrice: 179,
    yearlyMonthlyEquivalent: 14.92,
    features: [
      "everything_pro",
      "rooms_10",
      "members_200",
      "achievements",
      "advanced_analytics",
      "export_pdf",
      "priority_support",
      "freezes_6_monthly",
      "avatar_flair_premium",
    ],
  },
} as const;

export type PlanTier = keyof typeof STRIPE_PLANS;

// All assignable plan options for admin
export const PLAN_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "pro_monthly", label: "Pro Mensal ($13/mês)", priceId: "price_1TBJG4IF7aEwjBbZdzr3DzRV" },
  { value: "pro_yearly", label: "Pro Anual ($99/ano)", priceId: "price_1TBJGcIF7aEwjBbZxswWAoHk" },
  { value: "premium_monthly", label: "Premium Mensal ($24/mês)", priceId: "price_1TBJHYIF7aEwjBbZii0gpOdE" },
  { value: "premium_yearly", label: "Premium Anual ($179/ano)", priceId: "price_1TBJI7IF7aEwjBbZCvoQGwog" },
] as const;

export function getBillingInterval(priceId: string | null): "monthly" | "yearly" | null {
  if (!priceId) return null;
  // Check current v2 prices
  for (const plan of Object.values(STRIPE_PLANS)) {
    if ('prices' in plan && plan.prices) {
      const prices = plan.prices as Record<string, string>;
      if (prices.monthly === priceId) return "monthly";
      if (prices.yearly === priceId) return "yearly";
    }
  }
  // Check legacy prices
  if (priceId in LEGACY_PRICES) {
    return LEGACY_PRICES[priceId];
  }
  return null;
}

export function getTierByProductId(productId: string | null): PlanTier {
  if (!productId) return "free";
  for (const [tier, plan] of Object.entries(STRIPE_PLANS)) {
    if ('product_ids' in plan && (plan as any).product_ids?.includes(productId)) {
      return tier as PlanTier;
    }
  }
  return "free";
}
