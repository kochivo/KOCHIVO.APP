import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ calls: [] as unknown[][] }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => (key: string) => key }));
vi.mock('./data/client', () => ({
  toFood: (row: unknown) => row,
  planClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } }, error: null }) },
    from: () => {
      const record = (method: string) => (...args: unknown[]) => { state.calls.push([method, ...args]); return builder; };
      const builder = {
        select: record('select'), is: record('is'), order: record('order'), limit: record('limit'),
        contains: record('contains'), gte: record('gte'), eq: record('eq'), or: record('or'),
        then: (resolve: (value: unknown) => void) => resolve({ data: [{ id: 'food' }], error: null }),
      };
      return builder;
    },
  }),
}));
import { searchFoods } from './data/foods';

beforeEach(() => { state.calls = []; });
it.each([['protein', 'protein_per_100g', 10], ['carbs', 'carbs_per_100g', 20]] as const)(
  'filters %s using existing food columns and an inclusive macro threshold', async (category, column, threshold) => {
    expect(await searchFoods({ query: 'rice', category, mine: true })).toMatchObject({ ok: true });
    const columns = new Set(['id', 'owner_id', 'name_ar', 'name_en', 'kcal_per_100g', 'protein_per_100g',
      'carbs_per_100g', 'fat_per_100g', 'photo_path', 'source', 'created_at', 'seed_key', 'archived_at', 'units']);
    for (const [method, field] of state.calls) {
      if (['is', 'eq', 'gte', 'contains', 'order'].includes(String(method))) expect(columns.has(String(field))).toBe(true);
      if (method === 'or') for (const match of String(field).matchAll(/(?:^|,)(\w+)\./g)) expect(columns.has(String(match[1]))).toBe(true);
    }
    expect(state.calls).toContainEqual(['gte', column, threshold]);
    expect(state.calls).toContainEqual(['eq', 'owner_id', 'captain']);
    expect(state.calls).toContainEqual(['is', 'archived_at', null]);
  },
);
it('does not apply a macro threshold to all foods', async () => {
  await searchFoods({ query: '' });
  expect(state.calls.some(([method]) => method === 'gte' || method === 'contains')).toBe(false);
});
