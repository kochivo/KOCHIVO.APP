import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { MealLogRow, NutritionMeal } from '@/core/offline';
import { filterMeals } from './day-type-filter';
import { fetchNutritionSnapshot, mapNutritionSnapshot, type NutritionResponse } from './data/nutrition-snapshot';
import { targetsOf } from './macros';
import { formatPortion } from './format-portion';

const today = '2026-11-15';
const meals: NutritionMeal[] = [undefined, 'all', 'training', 'rest'].map((day_type, index) => ({
  id: String(index), name: 'Meal', position: index, day_type: day_type as NutritionMeal['day_type'],
  items: [{ id: String(index), position: 0, name: 'Food', grams: 100, photo_path: null,
    per100g: { kcal: 100, protein: 10, carbs: 10, fat: 1 }, alternatives: [] }],
}));
it('shows only shared meals during loading and defaults unknown days to training', () => {
  expect(filterMeals(meals, undefined, [], today).map(meal => meal.id)).toEqual(['0', '1']);
  expect(filterMeals(meals, null, [], today).map(meal => meal.id)).toEqual(['0', '1', '2']);
});
it('hides training meals on rest days and changes fallback totals', () => {
  const snapshot = { id: 'active' as const, player_id: 'p', plan_id: 'plan', title: 'Plan',
    targets: { kcal: null, protein: null, carbs: null, fat: null }, meals };
  expect(targetsOf(snapshot).kcal).toBe(400);
  const visible = filterMeals(meals, true, [], today);
  expect(visible.map(meal => meal.id)).toEqual(['0', '1', '3']);
  expect(targetsOf({ ...snapshot, meals: visible }).kcal).toBe(300);
});
it('preserves completed history only for today and excludes deleted logs', () => {
  const log: MealLogRow = { id: 'log', meal_id: '2', log_date: today, completed_at: '2026-11-15T10:00:00Z',
    client_updated_at: '2026-11-15T10:00:00Z', deleted_at: null, swaps: {} };
  expect(filterMeals(meals, true, [log], today)).toHaveLength(4);
  for (const patch of [{ log_date: '2026-11-14' }, { completed_at: null }, { deleted_at: log.completed_at }]) {
    expect(filterMeals(meals, true, [{ ...log, ...patch }], today)).toHaveLength(3);
  }
});
it('maps missing legacy fields to safe defaults', () => {
  const response: NutritionResponse = { id: 'plan', title: 'Plan', target_kcal: null, target_protein: null,
    target_carbs: null, target_fat: null, meals: [{ id: 'meal', name: 'Meal', position: 0, meal_items: [] }] };
  expect(mapNutritionSnapshot(response, 'p').meals[0]).toMatchObject({ day_type: 'all', time_of_day: null });
});

it('maps day type, time, units and legacy item defaults', () => {
  const item = { id: 'item', position: 0, grams: 150, meal_item_alternatives: [],
    foods: { name_ar: 'Food', photo_path: null, kcal_per_100g: 100, protein_per_100g: 10,
      carbs_per_100g: 10, fat_per_100g: 1, units: [{ key: 'cup', name_ar: 'كوب', name_en: 'cup', grams: 50 }] } };
  const response: NutritionResponse = { id: 'plan', title: 'Plan', target_kcal: null, target_protein: null,
    target_carbs: null, target_fat: null, meals: [{ id: 'meal', name: 'Meal', position: 0,
      day_type: 'rest', time_of_day: '08:30:00', meal_items: [item, { ...item, id: 'portion', unit: 'cup' }] }] };
  const meal = mapNutritionSnapshot(response, 'p').meals[0];
  expect(meal).toMatchObject({ day_type: 'rest', time_of_day: '08:30:00' });
  expect(meal?.items[0]?.unit).toBeNull();
  expect(meal?.items[1]?.unit).toBe('cup');
  const portion = meal?.items[1];
  if (!portion) throw new Error('Missing fixture');
  expect(formatPortion(portion, 'en', 'g')).toBe('3 cup (150g)');
  expect(formatPortion(portion, 'ar', 'ج')).toContain('كوب');
  expect(formatPortion({ ...portion, unit: 'missing' }, 'en', 'g')).toBe('150g');
});

it('retries only undefined-column errors with the legacy select', async () => {
  const select = vi.fn();
  const maybeSingle = vi.fn().mockResolvedValueOnce({ data: null, error: { code: '42703' } })
    .mockResolvedValueOnce({ data: null, error: null });
  const query = { select, eq: vi.fn(), maybeSingle };
  select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'p' } }, error: null }) },
    from: vi.fn(() => query) } as unknown as SupabaseClient<AppDatabase>;
  expect(await fetchNutritionSnapshot(client)).toBeNull();
  expect(select.mock.calls[0]?.[0]).toContain('day_type,time_of_day');
  expect(select.mock.calls[0]?.[0]).toContain('unit,foods');
  expect(select.mock.calls[1]?.[0]).not.toContain('day_type');
  expect(select.mock.calls[1]?.[0]).not.toContain('unit');
  maybeSingle.mockResolvedValue({ data: null, error: { code: '42501' } });
  await expect(fetchNutritionSnapshot(client)).rejects.toEqual({ code: '42501' });
  expect(select).toHaveBeenCalledTimes(3);
});
