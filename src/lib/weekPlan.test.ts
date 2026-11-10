import { describe, it, expect } from "vitest";
import { weekDays, plannedByDay, copyDayToEmptyDays } from "./weekPlan";

const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m, d, h, min).toISOString();

describe("weekPlan", () => {
  it("semana começa na segunda e termina no domingo", () => {
    const days = weekDays(new Date(2026, 9, 29, 15)); // quinta 29/10
    expect(days[0].getDay()).toBe(1);
    expect(days[0].getDate()).toBe(26);
    expect(days[6].getDay()).toBe(0);
    expect(days[6].getDate()).toBe(1);
  });

  it("domingo pertence à semana que começou na segunda anterior", () => {
    expect(weekDays(new Date(2026, 10, 1, 10))[0].getDate()).toBe(26);
  });

  it("soma minutos planejados por dia", () => {
    const days = weekDays(new Date(2026, 9, 29));
    const res = plannedByDay([
      { title: "a", project_id: null, task_id: null, start_at: at(2026, 9, 26, 9), end_at: at(2026, 9, 26, 10) },
      { title: "b", project_id: null, task_id: null, start_at: at(2026, 9, 26, 14), end_at: at(2026, 9, 26, 14, 30) },
    ], days);
    expect(res[0].minutes).toBe(90);
    expect(res[1].minutes).toBe(0);
  });

  it("copia só para dias vazios, com mesma hora e duração", () => {
    const days = weekDays(new Date(2026, 9, 29));
    const src = [{ title: "Estudo", project_id: "p", task_id: null, start_at: at(2026, 9, 26, 8), end_at: at(2026, 9, 26, 9, 30) }];
    const targets = [{ day: days[1], blocks: [] }, { day: days[2], blocks: [{}] }];
    const out = copyDayToEmptyDays(src, targets);
    expect(out).toHaveLength(1);
    expect(new Date(out[0].start_at).getDate()).toBe(27);
    expect(new Date(out[0].start_at).getHours()).toBe(8);
    expect((new Date(out[0].end_at).getTime() - new Date(out[0].start_at).getTime()) / 60000).toBe(90);
  });
});

import { shiftedWeekStart, clampWeekOffset, copyWeekToEmptyDays, currentOrNextBlock, weekDays as wd2 } from "./weekPlan";

describe("planejar próximas semanas", () => {
  const fri = new Date(2026, 10, 13, 18, 0); // sexta 13/nov
  it("próxima semana começa na segunda seguinte", () => {
    const s = shiftedWeekStart(fri, 1);
    expect([s.getFullYear(), s.getMonth(), s.getDate(), s.getDay()]).toEqual([2026, 10, 16, 1]);
  });
  it("limita a 8 semanas à frente e 4 atrás", () => {
    expect(clampWeekOffset(20)).toBe(8);
    expect(clampWeekOffset(-9)).toBe(-4);
  });
  it("copia a semana anterior só nos dias vazios", () => {
    const thisWeek = wd2(fri);
    const prev = [{ title: "OAB", project_id: null, task_id: null, start_at: new Date(2026, 10, 10, 9).toISOString(), end_at: new Date(2026, 10, 10, 10).toISOString() }]; // terça
    const next = wd2(shiftedWeekStart(fri, 1));
    const target = next.map((day, i) => ({ day, blocks: i === 1 ? [{}] : [] }));
    expect(copyWeekToEmptyDays(prev, target, fri)).toHaveLength(0);
    const empty = next.map((day) => ({ day, blocks: [] }));
    const rows = copyWeekToEmptyDays(prev, empty, fri);
    expect(rows).toHaveLength(1);
    expect(new Date(rows[0].start_at).getDate()).toBe(17);
    expect(new Date(rows[0].start_at).getHours()).toBe(9);
    expect(thisWeek).toHaveLength(7);
  });
  it("não copia para dias que já passaram", () => {
    const prev = [{ title: "x", project_id: null, task_id: null, start_at: new Date(2026, 10, 3, 9).toISOString(), end_at: new Date(2026, 10, 3, 10).toISOString() }];
    const cur = wd2(fri).map((day) => ({ day, blocks: [] }));
    expect(copyWeekToEmptyDays(prev, cur, fri)).toHaveLength(0); // terça 10 já passou
  });
  it("encontra bloco atual, próximo ou que ficou para trás", () => {
    const b = (h: number, extra = {}) => ({ id: String(h), title: "b", project_id: null, task_id: null, is_done: false, time_entry_id: null, start_at: new Date(2026, 10, 13, h).toISOString(), end_at: new Date(2026, 10, 13, h + 1).toISOString(), ...extra });
    expect(currentOrNextBlock([b(18)], fri)?.state).toBe("now");
    expect(currentOrNextBlock([b(20)], fri)?.state).toBe("next");
    expect(currentOrNextBlock([b(9)], fri)?.state).toBe("missed");
    expect(currentOrNextBlock([b(9, { is_done: true })], fri)).toBeNull();
  });
});

import { blockAfter as _ba, dayBlocksProgress as _dp } from "./weekPlan";
describe("NowCard helpers", () => {
  const now = new Date(2026, 10, 9, 10, 0);
  const mk = (id: string, h: number, extra: any = {}) => ({ id, title: id, project_id: null, task_id: null, start_at: new Date(2026, 10, 9, h).toISOString(), end_at: new Date(2026, 10, 9, h + 1).toISOString(), ...extra });
  it("blockAfter returns the next open block after the current one", () => {
    const bs = [mk("a", 10), mk("b", 12, { is_done: true }), mk("c", 14)];
    expect(_ba(bs, "a", now)?.id).toBe("c");
  });
  it("dayBlocksProgress counts done and linked blocks", () => {
    const bs = [mk("a", 8, { time_entry_id: "x" }), mk("b", 9, { is_done: true }), mk("c", 14)];
    expect(_dp(bs, now)).toEqual({ done: 2, total: 3 });
  });
});
