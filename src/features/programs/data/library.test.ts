import { beforeEach, expect, it, vi } from 'vitest';
import { searchExercises } from './library';

const mocks = vi.hoisted(() => ({
  is: vi.fn(), eq: vi.fn(), or: vi.fn(), in: vi.fn(), select: vi.fn(), order: vi.fn(), range: vi.fn(), limit: vi.fn(),
}));
vi.mock('@/core/i18n/server', () => ({ getT: async () => (key: string) => key }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } }, error: null }) },
  from: () => {
    const query = {
      select: (...args: unknown[]) => { mocks.select(...args); return query; },
      order: (column: string) => { mocks.order(column); return query; },
      in: (column: string, values: string[]) => { mocks.in(column, values); return query; },
      or: (filter: string) => { mocks.or(filter); return query; },
      is: (key: string, value: null) => { mocks.is(key, value); return query; },
      eq: (key: string, value: string) => { mocks.eq(key, value); return query; },
      limit: async (size: number) => { mocks.limit(size); return { data: [], error: null }; },
      range: async (start: number, end: number) => {
        mocks.range(start, end);
        return { data: [{ id: 'own', owner_id: 'captain', instructions_ar: ['قف'], instructions_en: ['Stand'], secondary_muscles: ['glutes'] },
          { id: 'global', owner_id: null }], count: 65, error: null };
      },
    };
    return query;
  },
}) }));
beforeEach(() => vi.clearAllMocks());
it.each([false, true])('excludes archived exercises from search with mine=%s', async mine => {
  expect(await searchExercises({ query: 'press', bodyPart: 'chest', mine })).toEqual({ data: [] });
  expect(mocks.is).toHaveBeenCalledExactlyOnceWith('archived_at', null);
  if (mine) expect(mocks.eq).toHaveBeenCalledWith('owner_id', 'captain');
});
it.each([['core', 'body_part.eq.core,body_part.eq.waist'], ['glutes', 'body_part.eq.glutes,target.eq.glutes']])(
  'combines the %s body filter with a separate text search', async (bodyPart, filter) => {
    expect(await searchExercises({ query: 'press', bodyPart })).toEqual({ data: [] });
    expect(mocks.or).toHaveBeenCalledWith(filter);
    expect(mocks.or).toHaveBeenCalledTimes(2);
  });

it('paginates 30 rows with a stable order and returns the filtered total and full details', async () => {
  const result = await searchExercises({ query: '', bodyPart: '', page: 1, equipment: ['barbell'], bodyParts: ['upper legs', 'lower legs'] });
  expect(mocks.range).toHaveBeenCalledWith(30, 59);
  expect(mocks.limit).not.toHaveBeenCalled();
  expect(mocks.order.mock.calls).toEqual([['name_en'], ['id']]);
  expect(mocks.select.mock.calls[0]?.[1]).toEqual({ count: 'exact' });
  expect(mocks.select.mock.calls[0]?.[0]).toContain('instructions_ar,instructions_en,secondary_muscles');
  expect(mocks.in).toHaveBeenCalledWith('equipment', ['barbell']);
  expect(mocks.in).toHaveBeenCalledWith('body_part', ['upper legs', 'lower legs']);
  expect(result).toMatchObject({ total: 65, data: [
    { id: 'own', is_own: true, instructions_ar: ['قف'], instructions_en: ['Stand'], secondary_muscles: ['glutes'] },
    { id: 'global', is_own: false },
  ] });
});

it('retains the legacy first-page result shape and limit without an exact count', async () => {
  expect(await searchExercises({ query: '', bodyPart: '' })).toEqual({ data: [] });
  expect(mocks.limit).toHaveBeenCalledExactlyOnceWith(30);
  expect(mocks.range).not.toHaveBeenCalled();
  expect(mocks.select.mock.calls[0]?.[1]).toBeUndefined();
});
