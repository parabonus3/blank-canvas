import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { STRIPE_PLANS } from "@/lib/stripePlans";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

export function PricingSection() {
  const { t } = useTranslation();
  const [isYearly, setIsYearly] = useState(true);

  const plans = [
    {
      key: "free",
      name: "Free",
      description: t("landing.plan_free_desc"),
      price: 0,
      period: "",
      features: STRIPE_PLANS.free.features,
      cta: t("landing.cta_start"),
      href: "/auth",
      highlight: false,
      badge: t("landing.trial_badge"),
    },
    {
      key: "pro",
      name: "Pro",
      description: t("landing.plan_pro_desc"),
      price: isYearly ? STRIPE_PLANS.pro.yearlyMonthlyEquivalent : STRIPE_PLANS.pro.monthlyPrice,
      originalMonthly: STRIPE_PLANS.pro.monthlyPrice,
      yearlyTotal: STRIPE_PLANS.pro.yearlyPrice,
      period: t("pricing.month"),
      features: STRIPE_PLANS.pro.features,
      cta: t("landing.cta_start"),
      href: "/auth",
      highlight: false,
      badge: null,
    },
    {
      key: "premium",
      name: "Premium",
      description: t("landing.plan_premium_desc"),
      price: isYearly ? STRIPE_PLANS.premium.yearlyMonthlyEquivalent : STRIPE_PLANS.premium.monthlyPrice,
      originalMonthly: STRIPE_PLANS.premium.monthlyPrice,
      yearlyTotal: STRIPE_PLANS.premium.yearlyPrice,
      period: t("pricing.month"),
      features: STRIPE_PLANS.premium.features,
      cta: t("landing.cta_start"),
      href: "/auth",
      highlight: true,
      badge: t("pricing.popular"),
    },
  ];

  return (
    <section className="relative z-10 px-3 sm:px-4 pb-12 sm:pb-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6 sm:mb-12">
          <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3">
            {t("landing.plans_title")}
          </h2>
          <p className="text-white/60 text-xs sm:text-base max-w-md mx-auto px-2">
            {t("landing.plans_subtitle")}
          </p>
        </div>

        {/* Billing toggle */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 max-w-xs mx-auto mb-6 sm:mb-8">
          <button
            onClick={() => setIsYearly(false)}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl border-2 text-xs sm:text-sm font-medium transition-all text-center ${!isYearly ? "border-primary bg-primary/10 text-white" : "border-white/10 hover:border-white/20 text-white/60"}`}
          >
            {t("pricing.monthly")}
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl border-2 text-xs sm:text-sm font-medium transition-all text-center flex flex-col items-center gap-0.5 sm:gap-1 ${isYearly ? "border-primary bg-primary/10 text-white" : "border-white/10 hover:border-white/20 text-white/60"}`}
          >
            {t("pricing.yearly")}
            <span className="text-[10px] sm:text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
              {t("pricing.save_badge")}
            </span>
          </button>
        </div>

        <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-5">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl p-4 sm:p-6 border transition-all duration-300 ${
                plan.highlight
                  ? "bg-white/10 border-primary/50 shadow-lg shadow-primary/10 sm:scale-[1.02]"
                  : "bg-white/5 border-white/10 hover:border-white/20"
              }`}
            >
              {plan.badge && (
                <div className={`absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full whitespace-nowrap ${
                  plan.highlight
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent/20 text-accent"
                }`}>
                  {plan.badge}
                </div>
              )}

              <h3 className="text-base sm:text-lg font-bold text-white mb-0.5 sm:mb-1 flex items-center gap-2">
                {plan.name}
                {plan.highlight && <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />}
              </h3>
              <p className="text-white/50 text-[10px] sm:text-xs mb-3 sm:mb-4">{plan.description}</p>

              <div className="mb-3 sm:mb-5">
                {plan.price === 0 ? (
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    {t("landing.free_price")}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      {isYearly && (
                        <span className="text-base text-white/40 line-through">${plan.originalMonthly}</span>
                      )}
                      <span className="text-2xl sm:text-3xl font-bold text-white">${plan.price}</span>
                      <span className="text-white/50 text-xs sm:text-sm">/{plan.period}</span>
                    </div>
                    {isYearly && (
                      <p className="text-[10px] sm:text-xs text-white/40 mt-0.5">
                        {t("pricing.billed_annually", { total: plan.yearlyTotal })}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs sm:text-sm text-white/80">
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                    <span>{String(t(`pricing.feature_${f}`, f))}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="sm"
                className={`w-full sm:h-10 ${plan.highlight ? "bg-primary hover:bg-primary/90" : "bg-white/10 hover:bg-white/20 text-white"}`}
              >
                <Link to={plan.href}>{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
