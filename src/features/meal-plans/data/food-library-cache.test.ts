import { beforeEach, expect, it } from 'vitest';
import { resourceStore } from '@/core/resource/store';
import { saveFoodWithCache } from './food-library-cache';
import type { LibraryPage } from './library-types';
import type { Food } from '../types';
import { foodResourceKey, invalidateFoodResources } from './food-resource-version';

const version: Food = { id: 'version', replacesId: 'catalog', name: 'Rice', custom: true,
  photo: null, kcal: 160, protein: 12, carbs: 20, fat: 2 };
const key = (segment: string) => foodResourceKey(`foods-library:${JSON.stringify(['', segment, null])}`);
beforeEach(() => resourceStore.clear());
it('keeps totals consistent across segments when the original is outside the cached page', async () => {
  for (const segment of ['all', 'mine']) await resourceStore.mutate<LibraryPage>(key(segment),
    () => ({ foods: [], cursor: 'next-page', counts: { all: 60, mine: 5, global: 55 } }), async () => {});
  await saveFoodWithCache(version, Promise.resolve({ ok: true, data: version }));
  for (const segment of ['all', 'mine']) expect(resourceStore.read<LibraryPage>(key(segment)).data?.counts)
    .toEqual({ all: 60, mine: 6, global: 54 });
});
it('does not increment totals for an existing version outside the cached page', async () => {
  await resourceStore.mutate<LibraryPage>(key('all'),
    () => ({ foods: [], cursor: 'next-page', counts: { all: 60, mine: 5, global: 55 } }), async () => {});
  await saveFoodWithCache(version, Promise.resolve({ ok: true, data: version }), version.id);
  expect(resourceStore.read<LibraryPage>(key('all')).data?.counts).toEqual({ all: 60, mine: 5, global: 55 });
});
it('restores the original alongside the copy after a successful pre-migration save', async () => {
  const original = { ...version, id: 'catalog', custom: false, replacesId: undefined, uses: 2 };
  await resourceStore.mutate<LibraryPage>(key('all'),
    () => ({ foods: [original], cursor: null, counts: { all: 1, mine: 0, global: 1 } }), async () => {});
  const legacy = { ...version, replacesId: undefined };
  await saveFoodWithCache(version, Promise.resolve({ ok: true, data: legacy }));
  expect(resourceStore.read<LibraryPage>(key('all')).data).toMatchObject({
    foods: [{ id: 'version' }, { id: 'catalog' }], counts: { all: 2, mine: 1, global: 1 },
  });
});
it('invalidates previously visited searches, pages and pickers after saves and restores', async () => {
  const resources = ['foods-library:["Rice","all","page-2"]', 'foods-library:["","mine",null]',
    'meal-editor:foods:Rice', 'v11-picker:["Rice","all"]'];
  const beforeSave = resources.map(foodResourceKey);
  await saveFoodWithCache(version, Promise.resolve({ ok: true, data: version }));
  const afterSave = resources.map(foodResourceKey);
  expect(afterSave.every((key, index) => key !== beforeSave[index])).toBe(true);
  invalidateFoodResources();
  expect(resources.map(foodResourceKey).every((key, index) => key !== afterSave[index])).toBe(true);
});
