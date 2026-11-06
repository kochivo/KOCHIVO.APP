import { beforeEach, expect, it, vi } from 'vitest';
import { searchExercises } from './library';

const mocks = vi.hoisted(() => ({ is: vi.fn(), eq: vi.fn(), or: vi.fn() }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => (key: string) => key }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } }, error: null }) },
  from: () => {
    const query = {
      select: () => query, order: () => query,
      or: (filter: string) => { mocks.or(filter); return query; },
      is: (key: string, value: null) => { mocks.is(key, value); return query; },
      eq: (key: string, value: string) => { mocks.eq(key, value); return query; },
      limit: async () => ({ data: [], error: null }),
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
