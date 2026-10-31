import { describe, it, expect } from "vitest";
import { summarizeWeek, formatHm } from "./weekShare";

describe("summarizeWeek", () => {
  it("agrupa pelo dia local do perfil, não pelo UTC", () => {
    // 02:00 UTC de terça = 23:00 de segunda em São Paulo
    const r = summarizeWeek([
      { start_time: "2026-10-27T02:00:00Z", duration: 3600 },
      { start_time: "2026-10-26T15:00:00Z", duration: 1800 },
    ], "America/Sao_Paulo");
    expect(r.activeDays).toBe(1);
    expect(r.totalSeconds).toBe(5400);
    expect(r.best).toEqual({ key: "2026-10-26", seconds: 5400 });
  });

  it("ignora sessões sem duração e escolhe o melhor dia", () => {
    const r = summarizeWeek([
      { start_time: "2026-10-26T15:00:00Z", duration: null },
      { start_time: "2026-10-27T15:00:00Z", duration: 600 },
      { start_time: "2026-10-28T15:00:00Z", duration: 7200 },
    ], "America/Sao_Paulo");
    expect(r.activeDays).toBe(2);
    expect(r.best?.key).toBe("2026-10-28");
  });

  it("formata horas e minutos", () => {
    expect(formatHm(12300)).toBe("3h25");
  });
});
