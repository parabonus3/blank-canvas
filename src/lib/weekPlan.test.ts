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
