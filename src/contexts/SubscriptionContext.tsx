import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PlanTier, getTierByProductId, getBillingInterval, ROOM_LIMITS, MEMBER_LIMITS } from "@/lib/stripePlans";

interface PendingPlanChange {
  newPriceId: string;
  newProductId: string;
  effectiveDate: string;
  newTier: PlanTier;
  scheduleId: string;
}

interface SubscriptionState {
  tier: PlanTier;
  billingInterval: "monthly" | "yearly" | null;
  subscribed: boolean;
  subscriptionEnd: string | null;
  loading: boolean;
  pendingChange: PendingPlanChange | null;
  isExpired: boolean;
}

interface SubscriptionContextType extends SubscriptionState {
  refreshSubscription: () => Promise<void>;
  hasFeature: (feature: string) => boolean;
  getMaxRooms: () => number;
  getMaxMembersPerRoom: () => number;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    tier: "free",
    billingInterval: null,
    subscribed: false,
    subscriptionEnd: null,
    loading: true,
    pendingChange: null,
    isExpired: false,
  });

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token || !user) {
      setState({ tier: "free", billingInterval: null, subscribed: false, subscriptionEnd: null, loading: false, pendingChange: null, isExpired: false });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      const hasStripeSub = data?.subscribed ?? false;

      if (hasStripeSub) {
        const tier = getTierByProductId(data?.product_id);
        const billingInterval = getBillingInterval(data?.price_id ?? null);
        
        let pendingChange: PendingPlanChange | null = null;
        if (data?.pending_plan_change) {
          const pc = data.pending_plan_change;
          pendingChange = {
            newPriceId: pc.newPriceId,
            newProductId: pc.newProductId,
            effectiveDate: pc.effectiveDate,
            newTier: getTierByProductId(pc.newProductId),
            scheduleId: pc.scheduleId,
          };
        }

        setState({
          tier,
          billingInterval,
          subscribed: true,
          subscriptionEnd: data?.subscription_end ?? null,
          loading: false,
          pendingChange,
          isExpired: false,
        });
        return;
      }

      // No Stripe sub — check if previously had one (expired)
      const subEnd = data?.subscription_end ?? null;
      const wasSubscribed = !!subEnd;
      const isExpired = wasSubscribed && new Date(subEnd) < new Date();

      setState({
        tier: "free",
        billingInterval: null,
        subscribed: false,
        subscriptionEnd: subEnd,
        loading: false,
        pendingChange: null,
        isExpired,
      });
    } catch (err) {
      console.error("Error checking subscription:", err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [session?.access_token, user]);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const hasFeature = useCallback((feature: string): boolean => {
    if (state.tier === "premium") return true;
    if (state.tier === "pro") {
      return feature !== "achievements" && feature !== "advanced_analytics" && feature !== "export_pdf" && feature !== "priority_support";
    }
    // Free tier
    return !["unlimited_projects", "all_sounds", "goals", "export_csv", "achievements", "advanced_analytics", "export_pdf", "priority_support"].includes(feature);
  }, [state.tier]);

  const getMaxRooms = useCallback(() => ROOM_LIMITS[state.tier], [state.tier]);
  const getMaxMembersPerRoom = useCallback(() => MEMBER_LIMITS[state.tier], [state.tier]);

  return (
    <SubscriptionContext.Provider value={{ ...state, refreshSubscription: checkSubscription, hasFeature, getMaxRooms, getMaxMembersPerRoom }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return context;
}
