import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export function useFreezePurchase() {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const purchase = async (quantity = 1) => {
    setIsPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-freeze-purchase", {
        body: { quantity },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");
      window.open(data.url, "_blank");
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  return { purchase, isPurchasing };
}
