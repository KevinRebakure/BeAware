import { expect, test } from "bun:test";
import { formatCents, parseCents } from "../src/core/money.ts";

test("parses dollars to cents", () => {
  expect(parseCents("4.25")).toBe(425);
  expect(parseCents("$25")).toBe(2500);
  expect(parseCents("0.1")).toBe(10);
  expect(parseCents("7.5")).toBe(750);
});

test("no float drift", () => {
  expect(parseCents("0.1")! + parseCents("0.2")!).toBe(parseCents("0.3")!);
});

test("rejects invalid input", () => {
  for (const s of ["", "abc", "-1", "1.234", "1,5", "$"]) expect(parseCents(s)).toBeNull();
});

test("formats cents", () => {
  expect(formatCents(425)).toBe("$4.25");
  expect(formatCents(7800)).toBe("$78.00");
  expect(formatCents(5)).toBe("$0.05");
  expect(formatCents(123456)).toBe("$1,234.56");
});
