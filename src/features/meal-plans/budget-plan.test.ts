import { expect, it } from 'vitest';
import { budgetPlan, cheaperSwap, dailyBudget, weeklyShoppingList } from './budget-plan';
import type { BudgetFood } from './budget-plan';

const lentils: BudgetFood = { id: 'lentils', name: 'Lentils', tag: 'main', kcal: 100, protein: 10, carbs: 15, fat: 0,
  pricePerGram: 0.02, unit: 'kg', unitGrams: 1000, kitchenGrams: 25, maxDailyGrams: 1000 };
const rice: BudgetFood = { ...lentils, id: 'rice', name: 'Rice', protein: 0, kcal: 200, pricePerGram: 0.01 };
const input = { kcal: 1000, protein: 50, mealsPerDay: 3, dailyBudget: 20, foods: [lentils, rice] };
it('fills protein before calories within the daily budget', () => {
  const day = budgetPlan(input);
  expect(day.feasible).toBe(true);
  expect(day.macros.protein).toBeGreaterThanOrEqual(50);
  expect(day.macros.kcal).toBeGreaterThanOrEqual(1000);
  expect(day.costEgp).toBeLessThanOrEqual(20);
  expect(day.meals).toHaveLength(3);
  expect(day.meals.every(meal => meal.items.length > 0)).toBe(true);
});
it('reports missing protein when money runs out', () => {
  const day = budgetPlan({ ...input, dailyBudget: 2 });
  expect(day.feasible).toBe(false);
  expect(day.shortBy).toBe(40);
  expect(day.costEgp).toBe(2);
});
it('is deterministic regardless of input ordering', () => {
  expect(budgetPlan(input)).toEqual(budgetPlan({ ...input, foods: [rice, lentils] }));
});
it('respects food caps and kitchen units', () => {
  const day = budgetPlan({ ...input, foods: [{ ...lentils, maxDailyGrams: 125 }] });
  expect(day.meals.flatMap(meal => meal.items).reduce((n, item) => n + item.grams, 0)).toBe(125);
});
it('caps seeded eggs at six pieces even when more budget is available', () => {
  const eggs = { ...lentils, id: 'food_eggs-v1', maxDailyGrams: undefined, unit: 'piece' as const, unitGrams: 50, kitchenGrams: 50 };
  const day = budgetPlan({ ...input, dailyBudget: 100, foods: [eggs] });
  expect(day.meals.flatMap(meal => meal.items).reduce((sum, item) => sum + item.grams, 0)).toBe(300);
});
it('swaps only within the same tag and ten percent of portion protein', () => {
  const expensive = { ...lentils, id: 'premium', pricePerGram: 0.2 };
  const swap = cheaperSwap({ food: expensive, grams: 100 }, [rice, lentils, { ...lentils, id: 'snack', tag: 'snack', pricePerGram: 0.001 }]);
  expect(swap?.food.id).toBe('lentils');
  expect(swap?.saving).toBe(18);
});
it('finds an affordable kitchen portion just below the original protein amount', () => {
  const premium = { ...lentils, id: 'premium', pricePerGram: 0.2, protein: 10.2 };
  expect(cheaperSwap({ food: premium, grams: 100 }, [lentils])?.grams).toBe(100);
});
it('rounds shopping quantities up to purchase units before costing', () => {
  const day = budgetPlan({ ...input, kcal: 500 });
  const list = weeklyShoppingList([day, day, day]);
  expect(list.items.find(item => item.food.id === 'lentils')?.grams).toBe(2000);
  expect(list.total).toBe(40);
});
it('uses month length in the player timezone including leap years', () => {
  expect(dailyBudget(2900, new Date('2024-02-15T12:00:00Z'), 'Africa/Cairo')).toBe(100);
  expect(dailyBudget(3100, new Date('2026-11-30T23:00:00Z'), 'Africa/Cairo')).toBe(100);
});
