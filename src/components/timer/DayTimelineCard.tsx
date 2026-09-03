import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock3, Plus, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useTimezone } from "@/hooks/useTimezone";
import { startOfDayInTz, endOfDayInTz } from "@/lib/timezone";
import { ManualTimeEntryDialog } from "@/components/ManualTimeEntryDialog";
import { cn } from "@/lib/utils";

const MIN_GAP_MINUTES = 15;

function fmtHM(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  return `${m}m`;
}

interface Segment {
  kind: "session" | "gap";
  start: Date;
  end: Date;
  seconds: number;
  label?: string;
  color?: string;
}

/** Linha do tempo do dia: sessões, lacunas e preenchimento retroativo. */
export function DayTimelineCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { timezone, formatInTz } = useTimezone();
  const today = new Date();
  const dayStart = useMemo(() => startOfDayInTz(today, timezone), [timezone]);
  const dayEnd = useMemo(() => endOfDayInTz(today, timezone), [timezone]);

  const { data: entries = [] } = useTimeEntries({ startDate: dayStart, endDate: dayEnd });

  const [prefill, setPrefill] = useState<{ start: Date; end: Date } | null>(null);

  const { segments, totalSeconds, gapSeconds } = useMemo(() => {
    const done = entries
      .filter((e) => e.end_time)
      .map((e) => ({
        start: new Date(e.start_time),
        end: new Date(e.end_time as string),
        seconds: e.duration ?? 0,
        label: e.project?.name ?? "",
        color: e.project?.category?.color ?? "hsl(var(--primary))",
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const segs: Segment[] = [];
    let total = 0;
    let gapTotal = 0;
    let cursor: Date | null = null;

    done.forEach((s) => {
      if (cursor) {
        const gapSec = (s.start.getTime() - cursor.getTime()) / 1000;
        if (gapSec >= MIN_GAP_MINUTES * 60) {
          segs.push({ kind: "gap", start: cursor, end: s.start, seconds: gapSec });
          gapTotal += gapSec;
        }
      }
      segs.push({ kind: "session", ...s });
      total += s.seconds;
      cursor = s.end > (cursor ?? s.end) ? s.end : cursor;
    });

    return { segments: segs, totalSeconds: total, gapSeconds: gapTotal };
  }, [entries]);

  const firstStart = segments[0]?.start;
  const lastEnd = segments.length ? segments[segments.length - 1].end : undefined;
  const spanMs = firstStart && lastEnd ? Math.max(1, lastEnd.getTime() - firstStart.getTime()) : 1;

  return (
    <>
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">{t("timeline.title", "Linha do tempo do dia")}</h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              onClick={() => {
                const end = new Date();
                const start = new Date(end.getTime() - 30 * 60 * 1000);
                setPrefill({ start, end });
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("timeline.add_session", "Registrar sessão")}
            </Button>
          </div>

          {segments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("timeline.empty", "Nenhuma sessão registrada hoje ainda.")}
            </p>
          ) : (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {segments.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      width: `${((s.end.getTime() - s.start.getTime()) / spanMs) * 100}%`,
                      backgroundColor: s.kind === "session" ? s.color : undefined,
                    }}
                    className={s.kind === "gap" ? "bg-muted-foreground/15" : undefined}
                    title={s.kind === "session" ? s.label : t("timeline.gap", "Lacuna")}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="tabular-nums">{firstStart && formatInTz(firstStart, "HH:mm")}</span>
                <span>
                  {t("timeline.tracked", "Registrado")}: <b className="text-foreground">{fmtHM(totalSeconds)}</b>
                  {gapSeconds > 0 && (
                    <>
                      {" · "}
                      {t("timeline.gaps", "Lacunas")}: <b className="text-foreground">{fmtHM(gapSeconds)}</b>
                    </>
                  )}
                </span>
                <span className="tabular-nums">{lastEnd && formatInTz(lastEnd, "HH:mm")}</span>
              </div>

              <ul className="space-y-2">
                {segments.map((s, i) =>
                  s.kind === "session" ? (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-3 py-2"
                    >
                      <span
                        className="h-8 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: s.color }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.label}</p>
                        <p className="text-[11px] tabular-nums text-muted-foreground">
                          {formatInTz(s.start, "HH:mm")} – {formatInTz(s.end, "HH:mm")}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold tabular-nums">{fmtHM(s.seconds)}</span>
                    </li>
                  ) : (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => setPrefill({ start: s.start, end: s.end })}
                        className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-start transition-colors hover:border-primary/50 hover:bg-primary/5"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-muted-foreground">
                            {t("timeline.gap_fill", "Lacuna de {{time}} — toque para preencher", {
                              time: fmtHM(s.seconds),
                            })}
                          </p>
                          <p className="text-[11px] tabular-nums text-muted-foreground">
                            {formatInTz(s.start, "HH:mm")} – {formatInTz(s.end, "HH:mm")}
                          </p>
                        </div>
                      </button>
                    </li>
                  ),
                )}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <ManualTimeEntryDialog
        open={!!prefill}
        onOpenChange={(open) => !open && setPrefill(null)}
        initialStart={prefill?.start}
        initialEnd={prefill?.end}
      />
    </>
  );
}
