import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/contexts/SubscriptionContext";

export function TrialBanner() {
  const { t } = useTranslation();
  const { isTrial, trialDaysLeft } = useSubscription();

  if (!isTrial) return null;

  const label =
    trialDaysLeft > 1
      ? t("pricing.trial_days_left", {
          n: trialDaysLeft,
          defaultValue: "Você tem {{n}} dias restantes do teste Premium grátis",
        })
      : t("pricing.trial_last_day", {
          defaultValue: "Último dia do seu teste Premium grátis",
        });

  return (
    <div className="bg-primary/10 border-b border-primary/30 px-4 py-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm text-primary font-medium">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </div>
      <Button size="sm" asChild>
        <Link to="/pricing">{t("pricing.upgrade_now", { defaultValue: "Assinar agora" })}</Link>
      </Button>
    </div>
  );
}
