import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Sparkles, Loader2 } from "lucide-react";
import { useMyPlanGrants, useRedeemCode, type RedeemResult } from "@/hooks/useRedeemCode";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { cn } from "@/lib/utils";

const ERROR_KEYS: Record<string, string> = {
  invalid_code: "access_codes.error_invalid",
  code_disabled: "access_codes.error_disabled",
  code_expired: "access_codes.error_expired",
  code_exhausted: "access_codes.error_exhausted",
  already_redeemed: "access_codes.error_already",
  not_authenticated: "access_codes.error_auth",
};

export function RedeemCodeCard({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const redeem = useRedeemCode();
  const { data: grants = [] } = useMyPlanGrants();
  const { subscribed } = useSubscription();

  const activeGrant = grants[0];

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { day: "2-digit", month: "short", year: "numeric" });

  const planLabel = (tier: string) => (tier === "premium" ? "Premium" : "Pro");

  const handleRedeem = async () => {
    setResult(null);
    setErrorKey(null);
    const value = code.trim();
    if (!value) return;
    try {
      const res = await redeem.mutateAsync(value);
      if (res.success) {
        setResult(res);
        setCode("");
      } else {
        setErrorKey(ERROR_KEYS[res.error || "invalid_code"] || "access_codes.error_invalid");
      }
    } catch {
      setErrorKey("access_codes.error_generic");
    }
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          {t("access_codes.title")}
        </CardTitle>
        <CardDescription>{t("access_codes.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeGrant && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 space-y-0.5">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("access_codes.active_plan", { plan: planLabel(activeGrant.plan_tier) })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("access_codes.active_until", { date: formatDate(activeGrant.expires_at) })}
            </p>
            {subscribed && (
              <p className="text-xs text-muted-foreground">{t("access_codes.after_subscription")}</p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setResult(null);
              setErrorKey(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRedeem();
            }}
            placeholder={t("access_codes.placeholder")}
            className="font-mono uppercase"
            maxLength={40}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
          <Button onClick={handleRedeem} disabled={!code.trim() || redeem.isPending} className="shrink-0">
            {redeem.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {t("access_codes.redeem")}
          </Button>
        </div>

        {errorKey && <p className="text-sm text-destructive">{t(errorKey)}</p>}

        {result?.success && (
          <div className="rounded-xl border border-success/40 bg-success/10 p-3 space-y-1">
            <p className="text-sm font-semibold text-success">
              {t("access_codes.success_title", { plan: planLabel(result.plan_tier || "premium") })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("access_codes.success_days", { count: result.granted_days || 0 })}
            </p>
            {result.access_ends_at && (
              <p className="text-xs text-muted-foreground">
                {t("access_codes.success_until", { date: formatDate(result.access_ends_at) })}
              </p>
            )}
            {result.partner_name && (
              <p className="text-xs text-muted-foreground">
                {t("access_codes.success_partner", { partner: result.partner_name })}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
