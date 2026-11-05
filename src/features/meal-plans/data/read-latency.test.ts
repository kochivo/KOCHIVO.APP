import { beforeEach, expect, it, vi } from 'vitest';
import { loadPlan } from './plan-io';
import { searchFoods } from './foods';

const mocks = vi.hoisted(() => ({ claims: vi.fn(), from: vi.fn(), eq: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('./client', () => ({ planClient: async () => ({
  auth: { getClaims: mocks.claims }, from: mocks.from,
}), toFood: (row: unknown) => row }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.claims.mockResolvedValue({ data: { claims: { sub: 'captain' } }, error: null });
  mocks.from.mockImplementation((table: string) => {
    const result = { data: table === 'nutrition_plans' ? {
      captain_id: 'captain', player_id: 'player', title: 'Plan', status: 'draft',
    } : [], error: null };
    const query = {
      select: () => query, is: () => query, order: () => query, limit: () => query,
      eq: (column: string, value: string) => { mocks.eq(column, value); return query; },
      single: async () => result,
      then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
    };
    return query;
  });
});

it('loads the owned plan using verified claims', async () => {
  const result = await loadPlan('01900000-0000-7000-8000-000000000001');
  expect(result).toMatchObject({ ok: true, data: { playerId: 'player', title: 'Plan', meals: [] } });
  expect(mocks.claims).toHaveBeenCalledOnce();
});

it('scopes own-food searches with verified claims', async () => {
  expect(await searchFoods({ query: '', mine: true })).toEqual({ ok: true, data: { foods: [], catalogEmpty: false } });
  expect(mocks.eq).toHaveBeenCalledWith('owner_id', 'captain');
});
