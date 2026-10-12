import { describe, expect, it } from "vitest";
import { aggregateTimesheet, localDateKey, type SheetEntry } from "./timesheet";
import { readEveryPage } from "./paginatedRead";
import { exceedsEstimate, taskEstimateTotal } from "./taskEstimate";

const entry = (id: string, start_time = "2026-10-01T12:00:00Z"): SheetEntry => ({ id, project_id: "p1", start_time, end_time: "2026-10-01T13:00:00Z", duration: 3600, task_id: "t1", task: { id: "t1", estimated_minutes: 60 }, project: { name: "Study", category: { name: "Learning" } } });
describe("monthly reports", () => {
  it("uses profile-local date at month edges, not UTC", () => {
    expect(localDateKey("2026-10-01T01:00:00Z", "America/Sao_Paulo")).toBe("2026-09-30");
    const report = aggregateTimesheet([entry("a", "2026-10-01T01:00:00Z"), entry("b")], "2026-10-01", "2026-10-31", "America/Sao_Paulo");
    expect(report.seconds).toBe(3600);
  });
  it("keeps DST dates correct", () => {
    expect(localDateKey("2026-11-01T05:30:00Z", "America/New_York")).toBe("2026-11-01");
    expect(localDateKey("2026-11-01T06:30:00Z", "America/New_York")).toBe("2026-11-01");
  });
  it("counts task estimates and worked days once, and excludes ongoing entries", () => {
    const report = aggregateTimesheet([entry("a"), entry("b"), { ...entry("c"), end_time: null }], "2026-10-01", "2026-10-31", "UTC");
    expect(report.seconds).toBe(7200);
    expect(report.days).toBe(1);
    expect(report.rows[0].estimatedMinutes).toBe(60);
  });
  it("reads every row beyond the 1000-row limit", async () => {
    const values = Array.from({length: 2301}, (_,i) => i);
    const rows = await readEveryPage(async (from,to) => values.slice(from,to+1));
    expect(rows.length).toBe(2301);
    expect(rows[2300]).toBe(2300);
  });
});
describe("estimate warnings", () => {
  it("warns strictly above 100%, never at exactly 100%", () => {
    expect(exceedsEstimate(3600,60)).toBe(false);
    expect(exceedsEstimate(3601,60)).toBe(true);
  });
  it("adds active unsaved seconds once without counting pause time", () => {
    expect(taskEstimateTotal(1800,1801)).toBe(3601);
  });
  it("never warns for a missing or zero estimate", () => {
    expect(exceedsEstimate(3600,null)).toBe(false);
    expect(exceedsEstimate(3600,0)).toBe(false);
  });
});