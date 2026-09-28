export type CompleteWeek = { focusSeconds: number; completedTasks: number; distanceByType: Record<string, number> };
export type WeeklySuggestion = { source: "time" | "tasks" | "distance"; activityType?: string; weeklyValue: number; annualTarget: number };

/** Only use four complete weeks. Exclude a metric with fewer than three active weeks. */
export function suggestFromWeeks(weeks: CompleteWeek[]): WeeklySuggestion[] {
  if (weeks.length !== 4) return [];
  const metrics: { source: WeeklySuggestion["source"]; activityType?: string; values: number[] }[] = [
    { source: "time", values: weeks.map(w => w.focusSeconds / 3600) },
    { source: "tasks", values: weeks.map(w => w.completedTasks) },
    ...["run", "walk", "bike", "hike"].map(activityType => ({ source: "distance" as const, activityType, values: weeks.map(w => w.distanceByType[activityType] || 0) })),
  ];
  return metrics.flatMap(({ source, activityType, values }) => {
    if (values.some(v => !Number.isFinite(v) || v < 0) || values.filter(v => v > 0).length < 3) return [];
    const sorted = [...values].sort((a, b) => a - b);
    const median = (sorted[1] + sorted[2]) / 2;
    // Reject anomalous spikes instead of recommending unreachable targets.
    if (median <= 0 || sorted[3] > median * 3) return [];
    const weeklyValue = Math.round((values.reduce((sum, v) => sum + v, 0) / 4) * 10) / 10;
    return [{ source, activityType, weeklyValue, annualTarget: Math.max(1, Math.round(weeklyValue * 52)) }];
  }).slice(0, 3);
}
