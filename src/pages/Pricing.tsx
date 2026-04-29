import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PLANS, PlanTier } from "@/lib/stripePlans";
import { Check, Crown, Zap, Star, Loader2, ArrowUp, ArrowDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const tierIcons: Record<PlanTier, React.ReactNode> = {
  free: <Star className="h-6 w-6" />,
  pro: <Zap className="h-6 w-6" />,
  premium: <Crown className="h-6 w-6" />,
};

// Price hierarchy for upgrade/downgrade detection
const PRICE_VALUES: Record<string, number> = {
  // Current v3 prices
  [STRIPE_PLANS.pro.prices.monthly!]: 990,
  [STRIPE_PLANS.pro.prices.yearly!]: 9500,
  [STRIPE_PLANS.premium.prices.monthly!]: 1990,
  [STRIPE_PLANS.premium.prices.yearly!]: 14300,
  // Legacy v2 prices (preserve hierarchy for existing subscribers)
  "price_1TBJG4IF7aEwjBbZdzr3DzRV": 1300,
  "price_1TBJGcIF7aEwjBbZxswWAoHk": 9900,
  "price_1TBJHYIF7aEwjBbZii0gpOdE": 2400,
  "price_1TBJI7IF7aEwjBbZCvoQGwog": 17900,
};

function getCurrentPriceId(tier: PlanTier, interval: "monthly" | "yearly" | null): string | null {
  if (tier === "free" || !interval) return null;
  return STRIPE_PLANS[tier]?.prices?.[interval] ?? null;
}

function isDowngrade(currentPriceId: string | null, newPriceId: string): boolean {
  if (!currentPriceId) return false;
  const currentVal = PRICE_VALUES[currentPriceId] ?? 0;
  const newVal = PRICE_VALUES[newPriceId] ?? 0;
  return newVal < currentVal;
}

export default function Pricing() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { tier: currentTier, billingInterval, subscribed, refreshSubscription, pendingChange, isExpired } = useSubscription();
  const { toast } = useToast();
  const [billing, setBilling] = useState<"monthly" | "yearly">(billingInterval ?? "yearly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [downgradeDialog, setDowngradeDialog] = useState<{ planTier: PlanTier; priceId: string; effectiveDate?: string } | null>(null);

  useEffect(() => {
    if (billingInterval) setBilling(billingInterval);
  }, [billingInterval]);

  const handleCheckout = async (planTier: PlanTier) => {
    if (planTier === "free") return;
    const plan = STRIPE_PLANS[planTier];
    const priceId = plan.prices[billing];
    if (!priceId) return;

    setLoadingPlan(planTier);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.error === "ALREADY_SUBSCRIBED") {
        await handlePlanChange(planTier);
        return;
      }
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handlePlanChange = async (planTier: PlanTier) => {
    if (planTier === "free") return;
    const plan = STRIPE_PLANS[planTier];
    const priceId = plan.prices[billing];
    if (!priceId) return;

    const currentPriceId = getCurrentPriceId(currentTier, billingInterval);
    
    if (isDowngrade(currentPriceId, priceId)) {
      setDowngradeDialog({ planTier, priceId });
      setLoadingPlan(null);
      return;
    }

    await executePlanChange(planTier, priceId);
  };

  const executePlanChange = async (planTier: PlanTier, priceId: string) => {
    setLoadingPlan(planTier);
    try {
      const { data, error } = await supabase.functions.invoke("update-subscription", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      await refreshSubscription();

      if (data?.type === "downgrade") {
        const effectiveDate = data.effectiveDate
          ? format(new Date(data.effectiveDate), "dd/MM/yyyy")
          : "";
        toast({
          title: t("pricing.downgrade_scheduled_title"),
          description: t("pricing.downgrade_scheduled_desc", { date: effectiveDate }),
        });
      } else {
        toast({
          title: t("common.success"),
          description: t("pricing.plan_switched"),
        });
      }
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const confirmDowngrade = () => {
    if (!downgradeDialog) return;
    executePlanChange(downgradeDialog.planTier, downgradeDialog.priceId);
    setDowngradeDialog(null);
  };

  const handleManage = async () => {
    setLoadingPlan("manage");
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = (Object.entries(STRIPE_PLANS) as [PlanTier, typeof STRIPE_PLANS[PlanTier]][]).map(([key, plan]) => ({
    key,
    ...plan,
  }));

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{t("pricing.title")}</h1>
          <p className="text-muted-foreground">{t("pricing.subtitle")}</p>
          {isExpired && (
            <Badge variant="destructive" className="text-sm">
              {t("pricing.plan_expired")}
            </Badge>
          )}
        </div>

        {/* Billing toggle */}
        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
          <button
            onClick={() => setBilling("monthly")}
            className={cn(
              "py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all text-center",
              billing === "monthly"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/40"
            )}
          >
            {t("pricing.monthly")}
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={cn(
              "py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all text-center relative flex flex-col items-center gap-1",
              billing === "yearly"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/40"
            )}
          >
            {t("pricing.yearly")}
            <Badge variant="secondary" className="text-[10px]">{t("pricing.save_badge")}</Badge>
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            // isCurrentPlan: tier matches AND (free OR interval matches OR legacy with null interval)
            const isCurrentPlan = plan.key === "free"
              ? currentTier === "free"
              : currentTier === plan.key && (billingInterval === billing || billingInterval === null);
            
            const isPremiumYearly = plan.key === "premium" && billing === "yearly";
            const price = plan.key === "free"
              ? 0
              : billing === "yearly"
                ? (plan as any).yearlyMonthlyEquivalent
                : (plan as any).monthlyPrice;
            const originalMonthly = plan.key !== "free" ? (plan as any).monthlyPrice : 0;
            const yearlyTotal = plan.key !== "free" ? (plan as any).yearlyPrice : 0;

            const targetPriceId = plan.key !== "free" ? STRIPE_PLANS[plan.key]?.prices?.[billing] : null;
            const currentPriceId = getCurrentPriceId(currentTier, billingInterval);
            const isDowngradeTarget = subscribed && targetPriceId && currentPriceId && isDowngrade(currentPriceId, targetPriceId);
            const hasPendingChangeToThis = pendingChange?.newPriceId === targetPriceId;

            return (
              <Card
                key={plan.key}
                className={cn(
                  "relative flex flex-col",
                  isPremiumYearly && "border-primary shadow-glow",
                  isCurrentPlan && "ring-2 ring-primary"
                )}
              >
                {isPremiumYearly && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-primary text-primary-foreground">{t("pricing.popular")}</Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="secondary">
                      {t("pricing.current_plan")}
                    </Badge>
                  </div>
                )}
                {hasPendingChangeToThis && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="outline" className="bg-accent text-accent-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {t("pricing.pending_change")}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center space-y-3 pt-8">
                  <div className="mx-auto text-primary [&>svg]:h-8 [&>svg]:w-8">{tierIcons[plan.key]}</div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-center gap-1.5">
                      {billing === "yearly" && plan.key !== "free" && (
                        <span className="text-lg text-muted-foreground line-through">${originalMonthly}</span>
                      )}
                      <span className="text-4xl font-bold">
                        ${price}
                      </span>
                      {plan.key !== "free" && (
                        <span className="text-muted-foreground text-sm">
                          /{t("pricing.month")}
                        </span>
                      )}
                    </div>
                    {billing === "yearly" && plan.key !== "free" && (
                      <p className="text-xs text-muted-foreground">
                        {t("pricing.billed_annually", { total: yearlyTotal })}
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>{t(`pricing.feature_${feature}`)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  {plan.key === "free" ? (
                    <Button className="w-full" variant="outline" disabled>
                      {isCurrentPlan ? t("pricing.current_plan") : t("pricing.free_plan")}
                    </Button>
                  ) : isCurrentPlan && subscribed ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleManage}
                      disabled={loadingPlan === "manage"}
                    >
                      {loadingPlan === "manage" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {t("pricing.manage")}
                    </Button>
                  ) : hasPendingChangeToThis ? (
                    <Button className="w-full" variant="outline" disabled>
                      <Clock className="h-4 w-4 mr-2" />
                      {t("pricing.pending_change")}
                    </Button>
                  ) : isExpired ? (
                    <Button
                      className={cn("w-full", isPremiumYearly && "gradient-primary")}
                      onClick={() => handleCheckout(plan.key)}
                      disabled={!!loadingPlan}
                    >
                      {loadingPlan === plan.key && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {t("pricing.renew_now")}
                    </Button>
                  ) : subscribed ? (
                    <Button
                      className={cn("w-full", !isDowngradeTarget && isPremiumYearly && "gradient-primary")}
                      variant={isDowngradeTarget ? "outline" : "default"}
                      onClick={() => handlePlanChange(plan.key)}
                      disabled={!!loadingPlan}
                    >
                      {loadingPlan === plan.key && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {isDowngradeTarget ? (
                        <>
                          <ArrowDown className="h-4 w-4 mr-1" />
                          {t("pricing.schedule_downgrade")}
                        </>
                      ) : (
                        <>
                          <ArrowUp className="h-4 w-4 mr-1" />
                          {t("pricing.upgrade_now")}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      className={cn("w-full", isPremiumYearly && "gradient-primary")}
                      onClick={() => handleCheckout(plan.key)}
                      disabled={!!loadingPlan}
                    >
                      {loadingPlan === plan.key && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {t("pricing.subscribe")}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Downgrade confirmation dialog */}
      <AlertDialog open={!!downgradeDialog} onOpenChange={(open) => !open && setDowngradeDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pricing.downgrade_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("pricing.downgrade_confirm_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDowngrade}>
              {t("pricing.confirm_downgrade")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
