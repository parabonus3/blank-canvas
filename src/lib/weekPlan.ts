/** Planejamento semanal: dias de segunda a domingo (hora local do dispositivo, como os blocos da agenda). */
export interface PlanBlock { start_at: string; end_at: string; title: string; project_id: string | null; task_id: string | null }

export function startOfWeekMonday(ref: Date): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() + 6) % 7; // segunda = 0
  d.setDate(d.getDate() - diff);
  return d;
}

export function weekDays(ref: Date): Date[] {
  const start = startOfWeekMonday(ref);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function sameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function blockMinutes(b: Pick<PlanBlock, "start_at" | "end_at">) {
  return Math.max(0, Math.round((new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 60000));
}

export function plannedByDay<T extends PlanBlock>(blocks: T[], days: Date[]) {
  return days.map((day) => {
    const list = blocks.filter((b) => sameLocalDay(new Date(b.start_at), day));
    return { day, blocks: list, minutes: list.reduce((s, b) => s + blockMinutes(b), 0) };
  });
}

/**
 * Copia os blocos de um dia para os dias seguintes da semana que ainda estão vazios,
 * mantendo hora local e duração. Nunca duplica em dias que já têm algo planejado.
 */
export function copyDayToEmptyDays<T extends PlanBlock>(source: T[], targets: { day: Date; blocks: unknown[] }[]) {
  const out: PlanBlock[] = [];
  for (const t of targets) {
    if (t.blocks.length > 0) continue;
    for (const b of source) {
      const s = new Date(b.start_at);
      const start = new Date(t.day);
      start.setHours(s.getHours(), s.getMinutes(), 0, 0);
      const end = new Date(start.getTime() + blockMinutes(b) * 60000);
      out.push({ title: b.title, project_id: b.project_id, task_id: b.task_id, start_at: start.toISOString(), end_at: end.toISOString() });
    }
  }
  return out;
}
