'use client';
import type { NutritionMeal } from '@/core/offline';
import { BudgetPrice } from '@/features/meal-plans';
import { useFoodPrices } from '../hooks/use-food-prices';
import { pricedDay } from '../budget-costs';
export function MealBudget({ meal, swaps }: { meal: NutritionMeal; swaps: Record<string, string> }) {
  const resource = useFoodPrices();
  if (!resource.data?.monthly) return null;
  const foods = resource.data.foods.flatMap(row => row.budgetFood ? [row.budgetFood] : []);
  return <BudgetPrice budget={resource.data.monthly} cost={pricedDay([meal], foods, swaps).costEgp} />;
}
