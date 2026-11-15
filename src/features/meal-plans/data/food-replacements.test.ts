import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { searchFoods } from './foods';
import { listLibraryFoods } from './food-library';
import { missingReplacesColumn } from './food-replacements';

const state = vi.hoisted(() => ({ legacy: false, failed: false, scope: 'captain' }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', () => ({ getT: async () => (key: string) => key }));
const original = { id: '001', owner_id: null, name_ar: 'Rice', name_en: 'Rice', replaces_id: null,
  photo_path: 'food-media/rice.jpg', kcal_per_100g: 130, protein_per_100g: 3, carbs_per_100g: 28, fat_per_100g: 1,
  meal_items: [], meal_item_alternatives: [] };
const version = { ...original, id: '003', owner_id: 'captain', name_ar: 'Brown rice', replaces_id: original.id,
  kcal_per_100g: 160, protein_per_100g: 12 };
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'captain' } } }),
    getClaims: async () => ({ data: { claims: { sub: 'captain' } } }) },
  from: () => {
    let columns = '', head = false, limit = 1000;
    const filters: ((row: typeof original | typeof version) => boolean)[] = [];
    const result = () => {
      if (columns === 'id,replaces_id' && (state.legacy || state.failed)) return { data: null,
        error: { code: state.legacy ? '42703' : '42501', message: state.legacy ? 'column foods.replaces_id does not exist' : 'denied' } };
      const visible = state.scope === 'other' ? [original] : [original, version];
      const rows = visible.filter(row => filters.every(filter => filter(row)));
      return { data: head ? null : rows.slice(0, limit).map(row => state.legacy ? { ...row, replaces_id: undefined } : row),
        count: rows.length, error: null };
    };
    const request = {
      select: (value: string, options?: { head?: boolean }) => { columns = value; head = options?.head ?? false; return request; },
      is: (key: string, value: unknown) => { if (key === 'owner_id') filters.push(row => row.owner_id === value); return request; },
      eq: (key: string, value: unknown) => { filters.push(row => Reflect.get(row, key) === value); return request; },
      gt: (key: string, value: string) => { filters.push(row => String(Reflect.get(row, key)) > value); return request; },
      gte: (key: string, value: number) => { filters.push(row => Number(Reflect.get(row, key)) >= value); return request; },
      not: (_key: string, _op: string, ids: string) => { filters.push(row => !ids.slice(1, -1).split(',').includes(row.id)); return request; },
      or: (expression: string) => { filters.push(row => expression.includes('Brown') ? row.name_ar.includes('Brown') : true); return request; },
      order: () => request,
      limit: (value: number) => { limit = value; return request; },
      overrideTypes: async () => result(),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return request;
  },
}) }));
beforeEach(() => { state.legacy = false; state.failed = false; state.scope = 'captain'; vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1'); });
afterEach(() => vi.unstubAllEnvs());
it('hides originals before the picker limit and returns the edited numbers and photo', async () => {
  expect(await searchFoods({ query: '', limit: 1 })).toMatchObject({ ok: true,
    data: { foods: [{ id: version.id, kcal: 160, protein: 12, photo: original.photo_path, replacesId: original.id }] } });
});
it('uses all replacements when searching renamed foods and filtering macros', async () => {
  expect(await searchFoods({ query: 'Brown', category: 'protein' })).toMatchObject({ ok: true,
    data: { foods: [{ id: version.id }] } });
});
it('uses the same visible set and counts in the library', async () => {
  expect(await listLibraryFoods({ query: '', segment: 'all' })).toMatchObject({ ok: true,
    data: { foods: [{ id: version.id, replacesId: original.id }], counts: { all: 1, mine: 1, global: 0 } } });
  expect(await listLibraryFoods({ query: '', segment: 'global' })).toMatchObject({ ok: true, data: { foods: [] } });
});
it('keeps original values for other captains under their RLS scope', async () => {
  state.scope = 'other';
  expect(await searchFoods({ query: '' })).toMatchObject({ ok: true, data: { foods: [{ id: original.id, kcal: 130 }] } });
});
it('falls back to legacy searches and never returns restore metadata before 0111', async () => {
  state.legacy = true;
  const result = await listLibraryFoods({ query: '', segment: 'all' });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
  expect(result.data.foods.every(food => !food.replacesId)).toBe(true);
  expect((await searchFoods({ query: '' })).ok).toBe(true);
});
it('reports unrelated failures instead of treating them as an old schema', async () => {
  state.failed = true;
  expect((await searchFoods({ query: '' })).ok).toBe(false);
  expect((await listLibraryFoods({ query: '', segment: 'all' })).ok).toBe(false);
  expect(missingReplacesColumn({ code: 'PGRST204', message: 'replaces_id missing from schema cache' })).toBe(true);
  expect(missingReplacesColumn({ code: '42703', message: 'units does not exist' })).toBe(false);
});
