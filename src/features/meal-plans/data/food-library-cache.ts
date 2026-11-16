import { resourceStore } from '@/core/resource/store';
import type { ActionResult } from '@/lib/action-result';
import type { Food } from '../types';
import type { FoodLibrarySnapshot, LibraryPage } from './library-types';
import { foodResourceKey, invalidateFoodResources } from './food-resource-version';

function withFood(page: LibraryPage, food: Food, oldId?: string): LibraryPage {
  const existing = page.foods.find(row => row.id === food.id);
  const next = { ...food, uses: existing?.uses ?? 0, alternativeUses: existing?.alternativeUses ?? 0 };
  const foods = page.foods.filter(row => row.id !== food.id && row.id !== food.replacesId && row.id !== oldId);
  const added = existing || oldId ? 0 : 1;
  return { ...page, foods: [next, ...foods].slice(0, 40), counts: {
    all: page.counts.all + (food.replacesId ? 0 : added),
    mine: page.counts.mine + added,
    global: Math.max(0, page.counts.global - (food.replacesId ? added : 0)),
  } };
}

export async function saveFoodWithCache(optimistic: Food, save: Promise<ActionResult<Food>>, editingId?: string) {
  const workspaceKey = 'foods-library-v2';
  const workspace = resourceStore.read<FoodLibrarySnapshot>(foodResourceKey(workspaceKey)).data;
  const updateWorkspace = (current: FoodLibrarySnapshot, food: Food) => ({ ...current, foods: [
    { ...food, uses: current.foods.find(row => row.id === editingId)?.uses ?? 0 },
    ...current.foods.filter(row => row.id !== editingId && row.id !== food.id && row.id !== food.replacesId),
  ] });
  const snapshots = ['all', 'mine'].map(segment => {
    const key = `foods-library:${JSON.stringify(['', segment, null])}`;
    return { key, previous: resourceStore.read<LibraryPage>(foodResourceKey(key)).data };
  });
  const mutations = snapshots.map(({ key }) => resourceStore.mutate<LibraryPage>(foodResourceKey(key),
    current => withFood(current ?? { foods: [], cursor: null, counts: { all: 0, mine: 0, global: 0 } }, optimistic, editingId),
    async () => { const result = await save; if (!result.ok) throw new Error(result.error); }));
  if (workspace) mutations.push(resourceStore.mutate<FoodLibrarySnapshot>(foodResourceKey(workspaceKey),
    () => updateWorkspace(workspace, optimistic),
    async () => { const result = await save; if (!result.ok) throw new Error(result.error); }));
  const result = await save;
  await Promise.all(mutations);
  if (result.ok) {
    invalidateFoodResources();
    if (workspace) await resourceStore.mutate<FoodLibrarySnapshot>(foodResourceKey(workspaceKey),
      () => updateWorkspace(workspace, result.data), async () => {});
    await Promise.all(snapshots.map(({ key, previous }) => resourceStore.mutate<LibraryPage>(foodResourceKey(key),
      () => withFood(previous ?? { foods: [], cursor: null, counts: { all: 0, mine: 0, global: 0 } }, result.data, editingId),
      async () => {})));
  }
  return result;
}
