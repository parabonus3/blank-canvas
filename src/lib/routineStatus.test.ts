import { describe, expect, it } from "vitest";
import { routineDayStatus, todayKeyFor, weekdayOfKey, type RoutineRunRow } from "./routineStatus";

const run = (p: Partial<RoutineRunRow>): RoutineRunRow => ({
  routine_id: "r", local_date: "2026-10-21", status: "completed", steps_done: 3, steps_skipped: 0, ended_at: "x", ...p,
});
const TODAY = "2026-10-21"; // Wednesday

describe("routineDayStatus", () => {
  it("is green when every step was done", () => {
    expect(routineDayStatus([run({})], [], TODAY, TODAY)).toBe("done");
  });
  it("is orange when stopped in the middle", () => {
    expect(routineDayStatus([run({ status: "partial", steps_done: 1 })], [], TODAY, TODAY)).toBe("partial");
  });
  it("is orange when finished with skipped steps", () => {
    expect(routineDayStatus([run({ steps_skipped: 1 })], [], TODAY, TODAY)).toBe("partial");
  });
  it("is red when a scheduled past day had no run", () => {
    expect(routineDayStatus([], [2], "2026-10-20", TODAY)).toBe("missed");
  });
  it("is not red today before the day ends", () => {
    expect(routineDayStatus([], [3], TODAY, TODAY)).toBe("pending");
  });
  it("is neutral when not scheduled", () => {
    expect(routineDayStatus([], [], "2026-10-20", TODAY)).toBe("none");
  });
  it("uses the profile timezone for the day boundary", () => {
    expect(todayKeyFor("America/Sao_Paulo", new Date("2026-10-22T01:30:00Z"))).toBe("2026-10-21");
    expect(weekdayOfKey("2026-10-21")).toBe(3);
  });
});
