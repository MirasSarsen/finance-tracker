import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateAverageDailySpending,
  calculatePercentageChange,
  calculateSafeToSpend,
  findLargestByAmount,
} from "../lib/finance.ts";

test("calculates average daily spending for elapsed days", () => {
  assert.equal(calculateAverageDailySpending("126400.00", 7), 126400 / 7);
});

test("average daily spending uses at least one day and handles zero expenses", () => {
  assert.equal(calculateAverageDailySpending(900, 0), 900);
  assert.equal(calculateAverageDailySpending(0, 3), 0);
});

test("calculates safe-to-spend and prevents negative or invalid results", () => {
  assert.equal(calculateSafeToSpend("125000", 4), 31250);
  assert.equal(calculateSafeToSpend(-50, 4), 0);
  assert.equal(calculateSafeToSpend(500, 0), 0);
});

test("calculates percentage change to one decimal place", () => {
  assert.equal(calculatePercentageChange(126400, 105000), 20.4);
  assert.equal(calculatePercentageChange(80, 100), -20);
  assert.equal(calculatePercentageChange(100, 100), 0);
});

test("does not calculate a percentage when the previous period is empty", () => {
  assert.equal(calculatePercentageChange(100, 0), null);
  assert.equal(calculatePercentageChange(0, 0), null);
});

test("finds the largest amount and handles empty input", () => {
  const entries = [
    { day: "Monday", amount: "1200.00" },
    { day: "Tuesday", amount: "5000.00" },
    { day: "Wednesday", amount: "3500.00" },
  ];

  assert.deepEqual(findLargestByAmount(entries), entries[1]);
  assert.equal(findLargestByAmount([]), null);
});
