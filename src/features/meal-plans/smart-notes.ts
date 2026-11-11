import type { PlayerFacts } from '@/features/player-file';
import type { Macros } from '@/lib/macros';
import { macrosFor } from '@/lib/macros';
import type { Meal } from './types';
import { flagFood } from './food-flags';
import { localDate, weeklyWeekday } from '@/lib/dates';
import { dayMeals } from './editor-rules';

export type SmartNote = { kind: 'allergy'; itemId: string; name: string; reasons: string[] }
  | { kind: 'gap'; itemId: string; name: string; macro: 'protein' | 'carbs' | 'fat'; grams: number };
export function smartNotes(meals: Meal[], targets: Macros, facts: PlayerFacts): SmartNote[] {
  const items = meals.flatMap(meal => meal.items);
  const conflicts: SmartNote[] = items.flatMap(item => {
    const reasons = flagFood(item.food, facts);
    return reasons.length ? [{ kind: 'allergy' as const, itemId: item.id, name: item.food.name, reasons }] : [];
  });
  for (const macro of ['protein', 'carbs', 'fat'] as const) {
    const total = items.reduce((sum, item) => sum + macrosFor(item.food, item.grams)[macro], 0);
    if (total >= targets[macro] * .95) continue;
    const safe = items.filter(item => !flagFood(item.food, facts).length && item.food[macro] > 0)
      .sort((a, b) => b.food[macro] - a.food[macro]);
    for (const item of safe) {
      const grams = Math.ceil((targets[macro] - total) / item.food[macro] * 100);
      if (grams > 0 && item.grams + grams <= 2000) {
        return [...conflicts, { kind: 'gap', itemId: item.id, name: item.food.name, macro, grams }];
      }
    }
  }
  return conflicts;
}
export interface AdherenceLog { log_date: string; meal_id: string | null; completed_at: string | null; deleted_at: string | null }
export function adherenceDays(logs: AdherenceLog[], today: string, mealIds: string[]) {
  const end = Date.parse(`${today}T12:00:00Z`);
  const ids = new Set(mealIds);
  return Array.from({ length: 7 }, (_, index) => {
    const date = localDate(new Date(end - (6 - index) * 86400000), 'UTC');
    return { date, expected: ids.size, completed: new Set(logs.filter(log => log.log_date === date && log.meal_id && ids.has(log.meal_id)
      && log.completed_at && !log.deleted_at).map(log => log.meal_id)).size };
  });
}
export function planAdherence(logs: AdherenceLog[], today: string, meals: Meal[], trainingDays: number[]) {
  return adherenceDays([], today, []).map(({ date }) => {
    const expected = dayMeals(meals, trainingDays.includes(weeklyWeekday(date)) ? 'training' : 'rest');
    const result = adherenceDays(logs, date, expected.map(meal => meal.id));
    return result[6];
  }).filter(day => day !== undefined);
}
