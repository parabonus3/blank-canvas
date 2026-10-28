import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { usualFocusHour } from "./habit-hour.ts";

Deno.test("returns null with fewer than 4 distinct days", () => {
  assertEquals(usualFocusHour([{ hour: 9, date: "a" }, { hour: 9, date: "b" }, { hour: 9, date: "c" }]), null);
});

Deno.test("uses the first session of each day and the median", () => {
  const h = usualFocusHour([
    { hour: 9, date: "a" }, { hour: 22, date: "a" },
    { hour: 10, date: "b" }, { hour: 8, date: "c" }, { hour: 14, date: "d" },
  ]);
  assertEquals(h, 9);
});
