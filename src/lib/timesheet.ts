export interface SheetEntry {
  id: string; project_id: string; start_time: string; end_time: string | null; duration: number | null;
  task_id: string | null;
  project: { name: string; category: { name: string } | null } | null;
  task: { id: string; estimated_minutes: number | null } | null;
}
export function localDateKey(date: Date | string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(date));
  const get = (key: string) => parts.find(p => p.type === key)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function aggregateTimesheet(entries: SheetEntry[], start: string, end: string, timezone: string) {
  const groups = new Map<string, { projectId: string; project: string; category: string; seconds: number; sessions: number; days: Set<string>; tasks: Map<string, number> }>();
  for (const entry of entries) {
    if (!entry.end_time || !entry.duration || entry.duration < 0) continue;
    const day = localDateKey(entry.start_time, timezone);
    if (day < start || day > end) continue;
    const row = groups.get(entry.project_id) || { projectId: entry.project_id, project: entry.project?.name || "", category: entry.project?.category?.name || "", seconds: 0, sessions: 0, days: new Set<string>(), tasks: new Map<string, number>() };
    row.seconds += entry.duration; row.sessions++; row.days.add(day);
    if (entry.task && entry.task.estimated_minutes && entry.task.estimated_minutes > 0) row.tasks.set(entry.task.id, entry.task.estimated_minutes);
    groups.set(entry.project_id, row);
  }
  const rows = [...groups.values()].map(row => ({ ...row, days: row.days.size, estimatedMinutes: [...row.tasks.values()].reduce((a,b) => a+b,0) })).sort((a,b) => a.category.localeCompare(b.category) || a.project.localeCompare(b.project));
  const days = new Set(entries.filter(e => e.end_time && (e.duration || 0) > 0).map(e => localDateKey(e.start_time, timezone)).filter(d => d >= start && d <= end));
  return { rows, seconds: rows.reduce((n,r) => n+r.seconds,0), days: days.size };
}
export function sheetDuration(seconds: number) {
  return `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}`;
}