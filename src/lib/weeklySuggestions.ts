export type CompleteWeek = { focusSecondsByProject: Record<string, number>; completedTasks: number; distanceByType: Record<string, number> };
export type WeeklySuggestion = { source: "time" | "tasks" | "distance"; sourceProjectId?: string; activityType?: string; weeklyValue: number; annualTarget: number };

/** Only use four complete weeks. Exclude a metric with fewer than three active weeks. */
export function suggestFromWeeks(weeks: CompleteWeek[]): WeeklySuggestion[] {
  if (weeks.length !== 4) return [];
  const projectIds = [...new Set(weeks.flatMap(week => Object.keys(week.focusSecondsByProject)))];
  const metrics: { source: WeeklySuggestion["source"]; sourceProjectId?: string; activityType?: string; values: number[] }[] = [
    ...projectIds.map(sourceProjectId => ({ source: "time" as const, sourceProjectId, values: weeks.map(w => (w.focusSecondsByProject[sourceProjectId] || 0) / 3600) })),
    { source: "tasks", values: weeks.map(w => w.completedTasks) },
    ...["run", "walk", "bike", "hike"].map(activityType => ({ source: "distance" as const, activityType, values: weeks.map(w => w.distanceByType[activityType] || 0) })),
  ];
  return metrics.flatMap(({ source, sourceProjectId, activityType, values }) => {
    if (values.some(v => !Number.isFinite(v) || v < 0) || values.filter(v => v > 0).length < 3) return [];
    const sorted = [...values].sort((a, b) => a - b);
    const median = (sorted[1] + sorted[2]) / 2;
    // Reject anomalous spikes instead of recommending unreachable targets.
    if (median <= 0 || sorted[3] > median * 3) return [];
    const weeklyValue = Math.round((values.reduce((sum, v) => sum + v, 0) / 4) * 10) / 10;
    return [{ source, sourceProjectId, activityType, weeklyValue, annualTarget: Math.max(1, Math.round(weeklyValue * 52)) }];
  }).slice(0, 3);
}
