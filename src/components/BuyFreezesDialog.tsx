import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Minus, Plus, Loader2 } from "lucide-react";
import { useFreezePurchase } from "@/hooks/useFreezePurchase";
import {
  STREAK_FREEZE_PACK_SIZE,
  STREAK_FREEZE_PACK_PRICE_USD,
} from "@/lib/stripePlans";

interface BuyFreezesDialogProps {
  open: boolean;
  onClose: () => void;
}

const MIN_QTY = 1;
const MAX_QTY = 50;

export function BuyFreezesDialog({ open, onClose }: BuyFreezesDialogProps) {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(1);
  const { purchase, isPurchasing } = useFreezePurchase();

  const totalFreezes = quantity * STREAK_FREEZE_PACK_SIZE;
  const totalPrice = quantity * STREAK_FREEZE_PACK_PRICE_USD;

  const dec = () => setQuantity((q) => Math.max(MIN_QTY, q - 1));
  const inc = () => setQuantity((q) => Math.min(MAX_QTY, q + 1));

  const handleBuy = async () => {
    await purchase(quantity);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isPurchasing && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            {t("streak.buy_dialog_title")}
          </DialogTitle>
          <DialogDescription>{t("streak.buy_dialog_desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t("streak.buy_quantity")}
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={dec}
                disabled={quantity <= MIN_QTY || isPurchasing}
                className="min-h-11 min-w-11"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={MIN_QTY}
                max={MAX_QTY}
                value={quantity}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (Number.isFinite(v)) {
                    setQuantity(Math.max(MIN_QTY, Math.min(MAX_QTY, v)));
                  }
                }}
                className="text-center text-lg font-semibold min-h-11"
                disabled={isPurchasing}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={inc}
                disabled={quantity >= MAX_QTY || isPurchasing}
                className="min-h-11 min-w-11"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-lg">
              <Shield className="h-5 w-5" />
              {totalFreezes}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t("streak.buy_total", { count: totalFreezes, price: totalPrice })}
            </p>
          </div>

          <Button
            onClick={handleBuy}
            disabled={isPurchasing}
            className="w-full min-h-11"
          >
            {isPurchasing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("streak.buy_button")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
