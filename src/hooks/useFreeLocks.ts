import { useMemo } from "react";
import { useSubscription, FREE_PROJECTS_LIMIT, FREE_CATEGORIES_LIMIT, FREE_GOALS_LIMIT } from "@/contexts/SubscriptionContext";

interface Lockable {
  id: string;
  created_at: string;
}

type Kind = "project" | "category" | "goal";

const LIMITS: Record<Kind, number> = {
  project: FREE_PROJECTS_LIMIT,
  category: FREE_CATEGORIES_LIMIT,
  goal: FREE_GOALS_LIMIT,
};

/**
 * Returns the set of item IDs that should appear "locked" (padlock) for a free-tier user
 * whose trial has expired. The oldest N items stay unlocked; anything beyond is locked
 * but never deleted. Trial users and paid tiers get an empty set (nothing locked).
 */
export function useFreeLocks<T extends Lockable>(items: T[] | undefined, kind: Kind) {
  const { tier, isTrial } = useSubscription();

  const lockedIds = useMemo(() => {
    const empty = new Set<string>();
    if (!items || items.length === 0) return empty;
    if (tier !== "free" || isTrial) return empty;

    const limit = LIMITS[kind];
    const sorted = [...items].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const locked = new Set<string>();
    for (let i = limit; i < sorted.length; i += 1) locked.add(sorted[i].id);
    return locked;
  }, [items, tier, isTrial, kind]);

  return {
    lockedIds,
    isLocked: (id: string) => lockedIds.has(id),
    hasLocks: lockedIds.size > 0,
  };
}
