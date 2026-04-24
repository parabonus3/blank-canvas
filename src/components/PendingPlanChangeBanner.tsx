import { useTranslation } from "react-i18next";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { X, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";

export function PendingPlanChangeBanner() {
  const { t } = useTranslation();
  const { pendingChange, refreshSubscription } = useSubscription();
  const { session } = useAuth();
  const { toast } = useToast();
  const [cancelling, setCancelling] = useState(false);

  if (!pendingChange) return null;

  const effectiveDate = format(new Date(pendingChange.effectiveDate), "dd/MM/yyyy");

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-subscription", {
        body: { cancelPendingChange: true },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await refreshSubscription();
      toast({ title: t("common.success"), description: t("pricing.change_cancelled") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-accent/50 border-b border-border px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
        <span>
          {t("pricing.pending_change_message", {
            plan: pendingChange.newTier.charAt(0).toUpperCase() + pendingChange.newTier.slice(1),
            date: effectiveDate,
          })}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCancel}
        disabled={cancelling}
        className="shrink-0"
      >
        <X className="h-3 w-3 mr-1" />
        {t("pricing.cancel_change")}
      </Button>
    </div>
  );
}
