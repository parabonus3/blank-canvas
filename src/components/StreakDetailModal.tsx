import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone } from "@/hooks/useTimezone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Flame, Shield, CheckCircle2, XCircle, ChevronDown, Gem, ShoppingCart, Trophy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { BuyFreezesDialog } from "@/components/BuyFreezesDialog";
import { useStreakShield, shieldBonusFor, nextShieldMilestone } from "@/hooks/useStreakShield";

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

function tzDateString(date: Date, tz: string): string {
  // YYYY-MM-DD in the given timezone (en-CA always returns ISO-like format)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(isoDate: string, delta: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().split("T")[0];
}

function isoToDate(isoDate: string): Date {
  // Date object at noon UTC — safe for weekday/day-month formatting
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
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
  const { timezone } = useTimezone();
  const [showHistory, setShowHistory] = useState(false);
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const daysToShow = showHistory ? 30 : 7;
  const locale = i18n.language || "en";

  const { status: shield, rescue } = useStreakShield();
  const shieldRemaining = shield?.monthly_remaining ?? remaining;
  const shieldTotal = Math.max(shield?.monthly_allowance ?? total, total);
  const bonus = shield ? shieldBonusFor(shield.best_streak) : 0;
  const milestone = shield ? nextShieldMilestone(shield.best_streak) : null;

  const { data: studiedDates } = useQuery({
    queryKey: ["streakStudiedDates", user?.id, daysToShow, timezone],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToShow - 1);
      startDate.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("time_entries")
        .select("start_time, end_time")
        .eq("user_id", user.id)
        .not("end_time", "is", null)
        .gte("end_time", startDate.toISOString())
        .order("start_time", { ascending: false });

      const dates = new Set<string>();
      data?.forEach((entry) => {
        // Mark BOTH the day the session started AND the day it ended (in user TZ),
        // so sessions crossing midnight count for the day they finished.
        if (entry.start_time) dates.add(tzDateString(new Date(entry.start_time), timezone));
        if (entry.end_time) dates.add(tzDateString(new Date(entry.end_time), timezone));
      });
      return dates;
    },
    enabled: open && !!user,
    staleTime: 30000,
  });

  const freezeSet = new Set(autoUsedDates);
  const todayStr = tzDateString(new Date(), timezone);
  const yesterdayStr = addDays(todayStr, -1);

  const days: { date: Date; dateStr: string; status: DayStatus }[] = [];
  for (let i = daysToShow - 1; i >= 0; i--) {
    const dateStr = addDays(todayStr, -i);
    const d = isoToDate(dateStr);

    let status: DayStatus;
    if (dateStr > todayStr) {
      status = "future";
    } else if (studiedDates?.has(dateStr)) {
      status = "studied";
    } else if (freezeSet.has(dateStr)) {
      status = "freeze";
    } else if (dateStr === todayStr) {
      status = "future";
    } else {
      status = "missed";
    }
    days.push({ date: d, dateStr, status });
  }


  const weekdayShort = (date: Date) =>
    date.toLocaleDateString(locale, { weekday: "short" }).replace(".", "");
  const dayMonth = (date: Date) =>
    date.toLocaleDateString(locale, { day: "numeric", month: "numeric" });
  const fullDate = (date: Date) =>
    date.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });

  const tooltipFor = (status: DayStatus, date: Date) => {
    const d = fullDate(date);
    if (status === "studied") return t("streak.tooltip_studied", { date: d });
    if (status === "freeze") return t("streak.tooltip_freeze", { date: d });
    if (status === "missed") return t("streak.tooltip_missed", { date: d });
    return t("streak.tooltip_future", { date: d });
  };

  const labelFor = (date: Date, dateStr: string) => {
    if (dateStr === todayStr) return t("streak.today");
    if (dateStr === yesterdayStr) return t("streak.yesterday");
    return weekdayShort(date);
  };

  // Group days into weeks for history view
  const renderDay = ({ date, dateStr, status }: { date: Date; dateStr: string; status: DayStatus }) => {
    const isToday = dateStr === todayStr;
    const isYesterday = dateStr === yesterdayStr;
    return (
      <Tooltip key={dateStr}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex flex-col items-center gap-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md p-0.5"
          >
            <span
              className={cn(
                "text-[10px] font-medium leading-tight",
                isToday ? "text-primary font-bold" : "text-muted-foreground",
                isYesterday && "text-foreground/80"
              )}
            >
              {labelFor(date, dateStr)}
            </span>
            <div
              className={cn(
                "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all",
                status === "studied" && "bg-green-500/20 ring-2 ring-green-500",
                status === "freeze" && "bg-blue-500/20 ring-2 ring-blue-500 animate-pulse",
                status === "missed" && "bg-destructive/10 ring-2 ring-destructive/40",
                status === "future" && "bg-muted ring-1 ring-border",
                isToday && "ring-offset-2 ring-offset-background"
              )}
            >
              {status === "studied" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {status === "freeze" && <Shield className="h-4 w-4 text-blue-500" />}
              {status === "missed" && <XCircle className="h-3.5 w-3.5 text-destructive/60" />}
              {status === "future" && (
                <span className="text-[10px] font-medium text-muted-foreground">
                  {date.getDate()}
                </span>
              )}
            </div>
            <span
              className={cn(
                "text-[9px] tabular-nums leading-tight",
                isToday ? "text-primary font-semibold" : "text-muted-foreground/70"
              )}
            >
              {dayMonth(date)}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6} collisionPadding={12} className="max-w-[min(260px,calc(100vw-32px))] text-xs">
          {tooltipFor(status, date)}
        </TooltipContent>
      </Tooltip>
    );
  };

  // For history (30 days), chunk by ISO week start (Monday)
  const weekChunks: { label: string; items: typeof days }[] = [];
  if (showHistory) {
    const weekKey = (d: Date) => {
      const date = new Date(d);
      const day = (date.getDay() + 6) % 7; // Mon=0
      date.setDate(date.getDate() - day);
      return date.toISOString().split("T")[0];
    };
    const map = new Map<string, typeof days>();
    for (const item of days) {
      const k = weekKey(item.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(item);
    }
    for (const [k, items] of map) {
      const start = new Date(k);
      weekChunks.push({
        label: t("streak.week_of", { date: dayMonth(start) }),
        items,
      });
    }
  }

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

          {/* Timeline */}
          <TooltipProvider delayDuration={150}>
            <div className="mt-4">
              {!showHistory ? (
                <div className="grid gap-1 grid-cols-7">
                  {days.map(renderDay)}
                </div>
              ) : (
                <div className="space-y-3">
                  {weekChunks.map((wk) => (
                    <div key={wk.label}>
                      <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                        {wk.label}
                      </div>
                      <div className="grid gap-1 grid-cols-7">
                        {wk.items.map(renderDay)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TooltipProvider>

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
                {shieldRemaining} / {shieldTotal}
              </span>
            </div>
            <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-2 flex flex-col items-center">
              <Gem className="h-4 w-4 text-purple-500 mb-0.5" />
              <span className="text-xs text-muted-foreground">{t("streak.purchased_balance")}</span>
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                {status?.purchased_balance ?? purchasedBalance}
              </span>
            </div>
          </div>

          {/* Escudo proporcional + segunda chance */}
          {status && (
            <div className="mt-3 rounded-xl border bg-gradient-to-br from-orange-500/10 to-amber-500/5 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  {t("streak.best_ever")}
                </div>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400 tabular-nums">
                  {status.best_streak} {t("streak.days_short")}
                </span>
              </div>

              {bonus > 0 && (
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {t("streak.shield_bonus_active", { bonus })}
                </p>
              )}
              {milestone && (
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {t("streak.shield_next_milestone", {
                    days: milestone,
                    remaining: Math.max(0, milestone - status.best_streak),
                  })}
                </p>
              )}

              {status.rescue_available ? (
                <>
                  <p className="text-[11px] text-foreground/80 leading-snug">
                    {t("streak.rescue_offer", {
                      days: status.rescue_days_cover,
                      streak: status.best_streak,
                    })}
                  </p>
                  <Button
                    onClick={() => rescue.mutate()}
                    disabled={rescue.isPending}
                    className="w-full min-h-11 bg-orange-500 hover:bg-orange-600 text-primary-foreground"
                  >
                    <Sparkles className="h-4 w-4 me-2" />
                    {t("streak.rescue_cta")}
                  </Button>
                </>
              ) : status.rescue_next_available_in > 0 ? (
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {t("streak.rescue_cooldown", { days: status.rescue_next_available_in })}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {t("streak.rescue_hint")}
                </p>
              )}
            </div>
          )}


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
