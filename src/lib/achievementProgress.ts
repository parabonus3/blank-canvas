import { localDateKey } from './timesheet';

export interface AchievementEntry { start_time: string; duration: number | null }

export function achievementYearWindow(year: number) {
  // Broad UTC envelope followed by exact profile-local filtering: robust across DST.
  return { start: new Date(Date.UTC(year - 1, 11, 30)).toISOString(), end: new Date(Date.UTC(year + 1, 0, 3)).toISOString() };
}

export function aggregateAchievementYear(entries: AchievementEntry[], year: number, timezone: string) {
  const daily = new Map<string, number>();
  const monthlySeconds = Array<number>(12).fill(0);
  let totalSeconds = 0;
  for (const entry of entries) {
    const day = localDateKey(entry.start_time, timezone);
    if (Number(day.slice(0, 4)) !== year) continue;
    const seconds = Math.max(0, entry.duration ?? 0);
    totalSeconds += seconds;
    monthlySeconds[Number(day.slice(5, 7)) - 1] += seconds;
    daily.set(day, (daily.get(day) ?? 0) + seconds / 3600);
  }
  return { totalSeconds, monthlySeconds, dailyData: [...daily].sort(([a], [b]) => a.localeCompare(b)).map(([date, hours]) => ({ date, hours })) };
}