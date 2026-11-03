import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import type { Translator } from '@/core/i18n/messages';

import { equivalentGrams } from '@/lib/macros';
import type { Food, MealItem, PlanDraft } from './types';

const positions = <T extends { position: number }>(rows: T[]): T[] => rows.map((row, index) => ({ ...row, position: index + 1 }));
function move<T extends { id: string; position: number }>(rows: T[], id: string, direction: number): T[] {
  const index = rows.findIndex(row => row.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= rows.length) return rows;
  const copy = [...rows];
  const [row] = copy.splice(index, 1);
  if (row) copy.splice(next, 0, row);
  return positions(copy);
}
function items(draft: PlanDraft, update: (rows: MealItem[]) => MealItem[]): PlanDraft {
  return { ...draft, meals: draft.meals.map(meal => ({ ...meal, items: update(meal.items) })) };
}
function gramsValue(grams: number, t: Translator<typeof messages>) {
  if (!Number.isFinite(grams) || grams < 5 || grams > 2000) throw new Error(t('amountMustBe5To2000Grams'));
  return grams;
}
export function addMeal(draft: PlanDraft, name: string, id: string): PlanDraft {
  return { ...draft, meals: positions([...draft.meals, { id, name, position: 0, items: [] }]) };
}
export function renameMeal(draft: PlanDraft, id: string, name: string): PlanDraft {
  return { ...draft, meals: draft.meals.map(meal => meal.id === id ? { ...meal, name } : meal) };
}
export function removeMeal(draft: PlanDraft, id: string): PlanDraft {
  return { ...draft, meals: positions(draft.meals.filter(meal => meal.id !== id)) };
}
export function moveMeal(draft: PlanDraft, id: string, direction: number): PlanDraft {
  return { ...draft, meals: move(draft.meals, id, direction) };
}
export function addItem(draft: PlanDraft, mealId: string, food: Food, grams: number, id: string, t: Translator<typeof messages> = createT(messages, 'ar')): PlanDraft {
  gramsValue(grams, t);
  return { ...draft, meals: draft.meals.map(meal => meal.id === mealId ? {
    ...meal, items: positions([...meal.items, { id, food, grams, position: 0, alternatives: [] }]),
  } : meal) };
}
export function setGrams(draft: PlanDraft, itemId: string, grams: number, t: Translator<typeof messages> = createT(messages, 'ar')): PlanDraft {
  gramsValue(grams, t);
  return items(draft, rows => rows.map(item => item.id === itemId ? {
    ...item, grams, alternatives: item.alternatives.map(alt => ({ ...alt, grams: equivalentGrams(item.food, grams, alt.food) })),
  } : item));
}
export function removeItem(draft: PlanDraft, id: string): PlanDraft {
  return items(draft, rows => positions(rows.filter(item => item.id !== id)));
}
export function moveItem(draft: PlanDraft, id: string, direction: number): PlanDraft {
  return items(draft, rows => move(rows, id, direction));
}
export function addAlternative(draft: PlanDraft, itemId: string, food: Food, id: string): PlanDraft {
  return items(draft, rows => rows.map(item => item.id === itemId ? {
    ...item, alternatives: [...item.alternatives, { id, food, grams: equivalentGrams(item.food, item.grams, food) }],
  } : item));
}
export function removeAlternative(draft: PlanDraft, itemId: string, id: string): PlanDraft {
  return items(draft, rows => rows.map(item => item.id === itemId ? { ...item, alternatives: item.alternatives.filter(alt => alt.id !== id) } : item));
}
