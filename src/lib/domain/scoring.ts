export type HabitScoreInput = {
  completed: boolean;
  defaultPoints: number;
  adjustment: number;
};

export type DailyScore = {
  completedCount: number;
  habitScore: number;
  generalAdjustments: number;
  baseScore: number;
  isPerfect: boolean;
  finalScore: number;
};

export function calculateDailyScore(
  habits: HabitScoreInput[],
  generalAdjustments: number[],
): DailyScore {
  const completedCount = habits.filter((habit) => habit.completed).length;
  const habitScore = habits.reduce(
    (sum, habit) => sum + (habit.completed ? habit.defaultPoints : 0) + habit.adjustment,
    0,
  );
  const generalTotal = generalAdjustments.reduce((sum, points) => sum + points, 0);
  const baseScore = habitScore + generalTotal;
  const hasDeduction = habits.some((habit) => habit.adjustment < 0) || generalAdjustments.some((points) => points < 0);
  const isPerfect = habits.length === 10 && completedCount === 10 && !hasDeduction;

  return {
    completedCount,
    habitScore,
    generalAdjustments: generalTotal,
    baseScore,
    isPerfect,
    finalScore: isPerfect ? baseScore * 1.5 : baseScore,
  };
}
