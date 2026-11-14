export function calorieState(total: number, target: number) {
  return { over: total > target, remaining: Math.max(0, Math.round(target - total)),
    progress: target > 0 ? Math.min(1, Math.max(0, total / target)) : total > 0 ? 1 : 0 };
}

export function filterFoods<T extends { custom: boolean }>(foods: T[], tab: 'all' | 'mine'): T[] {
  return tab === 'mine' ? foods.filter(food => food.custom) : foods;
}
