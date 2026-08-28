import { useTranslation } from "react-i18next";
import { Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useFocusStats } from "@/hooks/useFocusCommitments";
import { cn } from "@/lib/utils";

/** Relatório de foco e distrações dos últimos 30 dias. */
export function FocusReportCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { data } = useFocusStats(30);

  if (!data || data.total === 0) return null;

  const topReasons = data.reasons.slice(0, 3);
  const maxCount = topReasons[0]?.count || 1;

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-primary" />
            {t("focus.report_title", "Foco nos últimos 30 dias")}
          </h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            {data.completed}/{data.total}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("focus.success_rate", "Metas cumpridas")}
            </p>
            <p className="text-lg font-bold tabular-nums text-primary">{data.successRate}%</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("focus.focused_time", "Tempo em foco")}
            </p>
            <p className="text-lg font-bold tabular-nums">
              {Math.floor(data.focusedMinutes / 60)}h {data.focusedMinutes % 60}m
            </p>
          </div>
        </div>

        {topReasons.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("focus.top_reasons", "O que mais te interrompe")}
            </p>
            {topReasons.map((r) => (
              <div key={r.reason} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span>{t(`focus.reason.${r.reason}`, r.reason)}</span>
                  <span className="tabular-nums text-muted-foreground">{r.count}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full bg-orange-500")}
                    style={{ width: `${Math.round((r.count / maxCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
