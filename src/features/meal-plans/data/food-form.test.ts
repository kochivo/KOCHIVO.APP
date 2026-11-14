import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { loadFoodForCopy, loadFoodForEdit } from './food-form';

const mocks = vi.hoisted(() => ({ user: vi.fn(), from: vi.fn(), filters: [] as [string, unknown][] }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', async () => {
  const { createT } = await import('@/core/i18n/messages');
  return { getT: async (messages: Parameters<typeof createT>[0]) => createT(messages, 'en') };
});
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ auth: { getUser: mocks.user }, from: mocks.from }) }));
const owner = '019a805e-0000-7000-8000-000000000001';
const other = '019a805e-0000-7000-8000-000000000002';
const ownId = '019a805e-0000-7000-8000-000000000003';
const globalId = '019a805e-0000-7000-8000-000000000004';
const otherId = '019a805e-0000-7000-8000-000000000005';
const values = { name_ar: 'كفتة', name_en: 'Kofta', photo_path: null, archived_at: null,
  kcal_per_100g: 230, protein_per_100g: 18, carbs_per_100g: 4, fat_per_100g: 16,
  units: [{ key: 'piece', name_ar: 'صباع', name_en: 'Piece', grams: 60 }] };
const rows = [{ ...values, id: ownId, owner_id: owner }, { ...values, id: globalId, owner_id: null },
  { ...values, id: otherId, owner_id: other }];
beforeEach(() => {
  vi.clearAllMocks(); mocks.filters = [];
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  mocks.user.mockResolvedValue({ data: { user: { id: owner } }, error: null });
  mocks.from.mockImplementation(() => {
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => { mocks.filters.push([key, value]); return query; },
      is: (key: string, value: unknown) => { mocks.filters.push([key, value]); return query; },
      maybeSingle: () => query,
      overrideTypes: async () => ({ error: null, data: rows.find(row => mocks.filters.every(([key, value]) =>
        Reflect.get(row, key) === value)) ?? null }),
    };
    return query;
  });
});
afterEach(() => vi.unstubAllEnvs());
it('loads only the signed-in captain’s own row and preserves English name and units', async () => {
  const result = await loadFoodForEdit(ownId);
  expect(result).toMatchObject({ ok: true, data: { id: ownId, custom: true, name: 'كفتة', nameEn: 'Kofta', units: values.units } });
  expect(mocks.filters).toContainEqual(['owner_id', owner]);
});
it.each([globalId, otherId])('does not load non-owned food %s through the edit path', async id => {
  expect((await loadFoodForEdit(id)).ok).toBe(false);
  expect(mocks.filters).toContainEqual(['owner_id', owner]);
});
it('loads a global row only through the copy path', async () => {
  expect(await loadFoodForCopy(globalId)).toMatchObject({ ok: true, data: { id: globalId, custom: false } });
  expect(mocks.filters).toContainEqual(['owner_id', null]);
});
it.each([ownId, otherId])('rejects captain row %s as a global-copy source', async id => {
  expect((await loadFoodForCopy(id)).ok).toBe(false);
});
it('does not query foods without verified authentication', async () => {
  mocks.user.mockResolvedValue({ data: { user: null }, error: null });
  expect((await loadFoodForEdit(ownId)).ok).toBe(false);
  expect(mocks.from).not.toHaveBeenCalled();
});
it('does not query malformed IDs or a disabled workspace', async () => {
  expect((await loadFoodForEdit('invalid')).ok).toBe(false);
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  expect((await loadFoodForEdit(ownId)).ok).toBe(false);
  expect(mocks.from).not.toHaveBeenCalled();
});
it('returns a localized read error when the query fails', async () => {
  const query = { select: () => query, eq: () => query, is: () => query, maybeSingle: () => query,
    overrideTypes: async () => ({ data: null, error: { message: 'database unavailable' } }) };
  mocks.from.mockReturnValue(query);
  expect(await loadFoodForEdit(ownId)).toEqual({ ok: false, error: 'Food unavailable. Try again' });
});
