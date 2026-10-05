import { expect, test } from "bun:test";
import { dayKey, dayRange, formatHour, parseHour } from "../src/core/day.ts";

test("dayKey respects the start hour", () => {
  expect(dayKey(new Date(2026, 9, 5, 3, 59), 4)).toBe("2026-10-04");
  expect(dayKey(new Date(2026, 9, 5, 4, 0), 4)).toBe("2026-10-05");
  expect(dayKey(new Date(2026, 9, 5, 0, 0), 0)).toBe("2026-10-05");
  expect(dayKey(new Date(2026, 0, 1, 2, 0), 4)).toBe("2025-12-31");
});

test("dayRange is half-open and starts at the hour", () => {
  const [s, e] = dayRange("2026-10-05", 4);
  expect(s).toEqual(new Date(2026, 9, 5, 4));
  expect(e).toEqual(new Date(2026, 9, 6, 4));
});

test("parseHour accepts 0-23 only", () => {
  expect(parseHour("4")).toBe(4);
  expect(parseHour("04:00")).toBe(4);
  expect(parseHour("23")).toBe(23);
  for (const s of ["24", "-1", "4:30", "", "x"]) expect(parseHour(s)).toBeNull();
  expect(formatHour(4)).toBe("04:00");
});
