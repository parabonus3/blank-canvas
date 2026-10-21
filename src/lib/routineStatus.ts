import { localDateKey } from "./timesheet";

export type RoutineDayStatus = "done" | "partial" | "missed" | "pending" | "none";

export interface RoutineRunRow {
  routine_id: string;
  local_date: string;
  status: "started" | "completed" | "partial";
  steps_done: number;
  steps_skipped: number;
  ended_at: string | null;
}

/** Day-of-week (0=Sunday) for a YYYY-MM-DD key, independent of device timezone. */
export function weekdayOfKey(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function shiftKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/**
 * Status of one routine on one profile-local day.
 * done: a run finished every step (none skipped). partial: started and stopped/skipped.
 * missed: scheduled weekday already over with no run. pending: scheduled today, not run yet.
 * none: not scheduled and not run.
 */
export function routineDayStatus(
  runs: RoutineRunRow[],
  weekdays: number[],
  dayKey: string,
  todayKey: string,
): RoutineDayStatus {
  const dayRuns = runs.filter((r) => r.local_date === dayKey);
  if (dayRuns.some((r) => r.status === "completed" && r.steps_skipped === 0)) return "done";
  if (dayRuns.length > 0) {
    const active = dayRuns.some((r) => r.status === "started" && !r.ended_at);
    if (active && dayKey === todayKey) return "pending";
    return "partial";
  }
  const scheduled = weekdays.includes(weekdayOfKey(dayKey));
  if (!scheduled) return "none";
  return dayKey < todayKey ? "missed" : "pending";
}

export function lastDaysKeys(todayKey: string, count = 7): string[] {
  return Array.from({ length: count }, (_, i) => shiftKey(todayKey, i - count + 1));
}

export function todayKeyFor(timezone: string, now: Date = new Date()): string {
  return localDateKey(now.toISOString(), timezone);
}

export function weeklyRoutineSummary(statuses: RoutineDayStatus[]) {
  return {
    done: statuses.filter((s) => s === "done").length,
    partial: statuses.filter((s) => s === "partial").length,
    missed: statuses.filter((s) => s === "missed").length,
  };
}
