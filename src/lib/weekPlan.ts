/** Planejamento semanal: dias de segunda a domingo (hora local do dispositivo, como os blocos da agenda). */
export interface PlanBlock { start_at: string; end_at: string; title: string; project_id: string | null; task_id: string | null }

export function startOfWeekMonday(ref: Date): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() + 6) % 7; // segunda = 0
  d.setDate(d.getDate() - diff);
  return d;
}

export const MAX_WEEKS_AHEAD = 8;
export const MAX_WEEKS_BACK = 4;

/** Segunda-feira da semana deslocada `offset` semanas a partir de `ref` (seguro em DST: usa setDate). */
export function shiftedWeekStart(ref: Date, offset: number): Date {
  const s = startOfWeekMonday(ref);
  s.setDate(s.getDate() + offset * 7);
  return s;
}

export function clampWeekOffset(n: number) {
  return Math.max(-MAX_WEEKS_BACK, Math.min(MAX_WEEKS_AHEAD, n));
}

/**
 * Copia os blocos da semana anterior para os mesmos dias da semana destino,
 * apenas nos dias que ainda estão vazios e não passaram.
 */
export function copyWeekToEmptyDays<T extends PlanBlock>(prevBlocks: T[], target: { day: Date; blocks: unknown[] }[], now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out: PlanBlock[] = [];
  for (const t of target) {
    if (t.blocks.length > 0 || t.day < today) continue;
    const wd = t.day.getDay();
    const src = prevBlocks.filter((b) => new Date(b.start_at).getDay() === wd);
    out.push(...copyDayToEmptyDays(src, [t]));
  }
  return out;
}

/** Bloco em andamento ou o próximo de hoje, ainda não feito. */
export function currentOrNextBlock<T extends PlanBlock & { is_done?: boolean; time_entry_id?: string | null }>(blocks: T[], now = new Date()) {
  const open = blocks
    .filter((b) => !b.is_done && !b.time_entry_id && sameLocalDay(new Date(b.start_at), now))
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  const t = now.getTime();
  const current = open.find((b) => new Date(b.start_at).getTime() <= t && new Date(b.end_at).getTime() > t);
  if (current) return { block: current, state: "now" as const };
  const next = open.find((b) => new Date(b.start_at).getTime() > t);
  if (next) return { block: next, state: "next" as const };
  const missed = open.filter((b) => new Date(b.end_at).getTime() <= t).pop();
  if (missed) return { block: missed, state: "missed" as const };
  return null;
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

/** Próximo bloco aberto de hoje depois do bloco informado (para a linha "Depois"). */
export function blockAfter<T extends PlanBlock & { id: string; is_done?: boolean; time_entry_id?: string | null }>(blocks: T[], currentId: string, now = new Date()) {
  const cur = blocks.find((b) => b.id === currentId);
  if (!cur) return null;
  return blocks
    .filter((b) => b.id !== currentId && !b.is_done && !b.time_entry_id && sameLocalDay(new Date(b.start_at), now) && b.start_at >= cur.start_at)
    .sort((a, b) => a.start_at.localeCompare(b.start_at))[0] ?? null;
}

/** Quantos blocos de hoje já foram feitos (marcados ou com sessão vinculada). */
export function dayBlocksProgress<T extends PlanBlock & { is_done?: boolean; time_entry_id?: string | null }>(blocks: T[], now = new Date()) {
  const today = blocks.filter((b) => sameLocalDay(new Date(b.start_at), now));
  return { done: today.filter((b) => b.is_done || !!b.time_entry_id).length, total: today.length };
}
