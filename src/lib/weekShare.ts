/** Resumo semanal para compartilhar: dias locais do perfil, semana de segunda a domingo. */
export interface ShareEntry { start_time: string; duration: number | null }

export function localDayKey(iso: string | Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export function summarizeWeek(entries: ShareEntry[], timezone: string) {
  const byDay = new Map<string, number>();
  for (const e of entries) {
    const s = Math.max(0, e.duration ?? 0);
    if (!s) continue;
    const k = localDayKey(e.start_time, timezone);
    byDay.set(k, (byDay.get(k) ?? 0) + s);
  }
  let best: { key: string; seconds: number } | null = null;
  byDay.forEach((seconds, key) => { if (!best || seconds > best.seconds) best = { key, seconds }; });
  const totalSeconds = [...byDay.values()].reduce((a, b) => a + b, 0);
  return { totalSeconds, activeDays: byDay.size, best: best as { key: string; seconds: number } | null };
}

export function formatHm(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h${String(m).padStart(2, "0")}`;
}
