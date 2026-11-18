import assert from "node:assert/strict";
import test from "node:test";
import { calculateDailyScore, type HabitScoreInput } from "./scoring";

const allHabits = (): HabitScoreInput[] => [10, 10, 5, 5, 2, 3, 3, 2, 3, 2].map((defaultPoints) => ({
  completed: false, defaultPoints, adjustment: 0,
}));

test("all incomplete habits score zero", () => {
  assert.equal(calculateDailyScore(allHabits(), []).finalScore, 0);
});

test("only deep work completed awards ten points", () => {
  const habits = allHabits(); habits[0].completed = true;
  assert.equal(calculateDailyScore(habits, []).finalScore, 10);
});

test("ten completed habits score 67.5 after the multiplier", () => {
  const habits = allHabits().map((habit) => ({ ...habit, completed: true }));
  assert.equal(calculateDailyScore(habits, []).finalScore, 67.5);
});

test("nine completed habits do not trigger the multiplier", () => {
  const habits = allHabits().map((habit, index) => ({ ...habit, completed: index < 9 }));
  assert.equal(calculateDailyScore(habits, []).finalScore, 43);
  assert.equal(calculateDailyScore(habits, []).isPerfect, false);
});

test("a general deduction prevents the perfect-day multiplier", () => {
  const habits = allHabits().map((habit) => ({ ...habit, completed: true }));
  assert.equal(calculateDailyScore(habits, [-5]).finalScore, 40);
  assert.equal(calculateDailyScore(habits, [-5]).isPerfect, false);
});

test("perfect day multiplies a general bonus", () => {
  const habits = allHabits().map((habit) => ({ ...habit, completed: true }));
  assert.equal(calculateDailyScore(habits, [5]).finalScore, 75);
});

test("an incomplete habit can receive a negative adjustment", () => {
  const habits = allHabits(); habits[0].adjustment = -2;
  assert.equal(calculateDailyScore(habits, []).finalScore, -2);
});

test("a habit deduction prevents the perfect-day multiplier even when every habit is complete", () => {
  const habits = allHabits().map((habit) => ({ ...habit, completed: true }));
  habits[0].adjustment = -2;
  const score = calculateDailyScore(habits, []);
  assert.equal(score.finalScore, 43);
  assert.equal(score.isPerfect, false);
});

test("any deduction prevents the multiplier even when a bonus offsets it", () => {
  const habits = allHabits().map((habit) => ({ ...habit, completed: true }));
  assert.equal(calculateDailyScore(habits, [5, -2]).finalScore, 48);
});

test("multiple adjustments are summed", () => {
  const habits = allHabits(); habits[0].completed = true; habits[0].adjustment = -2;
  assert.equal(calculateDailyScore(habits, [3, -1]).finalScore, 10);
});

test("decimal point values are retained", () => {
  const habits = allHabits(); habits[0].completed = true; habits[0].defaultPoints = 10.25;
  assert.equal(calculateDailyScore(habits, [0.1]).finalScore, 10.35);
});
