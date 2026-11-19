export const mealCalories: readonly number[] = [520, 780, 310, 640];
export const mealPlanCalories = mealCalories.reduce((total, calories) => total + calories, 0);
