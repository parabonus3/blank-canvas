// Usual focus hour: median local start hour over recent sessions.
// Needs sessions on at least `minDays` distinct local days to be reliable.
export function usualFocusHour(
  starts: { hour: number; date: string }[],
  minDays = 4,
): number | null {
  const days = new Set(starts.map((s) => s.date));
  if (days.size < minDays) return null;
  // One hour per day (the first session of each day) to avoid bias from busy days.
  const firstByDay = new Map<string, number>();
  for (const s of starts) {
    const prev = firstByDay.get(s.date);
    if (prev === undefined || s.hour < prev) firstByDay.set(s.date, s.hour);
  }
  const hours = Array.from(firstByDay.values()).sort((a, b) => a - b);
  return hours[Math.floor((hours.length - 1) / 2)];
}
