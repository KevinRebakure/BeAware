import { expect, test } from "bun:test";
import { evaluate } from "../src/core/alerts.ts";

const I = 2500;
const ev = (total: number, last = 0) => evaluate({ totalCents: total, intervalCents: I, lastAlertedCents: last });

test("below first milestone: no alert", () => {
  expect(ev(0).crossed).toBe(0);
  expect(ev(2499).crossed).toBe(0);
  expect(ev(2499).nextCents).toBe(2500);
});

test("exactly on milestone alerts once", () => {
  const r = ev(2500);
  expect(r.crossed).toBe(1);
  expect(r.nextCents).toBe(5000);
});

test("between milestones after alert: nothing new", () => {
  expect(ev(4999, 2500).crossed).toBe(0);
  expect(ev(5000, 2500).crossed).toBe(1);
});

test("big jump consolidates: $23 + $55 = $78 crosses 3", () => {
  const r = ev(7800, 0);
  expect(r.crossed).toBe(3);
  expect(r.reachedCents).toBe(7500);
  expect(r.nextCents).toBe(10000);
});

test("lowering total or raising interval never yields negative", () => {
  expect(ev(1000, 5000).crossed).toBe(0);
  expect(evaluate({ totalCents: 5000, intervalCents: 10000, lastAlertedCents: 5000 }).crossed).toBe(0);
});
