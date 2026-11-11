import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
import { createCustomFood, updateCustomFood, deleteCustomFood } from './data/custom-food';
import { searchFoods } from './data/foods';

const mocks = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn(), delete: vi.fn(), remove: vi.fn(), eq: vi.fn(), is: vi.fn(), getUser: vi.fn(), getClaims: vi.fn(), single: vi.fn() }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getUser: mocks.getUser, getClaims: mocks.getClaims },
  storage: { from: () => ({ remove: mocks.remove }) },
  from: (table: string) => {
    const request = { select: () => request, order: () => request, limit: () => request,
      or: () => request, is: (key: string, value: null) => { mocks.is(key, value); return request; },
      eq: (key: string, value: string) => { mocks.eq(key, value); return request; },
      insert: mocks.insert, update: mocks.update, delete: mocks.delete,
      single: table === 'profiles' ? async () => ({ data: { role: 'captain' }, error: null }) : mocks.single,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve) };
    mocks.insert.mockReturnValue(request);
    mocks.update.mockReturnValue(request); mocks.delete.mockReturnValue(request);
    return request;
  },
}) }));
const captain = '01900000-0000-7000-8000-000000000001';
const input = { name: 'Soup', servingGrams: 150, kcal: 200, protein: 10, carbs: 20, fat: 5 };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.remove.mockResolvedValue({ error: null });
  mocks.getUser.mockResolvedValue({ data: { user: { id: captain } }, error: null });
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: captain } }, error: null });
  mocks.single.mockResolvedValue({ data: { id: captain, owner_id: captain, name_ar: 'Soup', photo_path: null,
    kcal_per_100g: 133.3, protein_per_100g: 6.7, carbs_per_100g: 13.3, fat_per_100g: 3.3 }, error: null });
});
it('converts edits per 100g and restricts them to the caller', async () => {
  await updateCustomFood(captain, input);
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ kcal_per_100g: 133.3, protein_per_100g: 6.7 }));
  expect(mocks.eq).toHaveBeenCalledWith('owner_id', captain);
});
it('persists bilingual names and household units through the existing writer', async () => {
  const units = [{ key: 'slice', name_ar: 'شريحة', name_en: 'Slice', grams: 30 }];
  await updateCustomFood(captain, { ...input, nameEn: 'Soup', units });
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ name_en: 'Soup', units }));
});
it('preserves the photo when copying a visible global food', async () => {
  mocks.single.mockResolvedValueOnce({ data: { photo_path: 'food-media/rice.jpg' }, error: null });
  await createCustomFood({ ...input, copyFrom: captain });
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ photo_path: 'food-media/rice.jpg' }));
  expect(mocks.is).toHaveBeenCalledWith('owner_id', null);
});
it('rejects global food updates when the ownership lookup finds no row', async () => {
  mocks.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
  await expect(updateCustomFood(captain, input)).resolves.toMatchObject({ ok: false });
  expect(mocks.update).not.toHaveBeenCalled();
});
it('does not archive a library deletion when a reference is added concurrently', async () => {
  mocks.single.mockResolvedValueOnce({ data: null, error: { code: '23503' } });
  await expect(deleteCustomFood(captain, true)).resolves.toMatchObject({ ok: false });
  expect(mocks.update).not.toHaveBeenCalled();
});
it('does not delete a photo before the replacement update succeeds', async () => {
  const old = `captain-food-photos/${captain}/old.jpg`;
  mocks.single.mockResolvedValueOnce({ data: { photo_path: old }, error: null })
    .mockResolvedValueOnce({ data: null, error: { code: '42501' } });
  await expect(updateCustomFood(captain, { ...input, photoPath: `captain-food-photos/${captain}/abc.jpg` })).resolves.toMatchObject({ ok: false, error: expect.any(String) });
  expect(mocks.remove).not.toHaveBeenCalled();
});
it('removes the previous photo after replacement succeeds', async () => {
  mocks.single.mockResolvedValueOnce({ data: { photo_path: `captain-food-photos/${captain}/old.jpg` }, error: null });
  await updateCustomFood(captain, { ...input, photoPath: `captain-food-photos/${captain}/abc.jpg` });
  expect(mocks.remove).toHaveBeenCalledWith([`${captain}/old.jpg`]);
});
it('archives foods used in plans without removing the photo', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-04T10:00:00Z'));
  try {
    mocks.single.mockResolvedValueOnce({ data: null, error: { code: '23503' } });
    await expect(deleteCustomFood(captain)).resolves.toEqual({ ok: true, data: { archived: true } });
    expect(mocks.update).toHaveBeenCalledWith({ archived_at: '2026-11-04T10:00:00.000Z' });
    expect(mocks.eq.mock.calls).toEqual([['id', captain], ['owner_id', captain], ['id', captain], ['owner_id', captain]]);
  } finally { vi.useRealTimers(); }
  expect(mocks.remove).not.toHaveBeenCalled();
});
it('does not claim success or remove a photo if archiving fails', async () => {
  mocks.single.mockResolvedValueOnce({ data: null, error: { code: '23503' } })
    .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
  await expect(deleteCustomFood(captain)).resolves.toMatchObject({ ok: false, error: expect.any(String) });
  expect(mocks.remove).not.toHaveBeenCalled();
});
it('removes the photo after deleting a food', async () => {
  mocks.single.mockResolvedValueOnce({ data: { photo_path: `captain-food-photos/${captain}/old.jpg` }, error: null });
  await deleteCustomFood(captain);
  expect(mocks.remove).toHaveBeenCalledWith([`${captain}/old.jpg`]);
});
describe('custom food server validation', () => {
  it('stores rounded per-100g values owned by the caller', async () => {
    const food = await createCustomFood(input);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: captain, source: 'captain',
      name_ar: 'Soup', name_en: null, kcal_per_100g: 133.3, protein_per_100g: 6.7,
      carbs_per_100g: 13.3, fat_per_100g: 3.3 }));
    expect(food).toMatchObject({ ok: true, data: { custom: true, kcal: 133.3 } });
  });
  it.each([{ name: '' }, { name: 'a'.repeat(61) }, { servingGrams: 4 }, { servingGrams: 2001 },
    { kcal: -1 }, { kcal: 5001 }, { kcal: 1350.01 }, { protein: -1 }, { carbs: 1001 },
    { fat: Infinity }, { servingGrams: NaN }, { servingGrams: 10, protein: 8, carbs: 2, fat: 1 }])('rejects invalid input %j before writing', async patch => {
    await expect(createCustomFood({ ...input, ...patch })).resolves.toMatchObject({ ok: false, error: expect.any(String) });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('accepts the 900 kcal per 100g boundary', async () => {
    await createCustomFood({ ...input, kcal: 1350 });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ kcal_per_100g: 900 }));
  });
  it('rejects a photo belonging to another captain', async () => {
    await expect(createCustomFood({ ...input, photoPath: 'captain-food-photos/other/a.jpg' })).resolves.toMatchObject({ ok: false, error: expect.any(String) });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
it('applies the mine filter to the authenticated caller', async () => {
  await searchFoods({ query: 'soup', mine: true });
  expect(mocks.eq).toHaveBeenCalledWith('owner_id', captain);
  expect(mocks.is).toHaveBeenCalledWith('archived_at', null);
});
it('does not filter all foods by owner', async () => {
  await searchFoods({ query: '' });
  expect(mocks.eq).not.toHaveBeenCalled();
  expect(mocks.is).toHaveBeenCalledWith('archived_at', null);
  expect(mocks.is).toHaveBeenCalledTimes(1);
});
it('excludes archived foods from the empty-catalog probe', async () => {
  await searchFoods({ query: 'missing' });
  expect(mocks.is.mock.calls).toEqual([['archived_at', null], ['archived_at', null]]);
});
