import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flame, Shield, CheckCircle2, XCircle, ChevronDown, Gem, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { BuyFreezesDialog } from "@/components/BuyFreezesDialog";

interface StreakDetailModalProps {
  open: boolean;
  onClose: () => void;
  streak: number;
  autoUsedDates: string[];
  remaining: number;
  hasFreezes: boolean;
  purchasedBalance?: number;
  total?: number;
}

type DayStatus = "studied" | "freeze" | "missed" | "future";

function getDayName(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { weekday: "short" });
}

function getDayNumber(date: Date): number {
  return date.getDate();
}

function getDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function StreakDetailModal({
  open,
  onClose,
  streak,
  autoUsedDates,
  remaining,
  hasFreezes,
  purchasedBalance = 0,
  total = 0,
}: StreakDetailModalProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const daysToShow = showHistory ? 30 : 7;

  const { data: studiedDates } = useQuery({
    queryKey: ["streakStudiedDates", user?.id, daysToShow],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToShow);
      startDate.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("time_entries")
        .select("start_time")
        .eq("user_id", user.id)
        .not("end_time", "is", null)
        .gte("start_time", startDate.toISOString())
        .order("start_time", { ascending: false });

      const dates = new Set<string>();
      data?.forEach((entry) => {
        dates.add(new Date(entry.start_time).toISOString().split("T")[0]);
      });
      return dates;
    },
    enabled: open && !!user,
    staleTime: 30000,
  });

  const freezeSet = new Set(autoUsedDates);
  const today = new Date();
  const todayStr = getDateString(today);

  const days: { date: Date; dateStr: string; status: DayStatus }[] = [];
  for (let i = daysToShow - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dateStr = getDateString(d);

    let status: DayStatus;
    if (dateStr > todayStr) {
      status = "future";
    } else if (studiedDates?.has(dateStr)) {
      status = "studied";
    } else if (freezeSet.has(dateStr)) {
      status = "freeze";
    } else if (dateStr === todayStr) {
      status = studiedDates?.has(dateStr) ? "studied" : "future";
    } else {
      status = "missed";
    }
    days.push({ date: d, dateStr, status });
  }

  const locale = i18n.language || "en";

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-sm sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">{t("streak.detail_title")}</DialogTitle>
          </DialogHeader>

          {/* Streak count */}
          <div className="flex flex-col items-center gap-1 pt-2">
            <div className="relative">
              <Flame className="h-12 w-12 text-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.5)] animate-pulse" />
            </div>
            <span className="text-4xl font-black text-orange-600 dark:text-orange-400">
              {streak}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {t("streak.detail_title")}
            </span>
          </div>

          {/* Timeline grid */}
          <div className="mt-4">
            <div className={cn("grid gap-1.5 grid-cols-7")}>
              {days.map(({ date, dateStr, status }) => (
                <div key={dateStr} className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {getDayName(date, locale)}
                  </span>
                  <div
                    className={cn(
                      "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all",
                      status === "studied" && "bg-green-500/20 ring-2 ring-green-500",
                      status === "freeze" && "bg-blue-500/20 ring-2 ring-blue-500 animate-pulse",
                      status === "missed" && "bg-destructive/10 ring-2 ring-destructive/40",
                      status === "future" && "bg-muted ring-1 ring-border",
                      dateStr === todayStr && "ring-offset-2 ring-offset-background"
                    )}
                  >
                    {status === "studied" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {status === "freeze" && <Shield className="h-4 w-4 text-blue-500" />}
                    {status === "missed" && <XCircle className="h-3.5 w-3.5 text-destructive/60" />}
                    {status === "future" && (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {getDayNumber(date)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {t("streak.studied")}
            </div>
            {hasFreezes && (
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-blue-500" />
                {t("streak.freeze_used")}
              </div>
            )}
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-destructive/60" />
              {t("streak.no_activity")}
            </div>
          </div>

          {/* Balances */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 flex flex-col items-center">
              <Shield className="h-4 w-4 text-blue-500 mb-0.5" />
              <span className="text-xs text-muted-foreground">{t("streak.monthly_balance")}</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {remaining} / {total}
              </span>
            </div>
            <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-2 flex flex-col items-center">
              <Gem className="h-4 w-4 text-purple-500 mb-0.5" />
              <span className="text-xs text-muted-foreground">{t("streak.purchased_balance")}</span>
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                {purchasedBalance}
              </span>
            </div>
          </div>

          {/* Buy CTA */}
          <Button
            onClick={() => setShowBuyDialog(true)}
            variant="outline"
            className="w-full mt-2 border-purple-500/40 hover:bg-purple-500/10 min-h-11"
          >
            <ShoppingCart className="h-4 w-4 me-2" />
            {t("streak.buy_more_cta")}
          </Button>

          {/* History toggle */}
          {!showHistory && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-1"
              onClick={() => setShowHistory(true)}
            >
              <ChevronDown className="h-4 w-4 me-1" />
              {t("streak.view_history")}
            </Button>
          )}

          {/* Motivational */}
          <p className="text-center text-sm text-muted-foreground mt-2 italic">
            {t("streak.motivational")}
          </p>
        </DialogContent>
      </Dialog>

      <BuyFreezesDialog open={showBuyDialog} onClose={() => setShowBuyDialog(false)} />
    </>
  );
}
