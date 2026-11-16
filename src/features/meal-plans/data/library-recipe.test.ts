import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const state = vi.hoisted(() => ({ inserted: undefined as Record<string, unknown> | undefined, missing: false }));
const id = '019a805e-0000-7000-8000-000000000001';
vi.mock('@/core/i18n/server', () => ({ getT: async () => (key: string) => key }));
vi.mock('./client', () => ({
  toFood: (row: { id: string; name_ar: string }) => ({ id: row.id, name: row.name_ar, custom: false, photo: null, kcal: 120, protein: 15, carbs: 10, fat: 5 }),
  planClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'captain' } } }) },
    from: (table: string) => {
      if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'captain' }, error: null }) }) }) };
      const builder = {
        select: () => builder, in: () => builder,
        is: async () => ({ data: state.missing ? [] : [{ id: '019a805e-0000-7000-8000-000000000001', name_ar: 'Chicken', fiber_per_100g: null }], error: null }),
        insert: (row: Record<string, unknown>) => { state.inserted = row; return builder; },
        single: async () => ({ data: state.inserted, error: null }),
      };
      return builder;
    },
  }),
}));
import { saveLibraryRecipe } from './library-recipe';
beforeEach(() => { state.inserted = undefined; state.missing = false; });
it('recalculates from stored ingredients and saves provenance, cooked yield and nullable fiber', async () => {
  const result = await saveLibraryRecipe({ name: 'Recipe', cookedWeight: 400, ingredients: [{ id, grams: 200 }] });
  expect(result.ok).toBe(true);
  expect(state.inserted).toMatchObject({ owner_id: 'captain', source_kind: 'recipe', state: 'cooked', kcal_per_100g: 60,
    fiber_per_100g: null, source_ref: { cooked_yield_g: 400, ingredients: [{ food_id: id, grams: 200 }] } });
});
it('rejects zero yield, missing ingredients and an impossible concentrated recipe', async () => {
  for (const cookedWeight of [0, 1]) {
    expect((await saveLibraryRecipe({ name: 'Recipe', cookedWeight, ingredients: [{ id, grams: 200 }] })).ok).toBe(false);
  }
  state.missing = true;
  expect((await saveLibraryRecipe({ name: 'Recipe', cookedWeight: 400, ingredients: [{ id, grams: 200 }] })).ok).toBe(false);
  expect(state.inserted).toBeUndefined();
});
