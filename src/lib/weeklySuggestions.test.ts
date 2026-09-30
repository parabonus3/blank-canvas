import { describe, it, expect } from "vitest";
import { suggestFromWeeks, type CompleteWeek } from "./weeklySuggestions";
import { startOfWeekInTz, toTimezone } from "./timezone";

const weeks = (seconds: number[]): CompleteWeek[] => seconds.map(focusSeconds => ({ focusSecondsByProject: { projectA: focusSeconds }, completedTasks: 2, distanceByType: { bike: 4 } }));
describe("weekly goal suggestions", () => {
  it("needs exactly four complete weeks and three active weeks", () => {
    expect(suggestFromWeeks(weeks([3600, 3600, 3600]))).toEqual([]);
    expect(suggestFromWeeks(weeks([3600, 0, 0, 3600])).some(s => s.source === "time")).toBe(false);
  });
  it("suggests distinct units and never inflates abnormal weeks", () => {
    const result = suggestFromWeeks(weeks([3600, 3600, 3600, 3600]));
    expect(result.map(s => s.source)).toEqual(["time", "tasks", "distance"]);
    expect(result[0].annualTarget).toBe(52);
    expect(result[0].sourceProjectId).toBe("projectA");
    expect(result[2].activityType).toBe("bike");
    expect(suggestFromWeeks(weeks([3600, 3600, 3600, 36000])).some(s => s.source === "time")).toBe(false);
  });
});
describe("weekly boundaries", () => {
  it("starts Monday in the profile timezone, even at DST changes", () => {
    for (const [instant, zone] of [["2026-03-09T02:00:00Z", "America/New_York"], ["2026-09-28T02:00:00Z", "America/Sao_Paulo"], ["2026-03-30T01:00:00Z", "Europe/Berlin"]]) {
      const local = toTimezone(startOfWeekInTz(new Date(instant), zone), zone);
      expect(local.getDay()).toBe(1);
      expect(local.getHours()).toBe(0);
    }
  });
});
