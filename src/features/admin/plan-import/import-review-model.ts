import type { NutritionSheet, SheetFood } from './nutrition-sheet';
import type { TrainingSheet } from './training-sheet';
import type { WorkbookSource } from '@/features/plan-source';

export type Review = ({ kind: 'nutrition'; plan: NutritionSheet } | { kind: 'training'; plan: TrainingSheet }) & { source: WorkbookSource };
export const portionName = (row: SheetFood) => row.note ? `${row.name} (${row.note})` : row.name;
export const portionKey = (row: SheetFood) => `${row.unit}:${portionName(row)}`;

export function conversionFoods(plan: NutritionSheet) {
  return Array.from(new Map(plan.meals.flatMap(meal => meal.items
    .filter(food => food.unit !== 'g').map(food => [portionKey(food), food]))).values());
}

export function reviewNumber(form: FormData, field: string) {
  const value = form.get(field);
  return typeof value === 'string' && value.trim() ? Number(value) : NaN;
}
