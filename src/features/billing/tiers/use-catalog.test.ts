import { beforeEach, expect, it, vi } from 'vitest';
import { createResourceStore } from '@/core/resource/store';
import { catalogFixture } from './catalog-fixture';
import type { Catalog } from './types';
import { useCatalog } from './use-catalog';

const state = vi.hoisted(() => ({ store: undefined as ReturnType<typeof createResourceStore> | undefined }));
vi.mock('react', () => ({ useCallback: (callback: unknown) => callback, useRef: () => ({ current: false }), useState: (initial: unknown) => [initial, () => {}] }));
vi.mock('@/core/i18n/client', () => ({ useT: () => (key: string) => key }));
vi.mock('../data/tiers-workspace', () => ({ loadTiersWorkspace: async () => ({ data: catalogFixture }) }));
vi.mock('@/core/resource', () => ({ useResource: (key: string, load: () => Promise<Catalog>) => {
  const store = state.store;
  if (!store) throw new Error('Missing store');
  return { ...store.read<Catalog>(key), retry: () => store.retry(key, load),
    mutate: (next: (current: Catalog | undefined) => Catalog, commit: () => Promise<unknown>) => store.mutate(key, next, commit) };
} }));
beforeEach(async () => {
  state.store = createResourceStore({ now: () => 1 });
  await state.store.retry('billing:tiers-workspace', async () => catalogFixture);
});
it.each(['returned', 'thrown'])('rolls back failed %s writes and blocks duplicate submission', async mode => {
  let resolve: () => void = () => {};
  const pending = new Promise<void>(done => { resolve = done; });
  const hook = useCatalog();
  const commit = vi.fn(async () => {
    await pending;
    if (mode === 'thrown') throw new Error('offline');
    return { error: 'denied' };
  });
  const change = hook.change(current => ({ ...current, offers: [] }), commit);
  expect(state.store?.read<Catalog>('billing:tiers-workspace').data?.offers).toEqual([]);
  expect(await hook.change(current => current, commit)).toBe(false);
  expect(commit).toHaveBeenCalledTimes(1);
  resolve();
  expect(await change).toBe(false);
  expect(state.store?.read<Catalog>('billing:tiers-workspace').data?.offers[0]?.name).toBe('بلاك فرايداي');
});
