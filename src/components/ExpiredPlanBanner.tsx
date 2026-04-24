import { useTranslation } from "react-i18next";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExpiredPlanBanner() {
  const { t } = useTranslation();
  const { isExpired } = useSubscription();

  if (!isExpired) return null;

  return (
    <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm text-destructive font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{t("pricing.plan_expired_banner")}</span>
      </div>
      <Button size="sm" variant="destructive" asChild>
        <Link to="/pricing">{t("pricing.renew_now")}</Link>
      </Button>
    </div>
  );
}
